#!/usr/bin/env python3
"""
Script to regenerate expected outputs for problems by running solutions.

This script:
1. Loads problems and solutions
2. Runs each solution against test cases using SQLite
3. Captures the actual output
4. Updates the expected output in the problems JSON

Usage:
    python regenerate_expected_outputs.py [--problems RANGE] [--dry-run]
"""

import argparse
import json
import os
import re
import sqlite3
import sys

PROBLEMS_FILE = os.path.join(os.path.dirname(__file__), "problems/jan2026.json")
SOLUTIONS_FILE = os.path.join(os.path.dirname(__file__), "problems/solutions.json")


def mysql_to_sqlite(sql):
    """Convert MySQL-style SQL to SQLite-compatible SQL."""
    if not sql or sql.strip() == '':
        return sql
    
    # Remove backticks
    sql = sql.replace('`', '')
    
    # Replace AUTO_INCREMENT with AUTOINCREMENT
    sql = re.sub(r'\bAUTO_INCREMENT\b', 'AUTOINCREMENT', sql, flags=re.IGNORECASE)
    
    # Remove ENGINE=... clauses
    sql = re.sub(r'\s*ENGINE\s*=\s*\w+', '', sql, flags=re.IGNORECASE)
    
    # Remove CHARSET=... clauses  
    sql = re.sub(r'\s*(DEFAULT\s+)?CHARSET\s*=\s*\w+', '', sql, flags=re.IGNORECASE)
    
    # Replace DATETIME with TEXT (SQLite doesn't have DATETIME)
    sql = re.sub(r'\bDATETIME\b', 'TEXT', sql, flags=re.IGNORECASE)
    
    # Replace DATE with TEXT
    sql = re.sub(r'\bDATE\b(?!\w)', 'TEXT', sql, flags=re.IGNORECASE)
    
    # Replace DECIMAL(...) with REAL
    sql = re.sub(r'\bDECIMAL\s*\([^)]+\)', 'REAL', sql, flags=re.IGNORECASE)
    
    # Replace VARCHAR(...) with TEXT
    sql = re.sub(r'\bVARCHAR\s*\([^)]+\)', 'TEXT', sql, flags=re.IGNORECASE)
    
    # Replace CHAR(...) with TEXT
    sql = re.sub(r'\bCHAR\s*\([^)]+\)', 'TEXT', sql, flags=re.IGNORECASE)
    
    # Replace INT types with INTEGER
    sql = re.sub(r'\bINT\b(?!\w)', 'INTEGER', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bBIGINT\b', 'INTEGER', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bSMALLINT\b', 'INTEGER', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bTINYINT\b', 'INTEGER', sql, flags=re.IGNORECASE)
    
    # Replace UNSIGNED with nothing
    sql = re.sub(r'\bUNSIGNED\b', '', sql, flags=re.IGNORECASE)
    
    # Replace UNIX_TIMESTAMP() with strftime('%s', 'now')
    sql = re.sub(r'\bUNIX_TIMESTAMP\s*\(\s*\)', "strftime('%s', 'now')", sql, flags=re.IGNORECASE)
    
    # Replace NOW() with datetime('now')
    sql = re.sub(r'\bNOW\s*\(\s*\)', "datetime('now')", sql, flags=re.IGNORECASE)
    
    return sql


def strip_sql_comments(sql):
    """Remove SQL comments."""
    # Remove multi-line comments
    result = re.sub(r'/\*[\s\S]*?\*/', '', sql)
    # Remove single-line comments --
    result = re.sub(r'--.*$', '', result, flags=re.MULTILINE)
    # Remove single-line comments #
    result = re.sub(r'#.*$', '', result, flags=re.MULTILINE)
    return result


def run_query(schema, sample_data, solution):
    """Run a solution query and return the result."""
    # Convert to SQLite
    schema_sql = mysql_to_sqlite(schema)
    data_sql = mysql_to_sqlite(sample_data)
    solution_sql = mysql_to_sqlite(strip_sql_comments(solution))
    
    # Create in-memory database
    conn = sqlite3.connect(':memory:')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Execute schema statements
        for stmt in schema_sql.split(';'):
            stmt = stmt.strip()
            if stmt:
                cursor.execute(stmt)
        
        # Execute sample data statements
        for stmt in data_sql.split(';'):
            stmt = stmt.strip()
            if stmt:
                cursor.execute(stmt)
        
        # Execute solution queries - get result from last query
        queries = [q.strip() for q in solution_sql.split(';') if q.strip()]
        result = []
        for query in queries:
            cursor.execute(query)
            rows = cursor.fetchall()
            # Convert to list of dicts
            if rows:
                columns = [description[0] for description in cursor.description]
                result = [dict(zip(columns, row)) for row in rows]
        
        return result, None
    
    except Exception as e:
        return None, str(e)
    
    finally:
        conn.close()


def format_output(result):
    """Format output to match JSON structure (convert types appropriately)."""
    if result is None:
        return None
    
    formatted = []
    for row in result:
        formatted_row = {}
        for key, value in row.items():
            # Convert to appropriate JSON types
            if value is None:
                formatted_row[key] = None
            elif isinstance(value, (int, float)):
                # Keep numbers as-is, but round floats to reasonable precision
                if isinstance(value, float):
                    # Round to reasonable precision to avoid floating point issues
                    formatted_row[key] = round(value, 10)
                else:
                    formatted_row[key] = value
            else:
                formatted_row[key] = str(value)
        formatted.append(formatted_row)
    return formatted


def regenerate_outputs(problem_range=None, dry_run=False, verbose=False):
    """Regenerate expected outputs for problems."""
    
    print("=" * 60)
    print("Regenerating Expected Outputs")
    print("=" * 60)
    
    # Load files
    with open(PROBLEMS_FILE, 'r') as f:
        problems = json.load(f)
    
    with open(SOLUTIONS_FILE, 'r') as f:
        solutions = json.load(f)
    
    print(f"Loaded {len(problems)} problems and {len(solutions)} solutions")
    
    # Filter by range
    if problem_range:
        start, end = problem_range
        problems_to_process = [p for p in problems if start <= p["id"] <= end]
        print(f"Processing problems {start}-{end} ({len(problems_to_process)} problems)")
    else:
        problems_to_process = problems
    
    updates_made = 0
    errors = []
    
    for problem in problems_to_process:
        problem_id = problem["id"]
        title = problem.get("title", "Unknown")[:40]
        
        solution_key = str(problem_id)
        if solution_key not in solutions:
            print(f"  Q{problem_id:3d}: ⚠️  No solution - {title}")
            continue
        
        solution = solutions[solution_key]
        schema = problem["schema"]
        
        problem_updated = False
        
        for tc_idx, test_case in enumerate(problem["testCases"]):
            result, error = run_query(schema, test_case["sampleData"], solution)
            
            if error:
                errors.append({
                    "problem_id": problem_id,
                    "test_case": tc_idx + 1,
                    "error": error
                })
                if verbose:
                    print(f"  Q{problem_id:3d} TC{tc_idx+1}: ❌ Error: {error}")
                continue
            
            formatted_result = format_output(result)
            current_expected = test_case["expectedOutput"]
            
            # Compare outputs
            if json.dumps(formatted_result, sort_keys=True) != json.dumps(current_expected, sort_keys=True):
                problem_updated = True
                if not dry_run:
                    test_case["expectedOutput"] = formatted_result
                
                if verbose:
                    print(f"  Q{problem_id:3d} TC{tc_idx+1}: 🔄 Updated")
                    if verbose > 1:
                        print(f"    Old: {current_expected}")
                        print(f"    New: {formatted_result}")
        
        if problem_updated:
            updates_made += 1
            print(f"  Q{problem_id:3d}: 🔄 Updated - {title}")
        else:
            print(f"  Q{problem_id:3d}: ✅ OK - {title}")
    
    # Save updated problems
    if not dry_run and updates_made > 0:
        with open(PROBLEMS_FILE, 'w') as f:
            json.dump(problems, f, indent=2)
        print(f"\n✅ Saved {updates_made} updated problems to {PROBLEMS_FILE}")
    elif dry_run:
        print(f"\n🔍 Dry run: Would update {updates_made} problems")
    else:
        print(f"\n✅ No updates needed")
    
    if errors:
        print(f"\n⚠️  {len(errors)} errors occurred:")
        for err in errors:
            print(f"  Q{err['problem_id']} TC{err['test_case']}: {err['error']}")
    
    return updates_made, errors


def main():
    parser = argparse.ArgumentParser(description="Regenerate expected outputs for SQL problems")
    parser.add_argument("--problems", help="Problem range (e.g., '75-100')")
    parser.add_argument("--dry-run", action="store_true", help="Don't actually update files")
    parser.add_argument("-v", "--verbose", action="count", default=0, help="Verbose output")
    
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
    
    updates, errors = regenerate_outputs(problem_range, args.dry_run, args.verbose)
    
    if errors:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
