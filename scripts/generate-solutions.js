const fs = require("fs");
const { execSync } = require("child_process");

const problems = JSON.parse(fs.readFileSync("problems/aug2026.json", "utf-8"));
const byId = Object.fromEntries(problems.map((p) => [p.id, p]));

// First 50 (locked-in easy/medium tier), verified correct earlier this session.
const easyMedium = {
  2: "SELECT product_name, price FROM products ORDER BY price ASC LIMIT 1",
  5: "SELECT product_name, price FROM products ORDER BY price DESC LIMIT 5",
  10: "SELECT product_name FROM products WHERE description IS NULL",
  18: "SELECT course_name FROM courses WHERE prerequisite IS NULL",
  19: "SELECT name FROM employees WHERE YEAR(hire_date) = 2023",
  22: "SELECT title, publication_year FROM books ORDER BY publication_year ASC LIMIT 1",
  25: "SELECT name, affiliation FROM star_wars_characters WHERE affiliation IN ('Jedi', 'Sith')",
  28: "SELECT DISTINCT department FROM employees",
  29: "SELECT name, house_points FROM hogwarts_students WHERE house = 'Slytherin' ORDER BY house_points DESC",
  32: "SELECT name FROM customers WHERE referee_id IS NULL OR referee_id != 2",
  33: "SELECT name, population, area FROM world WHERE area >= 3000000 OR population >= 25000000",
  34: "SELECT DISTINCT author_id FROM views WHERE author_id = viewer_id ORDER BY author_id ASC",
  37: "SELECT name FROM students WHERE marks > 75 ORDER BY name ASC",
  40: "SELECT tweet_id FROM tweets WHERE CHAR_LENGTH(content) > 15",
  43: "SELECT name FROM wizards WHERE house NOT IN ('Gryffindor')",
  44: "SELECT player_name, score FROM match_scores ORDER BY score DESC LIMIT 1",
  45: "SELECT patient_name FROM patients WHERE medicine IN ('Amoxicillin', 'Ibuprofen')",
  46: "SELECT COUNT(*) AS inactive_count FROM subscriptions WHERE is_active = 0",
  48: "SELECT SUM(stock_quantity) AS total_stock FROM inventory",
  50: "SELECT title FROM songs ORDER BY duration_seconds ASC LIMIT 1",
  51: "SELECT customer_name, COUNT(*) AS order_count FROM orders GROUP BY customer_name HAVING COUNT(*) > 1 ORDER BY customer_name",
  52: "SELECT name, CASE WHEN salary < 50000 THEN 'Low' WHEN salary <= 80000 THEN 'Medium' ELSE 'High' END AS salary_band FROM employees ORDER BY id",
  53: "SELECT student_name, course_name FROM enrollments GROUP BY student_name, course_name HAVING COUNT(*) > 1 ORDER BY student_name",
  54: "SELECT category, SUM(amount) AS total_sales FROM sales GROUP BY category ORDER BY total_sales DESC, category DESC",
  55: "SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees) ORDER BY salary DESC",
  56: "UPDATE products SET price = price * 1.10 WHERE category = 'Electronics'; SELECT * FROM products WHERE category = 'Electronics'",
  57: "DELETE FROM users WHERE status = 'inactive'; SELECT * FROM users ORDER BY id",
  58: "SELECT department, COUNT(*) AS employee_count FROM employees GROUP BY department HAVING COUNT(*) > 3",
  59: "SELECT DISTINCT student_name FROM enrollments WHERE student_name NOT IN (SELECT student_name FROM enrollments WHERE course_name = 'Mathematics') ORDER BY student_name",
  60: "SELECT title, rating FROM movies WHERE rating > (SELECT AVG(rating) FROM movies) ORDER BY rating DESC",
  61: "SELECT name, CASE WHEN grade >= 50 THEN 'Pass' ELSE 'Fail' END AS result FROM students ORDER BY id",
  62: "SELECT name, job_title FROM employees WHERE job_title IN (SELECT job_title FROM employees GROUP BY job_title HAVING COUNT(*) > 1) ORDER BY id",
  63: "SELECT order_date, COUNT(*) AS total_orders FROM orders GROUP BY order_date ORDER BY order_date",
  65: "SELECT player_name, COUNT(*) AS game_count FROM game_participants GROUP BY player_name HAVING COUNT(*) > 1 ORDER BY player_name",
  66: "UPDATE employees SET salary = salary + 5000 WHERE salary < 50000; SELECT name, salary FROM employees WHERE salary < 55000 ORDER BY id",
  67: "DELETE FROM coupons WHERE expiry_date < '2025-01-01'; SELECT code, expiry_date FROM coupons ORDER BY id",
  68: "SELECT author, COUNT(*) AS book_count FROM books GROUP BY author HAVING COUNT(*) > 1 ORDER BY MIN(id)",
  69: "SELECT customer_name, CASE WHEN amount < 100 THEN 'Small' WHEN amount <= 500 THEN 'Medium' ELSE 'Large' END AS order_size FROM orders ORDER BY id",
  70: "SELECT customer_name, amount, transaction_date FROM transactions GROUP BY customer_name, amount, transaction_date HAVING COUNT(*) > 1 ORDER BY MIN(id)",
  71: "SELECT genre, AVG(rating) AS avg_rating FROM movies GROUP BY genre HAVING AVG(rating) > 7.0 ORDER BY MIN(id)",
  73: "SELECT house, AVG(house_points) AS avg_points FROM hogwarts_students GROUP BY house HAVING AVG(house_points) > 150",
  76: "DELETE FROM inventory WHERE quantity = 0; SELECT item_name, quantity FROM inventory",
  77: "SELECT student_name, COUNT(DISTINCT subject) AS subject_count FROM scores GROUP BY student_name HAVING COUNT(DISTINCT subject) > 1",
  78: "SELECT planet_name, CASE WHEN diameter_km < 10000 THEN 'Small' WHEN diameter_km <= 50000 THEN 'Medium' ELSE 'Large' END AS size_category FROM planets",
  79: "SELECT course_name, COUNT(*) AS enrollment_count FROM enrollments GROUP BY course_name HAVING COUNT(*) = (SELECT MAX(cnt) FROM (SELECT COUNT(*) AS cnt FROM enrollments GROUP BY course_name) t) ORDER BY course_name",
  80: "SELECT name, CASE WHEN power_level > 95 THEN 'God-Tier' WHEN power_level >= 80 THEN 'Elite' ELSE 'Street-Level' END AS tier FROM marvel_characters",
  81: "SELECT professor_name, COUNT(DISTINCT subject) AS subject_count FROM teaching_assignments GROUP BY professor_name HAVING COUNT(DISTINCT subject) > 1",
  87: "SELECT incident_type, COUNT(*) AS incident_count FROM security_incidents GROUP BY incident_type ORDER BY incident_count DESC",
  89: "SELECT ip_address, attempt_date, COUNT(*) AS failed_count FROM login_attempts WHERE status='failed' GROUP BY ip_address, attempt_date HAVING COUNT(*) > 2",
  95: "SELECT director_name, COUNT(DISTINCT genre) AS genre_count FROM director_movies GROUP BY director_name HAVING COUNT(DISTINCT genre) > 1",
};

// Hard-pool candidates (35), verified correct earlier this session.
const hardPool = {
  96: "SELECT e.name FROM employees e WHERE e.id IN (SELECT manager_id FROM employees WHERE manager_id IS NOT NULL GROUP BY manager_id HAVING COUNT(*) >= 5)",
  97: "SELECT (SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1) AS SecondHighestSalary",
  98: "SELECT team FROM marvel_characters GROUP BY team HAVING AVG(power_level) > 85 AND COUNT(*) >= 2",
  99: "SELECT player_name FROM game_scores WHERE score > (SELECT AVG(score) FROM game_scores) ORDER BY player_name",
  100: "SELECT house FROM hogwarts_students WHERE house != 'Gryffindor' GROUP BY house HAVING SUM(house_points) > (SELECT SUM(house_points) FROM hogwarts_students WHERE house='Gryffindor')",
  101: "SELECT customer_id FROM customer GROUP BY customer_id HAVING COUNT(DISTINCT product_key) = (SELECT COUNT(*) FROM product)",
  102: "SELECT t.id, CASE WHEN t.p_id IS NULL THEN 'Root' WHEN t.id IN (SELECT DISTINCT p_id FROM tree WHERE p_id IS NOT NULL) THEN 'Inner' ELSE 'Leaf' END AS type FROM tree t ORDER BY t.id",
  103: "SELECT CASE WHEN fee > 50 THEN 'Premium' WHEN fee BETWEEN 20 AND 50 THEN 'Standard' ELSE 'Basic' END AS tier, COUNT(*) AS user_count FROM subscriptions GROUP BY tier ORDER BY tier",
  104: "SELECT genre FROM songs GROUP BY genre HAVING COUNT(*) = 3",
  105: "SELECT DISTINCT faction FROM starships WHERE faction NOT IN (SELECT faction FROM starships WHERE max_speed > 1000)",
  106: "SELECT (publication_year DIV 10)*10 AS decade, COUNT(*) AS book_count FROM books GROUP BY decade ORDER BY book_count DESC LIMIT 1",
  107: "SELECT MAX(earnings) AS max_earnings, SUM(CASE WHEN earnings = (SELECT MAX(salary*months) FROM employees) THEN 1 ELSE 0 END) AS employee_count FROM (SELECT salary*months AS earnings FROM employees) t",
  108: "SELECT s1.id, COALESCE((CASE WHEN s1.id % 2 = 1 THEN (SELECT student FROM seat WHERE id = s1.id+1) ELSE (SELECT student FROM seat WHERE id = s1.id-1) END), s1.student) AS student FROM seat s1 ORDER BY s1.id",
  109: "SELECT email FROM person GROUP BY email HAVING COUNT(*) > 1",
  110: "SELECT p.category, SUM(o.amount) AS total_revenue FROM products p JOIN orders o ON p.product_id = o.product_id GROUP BY p.category ORDER BY p.category",
  111: "SELECT name, department, salary FROM (SELECT name, department, salary, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn FROM employees) t WHERE rn <= 2 ORDER BY department, salary DESC",
  112: "SELECT sale_date, amount, SUM(amount) OVER (ORDER BY sale_date, id) AS running_total FROM sales ORDER BY sale_date, id",
  113: "SELECT department, COUNT(*) AS employee_count FROM employees GROUP BY department HAVING MIN(salary) > 60000 ORDER BY MIN(id)",
  114: "SELECT customer_name, CASE WHEN COUNT(*) >= 3 AND SUM(amount) > 500 THEN 'Loyal' WHEN COUNT(*) = 2 OR (SUM(amount) BETWEEN 200 AND 500) THEN 'Occasional' WHEN COUNT(*) = 1 AND SUM(amount) < 200 THEN 'One-Time' END AS customer_type FROM orders GROUP BY customer_name ORDER BY MIN(id)",
  115: "SELECT CASE WHEN score >= 85 THEN 'Distinction' WHEN score >= 70 THEN 'Merit' WHEN score >= 50 THEN 'Pass' ELSE 'Fail' END AS band, COUNT(*) AS student_count FROM students GROUP BY band ORDER BY band",
  116: "SELECT category, product_name, total_sales, rnk AS `rank` FROM (SELECT category, product_name, SUM(amount) AS total_sales, RANK() OVER (PARTITION BY category ORDER BY SUM(amount) DESC) AS rnk FROM sales GROUP BY category, product_name) t WHERE rnk <= 2 ORDER BY category, rnk",
  117: "SELECT name, department, salary, ROUND(dept_avg_all, 2) AS dept_avg_salary FROM (SELECT name, department, salary, AVG(salary) OVER (PARTITION BY department) AS dept_avg_all, (SUM(salary) OVER (PARTITION BY department) - salary) / (COUNT(*) OVER (PARTITION BY department) - 1) AS avg_excl_self FROM employees) t WHERE salary > 1.5 * avg_excl_self",
  118: "SELECT username, MIN(login_date) AS streak_start FROM (SELECT username, login_date, DATE_SUB(login_date, INTERVAL ROW_NUMBER() OVER (PARTITION BY username ORDER BY login_date) DAY) AS grp FROM user_logins) t GROUP BY username, grp HAVING COUNT(*) >= 3",
  119: "SELECT RANK() OVER (ORDER BY total_points DESC) AS `rank`, house, total_points, MAX(total_points) OVER () - total_points AS points_behind FROM (SELECT house, SUM(house_points) AS total_points FROM hogwarts_students GROUP BY house) t ORDER BY total_points DESC",
  120: "SELECT category, COUNT(*) AS total_sold, SUM(return_status='returned') AS total_returned, ROUND(100.0 * SUM(return_status='returned') / COUNT(*), 2) AS return_percentage FROM product_orders GROUP BY category HAVING SUM(return_status='returned') / COUNT(*) > 0.5",
  121: "SELECT department, name, salary FROM (SELECT department, name, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk FROM employees) t WHERE rnk <= 3 ORDER BY department, salary DESC",
  122: "SELECT request_date, ROUND(SUM(status != 'completed') / COUNT(*), 2) AS cancellation_rate FROM trips t JOIN users u ON t.client_id = u.user_id WHERE u.banned = 'No' AND request_date BETWEEN '2025-01-01' AND '2025-01-03' GROUP BY request_date",
  123: "WITH filtered AS (SELECT id, visit_date, visitor_count, id - ROW_NUMBER() OVER (ORDER BY id) AS grp FROM stadium WHERE visitor_count >= 100) SELECT id, visit_date, visitor_count FROM filtered WHERE grp IN (SELECT grp FROM filtered GROUP BY grp HAVING COUNT(*) >= 3) ORDER BY visit_date",
  124: "WITH ranked AS (SELECT department, salary, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary ASC, id ASC) AS rn, COUNT(*) OVER (PARTITION BY department) AS cnt FROM employees) SELECT department, salary AS median_salary FROM ranked WHERE rn = CEIL(cnt/2) ORDER BY department",
  125: "WITH rolled AS (SELECT employee_id, month, SUM(salary) OVER (PARTITION BY employee_id ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rolling_3month_sum, MAX(month) OVER (PARTITION BY employee_id) AS max_month FROM salary_records) SELECT employee_id, month, rolling_3month_sum FROM rolled WHERE month <> max_month ORDER BY employee_id, month",
  126: "SELECT c.interviewer_id, SUM(v.total_submissions) AS total_submissions, SUM(v.total_accepted) AS total_accepted, SUM(v.total_views) AS total_views FROM contests c JOIN challenges ch ON ch.contest_id = c.contest_id JOIN view_stats v ON v.challenge_id = ch.challenge_id GROUP BY c.interviewer_id HAVING SUM(v.total_submissions) > 0 ORDER BY total_submissions DESC, c.interviewer_id ASC",
  127: `WITH day_seq AS (
  SELECT DISTINCT submission_date, DENSE_RANK() OVER (ORDER BY submission_date) AS day_number FROM submissions
),
hacker_streak AS (
  SELECT s.hacker_id, ds.submission_date, COUNT(DISTINCT s2.submission_date) AS distinct_days_so_far
  FROM day_seq ds
  JOIN submissions s ON s.submission_date = ds.submission_date
  JOIN submissions s2 ON s2.hacker_id = s.hacker_id AND s2.submission_date <= ds.submission_date
  GROUP BY s.hacker_id, ds.submission_date
),
unique_counts AS (
  SELECT ds.submission_date, ds.day_number, COUNT(DISTINCT hs.hacker_id) AS unique_hackers
  FROM day_seq ds
  JOIN hacker_streak hs ON hs.submission_date = ds.submission_date AND hs.distinct_days_so_far = ds.day_number
  GROUP BY ds.submission_date, ds.day_number
),
cumulative_subs AS (
  SELECT ds.submission_date, s.hacker_id, COUNT(*) AS total_subs
  FROM day_seq ds JOIN submissions s ON s.submission_date <= ds.submission_date
  GROUP BY ds.submission_date, s.hacker_id
),
ranked_top AS (
  SELECT submission_date, hacker_id, total_subs,
         ROW_NUMBER() OVER (PARTITION BY submission_date ORDER BY total_subs DESC, hacker_id ASC) AS rn
  FROM cumulative_subs
)
SELECT uc.submission_date, uc.unique_hackers, rt.hacker_id AS top_hacker_id, h.name AS top_hacker_name
FROM unique_counts uc
JOIN ranked_top rt ON rt.submission_date = uc.submission_date AND rt.rn = 1
JOIN hackers h ON h.hacker_id = rt.hacker_id
ORDER BY uc.submission_date`,
  128: "WITH flagged AS (SELECT task_date, CASE WHEN LAG(task_date) OVER (ORDER BY task_date) IS NULL OR DATEDIFF(task_date, LAG(task_date) OVER (ORDER BY task_date)) > 1 THEN 1 ELSE 0 END AS is_new FROM projects), grouped AS (SELECT task_date, SUM(is_new) OVER (ORDER BY task_date) AS grp FROM flagged) SELECT MIN(task_date) AS project_start, MAX(task_date) AS project_end FROM grouped GROUP BY grp ORDER BY DATEDIFF(MAX(task_date), MIN(task_date)) ASC, project_start ASC",
  129: "SELECT ROUND((SELECT COUNT(DISTINCT requester_id, accepter_id) FROM request_accepted) / (SELECT COUNT(DISTINCT sender_id, receiver_id) FROM friend_requests), 2) AS acceptance_rate",
  130: "SELECT s.name FROM students s JOIN friends f ON f.student_id = s.id JOIN packages p_self ON p_self.student_id = s.id JOIN packages p_friend ON p_friend.student_id = f.friend_id WHERE p_friend.salary > p_self.salary ORDER BY s.name",
};

const selectedHardIds = [97, 101, 108, 112, 113, 117, 118, 124, 125, 130];

function verify(id, query) {
  const escaped = query.replace(/'/g, "'\\''");
  try {
    const out = execSync(`node scripts/test-problem.js ${id} '${escaped}'`, { encoding: "utf-8" });
    return out.includes("ALL TEST CASES PASSED");
  } catch (e) {
    return false;
  }
}

function renderSet(md, title, ids, queryMap, numbered) {
  md += `## ${title}\n\n`;
  let n = 0;
  const failures = [];
  for (const id of ids) {
    n++;
    const p = byId[id];
    if (!p) {
      md += `### [#${id}] ⚠️ NOT FOUND in problems/aug2026.json (skipped)\n\n`;
      continue;
    }
    const ok = verify(id, queryMap[id]);
    if (!ok) failures.push(id);
    const label = numbered ? `${n}. ` : "";
    md += `### ${label}[#${id}] ${p.title}${ok ? "" : "  ⚠️ FAILED RE-VERIFICATION"}\n\n`;
    md += `${p.description}\n\n`;
    md += `\`\`\`sql\n${queryMap[id]}\n\`\`\`\n\n`;
  }
  return { md, failures };
}

const generatedOn = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // en-CA -> YYYY-MM-DD

let md = `# Bit By Query — August 2026 Solution Sheet\n\n`;
md += `**Confidential — organizer/proctor use only.** Final 60-question set. Every query below was verified against the live grading harness (\`scripts/test-problem.js\`) on ${generatedOn} (IST).\n\n`;
md += `Questions 1–20 are Easy, 21–50 are Medium, 51–60 are Hard.\n\n`;

let allFailures = [];
({ md, failures: allFailures[0] } = renderSet(md, "Easy & Medium (50)", Object.keys(easyMedium).map(Number), easyMedium, true));
({ md, failures: allFailures[1] } = renderSet(md, "Hard (10)", selectedHardIds, hardPool, false));

fs.writeFileSync("SOLUTIONS.md", md);
const failures = allFailures.flat();
console.log(`Wrote SOLUTIONS.md — ${Object.keys(easyMedium).length + selectedHardIds.length} problems.`);
console.log(failures.length ? `RE-VERIFICATION FAILURES: ${failures.join(", ")}` : "All queries re-verified PASS.");

// Also archive the answer key for the 25 unused hard-pool candidates,
// separately, in case they get reused for a future event.
const unusedHardIds = Object.keys(hardPool)
  .map(Number)
  .filter((id) => !selectedHardIds.includes(id));
const archivedProblems = JSON.parse(
  fs.readFileSync("problems/aug2026-hard-pool-unused.json", "utf-8"),
);
const archivedById = Object.fromEntries(archivedProblems.map((p) => [p.id, p]));

let archiveMd = `# Unused Hard-Pool Candidates — Answer Key\n\n`;
archiveMd += `**Not part of the live competition.** These 25 problems were tested and fixed but not selected for the final 10. Good bench strength for a future event. See problems/aug2026-hard-pool-unused.json for the problem data.\n\n`;
for (const id of unusedHardIds) {
  const p = archivedById[id];
  if (!p) continue;
  archiveMd += `### [#${id}] ${p.title}\n\n${p.description}\n\n\`\`\`sql\n${hardPool[id]}\n\`\`\`\n\n`;
}
fs.writeFileSync("SOLUTIONS-unused-hard-pool.md", archiveMd);
console.log(`Wrote SOLUTIONS-unused-hard-pool.md — ${unusedHardIds.length} archived problems (not re-verified, since they're no longer graded).`);
