import json
import sqlite3
import random
import datetime
import re

def get_schema_info(create_stmt):
    """
    Parses a CREATE TABLE statement to extract table name and column definitions.
    Returns: {table_name: test_table, columns: [{name: col1, type: INTEGER}, ...]}
    """
    match = re.search(r"CREATE TABLE\s+(\w+)\s*\((.*)\)", create_stmt, re.IGNORECASE | re.DOTALL)
    if not match:
        return None
    
    table_name = match.group(1)
    col_str = match.group(2)
    
    columns = []
    
    # Robust splitting by comma considering parentheses
    parts = []
    current_part = []
    paren_depth = 0
    
    for char in col_str:
        if char == '(':
            paren_depth += 1
            current_part.append(char)
        elif char == ')':
            paren_depth -= 1
            current_part.append(char)
        elif char == ',' and paren_depth == 0:
            parts.append("".join(current_part).strip())
            current_part = []
        else:
            current_part.append(char)
            
    if current_part:
        parts.append("".join(current_part).strip())
    
    for p in parts:
        if p.upper().startswith("PRIMARY KEY") or p.upper().startswith("FOREIGN KEY"):
            continue
        
        tokens = p.split()
        if not tokens: continue
        col_name = tokens[0]
        col_type = tokens[1].upper() if len(tokens) > 1 else "TEXT"
        col_name = col_name.strip('`"[]')
        columns.append({"name": col_name, "type": col_type})
        
    return {"table_name": table_name, "columns": columns}

def generate_smart_row(columns, id_pool):
    row_data = {}
    
    # Pre-generate dates to handle ranges
    date_cols = [c['name'] for c in columns if 'DATE' in c['type'] or 'TIME' in c['type']]
    
    # Heuristic for Start/End dates
    start_date_val = None
    if 'start_date' in date_cols and 'end_date' in date_cols:
        start_date = datetime.date(2026, 1, 1) + datetime.timedelta(days=random.randint(0, 150))
        end_date = start_date + datetime.timedelta(days=random.randint(1, 180))
        row_data['start_date'] = start_date.isoformat()
        row_data['end_date'] = end_date.isoformat()
    
    for col in columns:
        name = col['name']
        ctype = col['type']
        
        if name in row_data:
            continue
            
        # Foreign Key / Shared ID heuristic
        if 'ID' in name.upper() and id_pool and random.random() > 0.3:
             # Reuse ID from pool 70% of time
             val = random.choice(id_pool)
        elif 'ID' in name.upper():
             val = random.randint(1, 50) # Small range to encourage overlap even randomly
             if val not in id_pool:
                 id_pool.append(val)
        elif "INT" in ctype:
            val = random.randint(1, 100)
        elif "DECIMAL" in ctype or "FLOAT" in ctype or "REAL" in ctype:
            val = round(random.uniform(10.0, 1000.0), 2)
        elif "DATETIME" in ctype or "TIMESTAMP" in ctype:
             d = datetime.date(2026, 1, 1) + datetime.timedelta(days=random.randint(0, 364))
             t = f"{random.randint(0,23):02}:{random.randint(0,59):02}:{random.randint(0,59):02}"
             val = f"{d.isoformat()} {t}"
        elif "DATE" in ctype:
             d = datetime.date(2026, 1, 1) + datetime.timedelta(days=random.randint(0, 364))
             val = d.isoformat()
        else:
             choices = ["Apple", "Banana", "Cherry", "Dog", "Cat", "O", "X", "Y", "Z"]
             val = random.choice(choices)
             
        row_data[name] = val
        
    return row_data

def generate_insert_statement(table_info, row_count=5, id_pool=None):
    if id_pool is None: id_pool = []
    
    values_list = []
    for _ in range(row_count):
        row = generate_smart_row(table_info['columns'], id_pool)
        
        # Order by column definition
        vals = []
        for col in table_info['columns']:
            v = row[col['name']]
            if isinstance(v, str):
                vals.append(f"'{v}'")
            else:
                vals.append(str(v))
        values_list.append(f"({', '.join(vals)})")
    
    return f"INSERT INTO {table_info['table_name']} VALUES {', '.join(values_list)};"

def run_solution(schema_sql, data_sql, solution_sql):
    conn = sqlite3.connect(':memory:')
    conn.row_factory = lambda c, r: dict(zip([col[0] for col in c.description], r))
    cur = conn.cursor()
    try:
        for s in schema_sql.split(';'):
            if s.strip(): cur.execute(s)
        for s in data_sql.split(';'):
            if s.strip(): cur.execute(s)
        cur.execute(solution_sql)
        return cur.fetchall()
    except Exception as e:
        print(f"Error running solution: {e}")
        return None
    finally:
        conn.close()

def main():
    print("Loading data...")
    with open('problems/jan2026.json', 'r') as f:
        problem_data = json.load(f)
        
    with open('problems/solutions.json', 'r') as f:
        solutions = json.load(f)
        
    questions = problem_data if isinstance(problem_data, list) else problem_data.get('questions', [])
    target_ids = range(75, 101)
    modified = False
    
    for q in questions:
        if q['id'] not in target_ids: continue
        
        current_tcs = q.get('testCases', [])
        failures = 0
        
        while len(current_tcs) < 3 and failures < 5:
            print(f"Generating TC for Q{q['id']} (Current: {len(current_tcs)})")
            
            schema_sql = q['schema']
            create_stmts = [s.strip() for s in schema_sql.split(';') if "CREATE TABLE" in s.upper()]
            
            generated_data_parts = []
            id_pool = []
            
            success = True
            for stmt in create_stmts:
                info = get_schema_info(stmt)
                if not info:
                    success = False
                    break
                
                # Q93 needs more data to ensure overlaps
                num_rows = random.randint(8, 15)
                insert_sql = generate_insert_statement(info, num_rows, id_pool)
                generated_data_parts.append(insert_sql)
            
            if not success:
                failures += 1
                continue
                
            full_sample_data = " ".join(generated_data_parts)
            sol_sql = solutions.get(str(q['id']))
            if not sol_sql: break
            
            expected_output = run_solution(schema_sql, full_sample_data, sol_sql)
            
            if expected_output is None:
                print(f"  Failed execution for Q{q['id']}")
                failures += 1
                continue
                
            new_tc = {
                "id": len(current_tcs) + 1,
                "sampleData": full_sample_data,
                "expectedOutput": expected_output
            }
            current_tcs.append(new_tc)
            modified = True
            
        q['testCases'] = current_tcs

    if modified:
        print("Writing updated jan2026.json...")
        with open('problems/jan2026.json', 'w') as f:
            json.dump(problem_data, f, indent=2)
        print("Done.")
    else:
        print("No changes needed.")

if __name__ == "__main__":
    main()
