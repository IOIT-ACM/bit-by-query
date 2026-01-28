import json
import sqlite3

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def run_q99():
    with open('problems/jan2026.json', 'r') as f:
        data = json.load(f)
    
    with open('problems/solutions.json', 'r') as f:
        solutions = json.load(f)
        
    q99 = next(q for q in data if q['id'] == 99)
    # Handle the fact that questions might be wrapped or just a list
    if not isinstance(q99, dict):
       # If data is list of qs
       q99 = next(q for q in data if q['id'] == 99)
       
    sol_sql = """
WITH RECURSIVE unique_pkgs AS (
  SELECT DISTINCT package_name, depends_on FROM packages
),
deps AS (
  SELECT package_name, 0 as depth
  FROM unique_pkgs
  WHERE depends_on IS NULL
  
  UNION ALL
  
  SELECT p.package_name, d.depth + 1
  FROM unique_pkgs p
  JOIN deps d ON p.depends_on = d.package_name
  WHERE d.depth < 100
),
max_depths AS (
  SELECT package_name, MAX(depth) as depth
  FROM deps
  GROUP BY package_name
),
counts AS (
  SELECT 
    (SELECT COUNT(*) FROM max_depths) as installed_cnt,
    (SELECT COUNT(DISTINCT package_name) FROM packages) as total_cnt
)
SELECT * FROM (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY depth, package_name) as installation_order,
      package_name,
      depth as dependency_depth
    FROM max_depths
    WHERE (SELECT installed_cnt FROM counts) = (SELECT total_cnt FROM counts)

    UNION ALL

    SELECT 1, 'CIRCULAR_DEPENDENCY_DETECTED', 0
    WHERE (SELECT installed_cnt FROM counts) < (SELECT total_cnt FROM counts)
) ORDER BY installation_order
"""
    
    print(f"Solution SQL: {sol_sql}")
    
    for tc in q99['testCases']:
        print(f"\n--- TC {tc['id']} ---")
        conn = sqlite3.connect(':memory:')
        conn.row_factory = dict_factory
        cur = conn.cursor()
        
        # Schema
        cur.execute(q99['schema'])
        
        # Data
        stmts = tc['sampleData'].split(';')
        
        # Inject duplicates for TC1 to reproduce user issue if data wasn't cleaned
        if tc['id'] == 1:
            stmts.append("INSERT INTO packages VALUES ('database', 'utils');")
            stmts.append("INSERT INTO packages VALUES ('database', 'utils');")
            
        for stmt in stmts:
            if stmt.strip():
                cur.execute(stmt)
        
        # Run
        try:
            cur.execute(sol_sql)
            actual = cur.fetchall()
            expected = tc['expectedOutput']
            
            print("Expected:")
            print(json.dumps(expected, indent=2))
            print("Actual:")
            print(json.dumps(actual, indent=2))
            
            # Simple compare
            if len(actual) != len(expected):
                print("MISMATCH: Length differs")
            else:
                match = True
                for i in range(len(actual)):
                    if actual[i] != expected[i]: # Strict dict comparison
                        match = False
                        break
                if match:
                    print("MATCH")
                else:
                    print("MISMATCH: Content differs")
        except Exception as e:
            print(f"ERROR: {e}")
        finally:
            conn.close()

    # Manual TC4: Circular Dependency
    print("\n--- TC 4 (Manual): Circular Dependency ---")
    conn = sqlite3.connect(':memory:')
    conn.row_factory = dict_factory
    cur = conn.cursor()
    cur.execute(q99['schema'])
    cur.execute("INSERT INTO packages VALUES ('A', 'B'), ('B', 'A');")
    try:
        cur.execute(sol_sql)
        actual = cur.fetchall()
        print("Actual:")
        print(json.dumps(actual, indent=2))
        if len(actual) == 1 and actual[0].get('package_name') == 'CIRCULAR_DEPENDENCY_DETECTED':
             print("MATCH (Circular handled)")
        elif len(actual) == 0:
             print("MISMATCH (Empty result for isolated cycle)")
        else:
             print("MISMATCH (Other result)")
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_q99()
