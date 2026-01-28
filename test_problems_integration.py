#!/usr/bin/env python3
"""
Integrated Test Suite for SQL Competition Problems

This script tests the entire flow:
1. Registers a new test user
2. Logs in to get a JWT token
3. Fetches all problems
4. Submits solutions for all problems (75-100 for this batch)
5. Validates that correct outputs are accepted
6. Reports any issues with problems or APIs

Usage:
    python test_problems_integration.py [--base-url URL] [--problems RANGE] [--verbose]
"""

import argparse
import json
import os
import random
import string
import sys
import time
import requests

# Configuration
DEFAULT_BASE_URL = "http://localhost:5000"
SOLUTIONS_FILE = os.path.join(os.path.dirname(__file__), "problems/solutions.json")


def generate_test_credentials():
    """Generate unique test user credentials."""
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return {
        "username": f"test_user_{suffix}",
        "password": f"TestPass123!_{suffix}",
        "name": f"Test User {suffix}"
    }


def load_solutions():
    """Load solutions from solutions.json."""
    with open(SOLUTIONS_FILE, 'r') as f:
        return json.load(f)


class APIClient:
    """API client for the SQL competition server."""
    
    def __init__(self, base_url):
        self.base_url = base_url.rstrip('/')
        self.token = None
        self.session = requests.Session()
    
    def _headers(self):
        """Get headers with auth token if available."""
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    
    def register(self, username, password, name):
        """Register a new user."""
        response = self.session.post(
            f"{self.base_url}/api/register",
            json={"username": username, "password": password, "name": name},
            headers=self._headers()
        )
        return response
    
    def login(self, username, password):
        """Login and store the token."""
        response = self.session.post(
            f"{self.base_url}/api/login",
            json={"username": username, "password": password},
            headers=self._headers()
        )
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token")
        return response
    
    def get_problems(self):
        """Fetch all problems."""
        response = self.session.get(
            f"{self.base_url}/api/problems",
            headers=self._headers()
        )
        return response
    
    def get_problem(self, problem_id):
        """Fetch a specific problem."""
        response = self.session.get(
            f"{self.base_url}/api/problems/{problem_id}",
            headers=self._headers()
        )
        return response
    
    def evaluate(self, problem_id, user_query):
        """Submit a solution for evaluation."""
        response = self.session.post(
            f"{self.base_url}/api/problems/{problem_id}/evaluate",
            json={"userQuery": user_query},
            headers=self._headers()
        )
        return response


class TestResult:
    """Container for test results."""
    
    def __init__(self):
        self.passed = []
        self.failed = []
        self.errors = []
    
    def add_pass(self, problem_id, details=None):
        self.passed.append({"problem_id": problem_id, "details": details})
    
    def add_fail(self, problem_id, reason, details=None):
        self.failed.append({"problem_id": problem_id, "reason": reason, "details": details})
    
    def add_error(self, problem_id, error, details=None):
        self.errors.append({"problem_id": problem_id, "error": str(error), "details": details})
    
    def summary(self):
        total = len(self.passed) + len(self.failed) + len(self.errors)
        return {
            "total": total,
            "passed": len(self.passed),
            "failed": len(self.failed),
            "errors": len(self.errors),
            "pass_rate": f"{len(self.passed)/total*100:.1f}%" if total > 0 else "N/A"
        }


def run_integration_tests(base_url, problem_range=None, verbose=False):
    """Run the full integration test suite."""
    
    print("=" * 60)
    print("SQL Competition - Integration Test Suite")
    print("=" * 60)
    print(f"Base URL: {base_url}")
    print(f"Problem Range: {problem_range or 'all'}")
    print()
    
    # Initialize
    client = APIClient(base_url)
    results = TestResult()
    
    # Load solutions
    print("[1/5] Loading solutions...")
    try:
        solutions = load_solutions()
        print(f"      Loaded {len(solutions)} solutions")
    except Exception as e:
        print(f"      ERROR: Failed to load solutions: {e}")
        return results
    
    # Register test user
    print("\n[2/5] Registering test user...")
    creds = generate_test_credentials()
    try:
        response = client.register(creds["username"], creds["password"], creds["name"])
        if response.status_code == 201:
            print(f"      Registered: {creds['username']}")
        elif response.status_code == 400 and "already taken" in response.text:
            print(f"      User already exists (OK)")
        else:
            print(f"      ERROR: Registration failed - {response.status_code}: {response.text}")
            return results
    except Exception as e:
        print(f"      ERROR: Registration request failed: {e}")
        return results
    
    # Login
    print("\n[3/5] Logging in...")
    try:
        response = client.login(creds["username"], creds["password"])
        if response.status_code == 200:
            print(f"      Login successful, token obtained")
        else:
            print(f"      ERROR: Login failed - {response.status_code}: {response.text}")
            return results
    except Exception as e:
        print(f"      ERROR: Login request failed: {e}")
        return results
    
    # Fetch problems
    print("\n[4/5] Fetching problems...")
    try:
        response = client.get_problems()
        if response.status_code == 200:
            problems = response.json()
            print(f"      Fetched {len(problems)} problems")
        else:
            print(f"      ERROR: Failed to fetch problems - {response.status_code}: {response.text}")
            return results
    except Exception as e:
        print(f"      ERROR: Problems request failed: {e}")
        return results
    
    # Filter problems by range if specified
    if problem_range:
        start, end = problem_range
        problems = [p for p in problems if start <= p["id"] <= end]
        print(f"      Filtered to {len(problems)} problems (IDs {start}-{end})")
    
    # Evaluate each problem
    print("\n[5/5] Evaluating solutions...")
    print("-" * 60)
    
    for problem in problems:
        problem_id = problem["id"]
        title = problem.get("title", "Unknown")
        
        # Get solution for this problem
        solution_key = str(problem_id)
        if solution_key not in solutions:
            results.add_error(problem_id, "No solution found in solutions.json")
            print(f"  Q{problem_id:3d}: ❌ No solution found")
            continue
        
        solution = solutions[solution_key]
        
        try:
            response = client.evaluate(problem_id, solution)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("correct"):
                    results.add_pass(problem_id, {
                        "duration": data.get("duration"),
                        "test_cases": len(data.get("testResults", []))
                    })
                    print(f"  Q{problem_id:3d}: ✅ PASSED ({data.get('duration', 'N/A')}) - {title[:40]}")
                else:
                    # Find which test cases failed
                    test_results = data.get("testResults", [])
                    failed_cases = [tr for tr in test_results if not tr.get("passed")]
                    
                    results.add_fail(problem_id, "Test cases failed", {
                        "failed_cases": failed_cases,
                        "duration": data.get("duration")
                    })
                    
                    print(f"  Q{problem_id:3d}: ❌ FAILED - {title[:40]}")
                    if verbose:
                        for fc in failed_cases:
                            tc_num = fc.get("testCaseNumber")
                            if "error" in fc:
                                print(f"           TC{tc_num}: {fc['error']}")
                            else:
                                print(f"           TC{tc_num}: Output mismatch")
                                if verbose > 1:
                                    print(f"             Expected: {fc.get('expectedOutput')}")
                                    print(f"             Got:      {fc.get('userOutput')}")
            
            elif response.status_code == 400 and "Duplicate submission" in response.text:
                # Problem already solved - this is OK
                results.add_pass(problem_id, {"note": "Already solved"})
                print(f"  Q{problem_id:3d}: ✅ Already solved - {title[:40]}")
            
            else:
                results.add_error(problem_id, f"API error: {response.status_code}", {
                    "response": response.text
                })
                print(f"  Q{problem_id:3d}: ❌ API Error ({response.status_code}) - {title[:40]}")
        
        except Exception as e:
            results.add_error(problem_id, str(e))
            print(f"  Q{problem_id:3d}: ❌ Exception: {e}")
        
        # Small delay to avoid overwhelming the server
        time.sleep(0.1)
    
    # Print summary
    print("-" * 60)
    summary = results.summary()
    print(f"\n{'=' * 60}")
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Total Problems:  {summary['total']}")
    print(f"Passed:          {summary['passed']} ✅")
    print(f"Failed:          {summary['failed']} ❌")
    print(f"Errors:          {summary['errors']} ⚠️")
    print(f"Pass Rate:       {summary['pass_rate']}")
    
    if results.failed:
        print(f"\n{'=' * 60}")
        print("FAILED PROBLEMS")
        print("=" * 60)
        for item in results.failed:
            print(f"  Q{item['problem_id']}: {item['reason']}")
    
    if results.errors:
        print(f"\n{'=' * 60}")
        print("ERRORS")
        print("=" * 60)
        for item in results.errors:
            print(f"  Q{item['problem_id']}: {item['error']}")
    
    return results


def main():
    parser = argparse.ArgumentParser(description="Integration test for SQL competition problems")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Base URL of the server")
    parser.add_argument("--problems", help="Problem range (e.g., '75-100')")
    parser.add_argument("-v", "--verbose", action="count", default=0, help="Verbose output (-v or -vv)")
    
    args = parser.parse_args()
    
    # Parse problem range
    problem_range = None
    if args.problems:
        try:
            parts = args.problems.split("-")
            if len(parts) == 2:
                problem_range = (int(parts[0]), int(parts[1]))
            else:
                problem_range = (int(parts[0]), int(parts[0]))
        except ValueError:
            print(f"Invalid problem range: {args.problems}")
            sys.exit(1)
    
    # Run tests
    results = run_integration_tests(args.base_url, problem_range, args.verbose)
    
    # Exit with appropriate code
    if results.failed or results.errors:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
