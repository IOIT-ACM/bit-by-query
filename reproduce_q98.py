import json
import sqlite3

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def run_q98():
    schema = "CREATE TABLE scores (player_id INT, score INT, achieved_at DATETIME);"
    # Valid Q98 data from TC1
    sample_data = "INSERT INTO scores VALUES (1, 100, '2026-01-01 10:00:00'), (2, 150, '2026-01-01 11:00:00'), (1, 80, '2026-01-01 12:00:00'), (3, 200, '2026-01-01 13:00:00'), (3, 200, '2026-01-01 13:00:00'), (3, 200, '2026-01-01 13:00:00'), (3, 200, '2026-01-01 13:00:00'), (3, 200, '2026-01-01 13:00:00');"
    
    sol_sql = """
    WITH cumulative AS (
      SELECT player_id, achieved_at, score, SUM(score) OVER (PARTITION BY player_id ORDER BY achieved_at) as total_score 
      FROM scores
    ),
    snapshot_ranks AS (
      SELECT 
        c.player_id, 
        c.achieved_at, 
        c.score,
        c.total_score,
        ROW_NUMBER() OVER(PARTITION BY c.player_id ORDER BY c.achieved_at) as rn,
        (
           SELECT COUNT(*) + 1 
           FROM (
              SELECT player_id, MAX(achieved_at) as last_event 
              FROM cumulative sub 
              WHERE sub.achieved_at <= c.achieved_at 
              GROUP BY player_id
           ) l 
           JOIN cumulative s ON l.player_id = s.player_id AND l.last_event = s.achieved_at 
           WHERE s.total_score > c.total_score
        ) as rank_after,
        (
           SELECT COUNT(*) + 1 
           FROM (
              SELECT player_id, MAX(achieved_at) as last_event 
              FROM cumulative sub 
              WHERE sub.achieved_at <= c.achieved_at 
              GROUP BY player_id
           ) l 
           JOIN cumulative s ON l.player_id = s.player_id AND l.last_event = s.achieved_at 
           WHERE s.player_id != c.player_id AND s.total_score > (c.total_score - c.score)
        ) as rank_before_raw
      FROM cumulative c
    )
    SELECT 
      player_id, 
      achieved_at, 
      score, 
      CASE WHEN rn = 1 THEN NULL ELSE rank_before_raw END as rank_before, 
      rank_after, 
      CASE WHEN rn = 1 THEN NULL ELSE rank_before_raw - rank_after END as rank_change 
    FROM snapshot_ranks 
    ORDER BY achieved_at, player_id
    """

    conn = sqlite3.connect(':memory:')
    conn.row_factory = dict_factory
    cur = conn.cursor()
    
    try:
        cur.execute(schema)
        stmts = sample_data.split(';')
        for stmt in stmts:
            if stmt.strip():
                cur.execute(stmt)
                
        print("Running query...")
        cur.execute(sol_sql)
        results = cur.fetchall()
        print("Results:")
        print(json.dumps(results, indent=2))
        
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_q98()
