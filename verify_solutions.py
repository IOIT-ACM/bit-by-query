import json
import sqlite3
import math

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def is_close(a, b):
    try:
        f_a = float(a)
        f_b = float(b)
        return math.isclose(f_a, f_b, rel_tol=1e-5)
    except (ValueError, TypeError):
        return str(a) == str(b)

def compare_rows(actual, expected):
    if len(actual) != len(expected):
        return False
    
    # Sort both lists to ensure order doesn't affect comparison (unless order matters?)
    # Usually in SQL problems without ORDER BY, order doesn't matter.
    # But some questions specify ORDER BY.
    # The expected output usually implies order if it's a list.
    # However, strict comparison usually simpler. 
    # Let's try direct comparison first, if fails, try sorted?
    # Actually, many problems have ORDER BY in solution. `jan2026.json` test cases expected output is a list.
    
    # We will iterate and check match.
    for i in range(len(actual)):
        row_a = actual[i]
        row_e = expected[i]
        
        # Check keys
        if set(row_a.keys()) != set(row_e.keys()):
            return False
            
        for k in row_a.keys():
            val_a = row_a[k]
            val_e = row_e.get(k)
            if not is_close(val_a, val_e):
                return False
    return True

def run_verification():
    print("Loading data...")
    with open('problems/jan2026.json', 'r') as f:
        problem_data = json.load(f)
    
    with open('problems/solutions.json', 'r') as f:
        solutions = json.load(f)
        
    print("Data loaded.")
    
    passing = 0
    failing = 0
    errors = 0
    
    # Validate Q19-100
    target_ids = range(19, 101) 
    
    if isinstance(problem_data, list):
        questions = problem_data
    else:
        questions = problem_data.get('questions', [])
    
    for q in questions:
        q_id = q['id']
        if q_id not in target_ids:
            continue
            
        sol_sql = solutions.get(str(q_id))
        if not sol_sql:
            print(f"Skipping Q{q_id}: No solution found.")
            continue
            
        # print(f"Verifying Q{q_id}: {q['title']}")
        
        for tc in q['testCases']:
            conn = sqlite3.connect(':memory:')
            conn.row_factory = dict_factory
            cur = conn.cursor()
            
            try:
                # 1. Create Schema
                # Schema might contain multiple statements
                schema_stmts = q['schema'].split(';')
                for stmt in schema_stmts:
                    if stmt.strip():
                        cur.execute(stmt)
                        
                # 2. Insert Sample Data
                sample_stmts = tc['sampleData'].split(';')
                for stmt in sample_stmts:
                    if stmt.strip():
                        cur.execute(stmt)
                        
                # 3. Run Solution Query
                cur.execute(sol_sql)
                actual = cur.fetchall()
                
                # 4. Compare
                expected = tc['expectedOutput']
                
                if compare_rows(actual, expected):
                    passing += 1
                else:
                    failing += 1
                    print(f"FAIL: Q{q_id} TC{tc['id']}")
                    print(f"  Expected: {expected}")
                    print(f"  Actual:   {actual}")
                    
            except Exception as e:
                errors += 1
                print(f"ERROR: Q{q_id} TC{tc['id']}: {e}")
            finally:
                conn.close()

    print("-" * 30)
    print(f"Verification Results for Q19-100:")
    print(f"Passing: {passing}")
    print(f"Failing: {failing}")
    print(f"Errors:  {errors}")

if __name__ == "__main__":
    run_verification()
