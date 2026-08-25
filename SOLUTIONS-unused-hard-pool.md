# Unused Hard-Pool Candidates — Answer Key

**Not part of the live competition.** These 25 problems were tested and fixed but not selected for the final 10. Good bench strength for a future event. See problems/aug2026-hard-pool-unused.json for the problem data.

### [#96] Managers with at Least 5 Direct Reports

Write a query to find the names of managers who have at least 5 direct reports in the `employees` table. Use a self-join or a subquery.

```sql
SELECT e.name FROM employees e WHERE e.id IN (SELECT manager_id FROM employees WHERE manager_id IS NOT NULL GROUP BY manager_id HAVING COUNT(*) >= 5)
```

### [#98] High-Powered Marvel Teams

Write a query to find Marvel teams where the average power level of their heroes is strictly greater than 85, AND the team has at least 2 heroes. Return the team name.

```sql
SELECT team FROM marvel_characters GROUP BY team HAVING AVG(power_level) > 85 AND COUNT(*) >= 2
```

### [#99] Above Average Game Scores

Write a query to find the `player_name` of all players who scored strictly higher than the overall average score of all players. Order the results alphabetically.

```sql
SELECT player_name FROM game_scores WHERE score > (SELECT AVG(score) FROM game_scores) ORDER BY player_name
```

### [#100] Outperforming Gryffindor

Write a query to find the names of Hogwarts houses that have a strictly greater sum of `house_points` than the total house points of 'Gryffindor'.

```sql
SELECT house FROM hogwarts_students WHERE house != 'Gryffindor' GROUP BY house HAVING SUM(house_points) > (SELECT SUM(house_points) FROM hogwarts_students WHERE house='Gryffindor')
```

### [#102] Tree Node Types

Write a query to report the type of each node in the tree. Output 'Root' if it has no parent, 'Inner' if it is a parent of at least one node, and 'Leaf' otherwise. Order by id.

```sql
SELECT t.id, CASE WHEN t.p_id IS NULL THEN 'Root' WHEN t.id IN (SELECT DISTINCT p_id FROM tree WHERE p_id IS NOT NULL) THEN 'Inner' ELSE 'Leaf' END AS type FROM tree t ORDER BY t.id
```

### [#103] Subscription Pricing Tiers

Categorize subscriptions: 'Premium' if fee > 50, 'Standard' if fee BETWEEN 20 AND 50, and 'Basic' if fee < 20. Count the number of users in each tier and order by the tier name alphabetically.

```sql
SELECT CASE WHEN fee > 50 THEN 'Premium' WHEN fee BETWEEN 20 AND 50 THEN 'Standard' ELSE 'Basic' END AS tier, COUNT(*) AS user_count FROM subscriptions GROUP BY tier ORDER BY tier
```

### [#104] Specific Genre Triplets

Write a query to find `genre`s from the `songs` table that have exactly 3 songs listed in the database.

```sql
SELECT genre FROM songs GROUP BY genre HAVING COUNT(*) = 3
```

### [#105] Slow Factions in Star Wars

Using a NOT IN subquery, find all distinct `faction`s that have NEVER deployed a starship with a `max_speed` greater than 1000.

```sql
SELECT DISTINCT faction FROM starships WHERE faction NOT IN (SELECT faction FROM starships WHERE max_speed > 1000)
```

### [#106] Most Prolific Publishing Decade

Write a query to find the decade (e.g., 1990, 2000) with the highest number of published books. Return the `decade` and `book_count`. Note: Calculate decade as (publication_year / 10) * 10.

```sql
SELECT (publication_year DIV 10)*10 AS decade, COUNT(*) AS book_count FROM books GROUP BY decade ORDER BY book_count DESC LIMIT 1
```

### [#107] Top Earners

Calculate total earnings (salary * months) for each employee. Find the maximum total earnings and the number of employees who have this maximum. Return `max_earnings` and `employee_count`.

```sql
SELECT MAX(earnings) AS max_earnings, SUM(CASE WHEN earnings = (SELECT MAX(salary*months) FROM employees) THEN 1 ELSE 0 END) AS employee_count FROM (SELECT salary*months AS earnings FROM employees) t
```

### [#109] Duplicate Emails

Write a query to report all the duplicate emails. Use GROUP BY and HAVING to find emails that appear more than once in the `person` table.

```sql
SELECT email FROM person GROUP BY email HAVING COUNT(*) > 1
```

### [#110] Revenue per Category

Write a query to calculate the total revenue per product category by joining the `products` and `orders` tables. Return `category` and `total_revenue`, ordered alphabetically by category.

```sql
SELECT p.category, SUM(o.amount) AS total_revenue FROM products p JOIN orders o ON p.product_id = o.product_id GROUP BY p.category ORDER BY p.category
```

### [#111] Top 2 Scorers Per Department

Write a query to find the top 2 highest-paid employees in each department from the `employees` table, ordered by department and salary descending. Use window functions.

```sql
SELECT name, department, salary FROM (SELECT name, department, salary, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn FROM employees) t WHERE rn <= 2 ORDER BY department, salary DESC
```

### [#114] Customer Purchase Trend Classification

Write a query to classify customers based on their purchase behaviour: 'Loyal' (3 or more orders AND total amount > 500), 'Occasional' (2 orders OR total between 200 and 500), 'One-Time' (exactly 1 order and total below 200) from the `orders` table.

```sql
SELECT customer_name, CASE WHEN COUNT(*) >= 3 AND SUM(amount) > 500 THEN 'Loyal' WHEN COUNT(*) = 2 OR (SUM(amount) BETWEEN 200 AND 500) THEN 'Occasional' WHEN COUNT(*) = 1 AND SUM(amount) < 200 THEN 'One-Time' END AS customer_type FROM orders GROUP BY customer_name ORDER BY MIN(id)
```

### [#115] Score Distribution Across Grade Buckets

Write a query to show the number of students in each score band: 'Distinction' (>=85), 'Merit' (70–84), 'Pass' (50–69), 'Fail' (<50) from the `students` table. Only include bands that have at least one student, ordered by band.

```sql
SELECT CASE WHEN score >= 85 THEN 'Distinction' WHEN score >= 70 THEN 'Merit' WHEN score >= 50 THEN 'Pass' ELSE 'Fail' END AS band, COUNT(*) AS student_count FROM students GROUP BY band ORDER BY band
```

### [#116] Rank Products by Revenue Within Category

Write a query to rank products by their total sales amount within each category from the `sales` table. Show category, product name, total sales, and rank. Only show products ranked 1st or 2nd in their category.

```sql
SELECT category, product_name, total_sales, rnk AS `rank` FROM (SELECT category, product_name, SUM(amount) AS total_sales, RANK() OVER (PARTITION BY category ORDER BY SUM(amount) DESC) AS rnk FROM sales GROUP BY category, product_name) t WHERE rnk <= 2 ORDER BY category, rnk
```

### [#119] Hogwarts House Cup Standings

Write a query to rank Hogwarts houses by their total house points from the `hogwarts_students` table. Display the rank, house name, total points, and how many points behind the 1st place house each house is.

```sql
SELECT RANK() OVER (ORDER BY total_points DESC) AS `rank`, house, total_points, MAX(total_points) OVER () - total_points AS points_behind FROM (SELECT house, SUM(house_points) AS total_points FROM hogwarts_students GROUP BY house) t ORDER BY total_points DESC
```

### [#120] Identify High-Churn Product Categories

Write a query to find product categories where more than 50% of the products have been returned (return_status = 'returned') from the `product_orders` table. Display the category, total products sold, total returned, and return percentage rounded to 2 decimal places.

```sql
SELECT category, COUNT(*) AS total_sold, SUM(return_status='returned') AS total_returned, ROUND(100.0 * SUM(return_status='returned') / COUNT(*), 2) AS return_percentage FROM product_orders GROUP BY category HAVING SUM(return_status='returned') / COUNT(*) > 0.5
```

### [#121] Department Top 3 Salaries

Write a query to find employees who earn one of the top 3 unique salaries in their department from the `employees` table. Display the department, employee name, and salary. Order by department and salary descending. (Inspired by LeetCode #185)

```sql
SELECT department, name, salary FROM (SELECT department, name, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk FROM employees) t WHERE rnk <= 3 ORDER BY department, salary DESC
```

### [#122] Trips Cancellation Rate

Write a query to find the cancellation rate of requests made by unbanned users between '2025-01-01' and '2025-01-03' from the `trips` table and `users` table. The cancellation rate is the number of cancelled trips divided by total trips, rounded to 2 decimal places. Display the day and cancellation rate. (Inspired by LeetCode #262)

```sql
SELECT request_date, ROUND(SUM(status != 'completed') / COUNT(*), 2) AS cancellation_rate FROM trips t JOIN users u ON t.client_id = u.user_id WHERE u.banned = 'No' AND request_date BETWEEN '2025-01-01' AND '2025-01-03' GROUP BY request_date
```

### [#123] Stadium High Traffic

Write a query to find all rows from the `stadium` table where 3 or more consecutive records all have a visitor count >= 100. Display id, visit_date, and visitor_count for qualifying rows ordered by visit_date. (Inspired by LeetCode #601)

```sql
WITH filtered AS (SELECT id, visit_date, visitor_count, id - ROW_NUMBER() OVER (ORDER BY id) AS grp FROM stadium WHERE visitor_count >= 100) SELECT id, visit_date, visitor_count FROM filtered WHERE grp IN (SELECT grp FROM filtered GROUP BY grp HAVING COUNT(*) >= 3) ORDER BY visit_date
```

### [#126] Interview Aggregate Stats

Write a query to report the total number of contest submissions, total accepted submissions, and total views for each interviewer from the `contests`, `challenges`, and `view_stats` tables. Only include interviewers with at least one submission. Order by total_submissions descending, then interviewer_id ascending. (Inspired by HackerRank Interviews)

```sql
SELECT c.interviewer_id, SUM(v.total_submissions) AS total_submissions, SUM(v.total_accepted) AS total_accepted, SUM(v.total_views) AS total_views FROM contests c JOIN challenges ch ON ch.contest_id = c.contest_id JOIN view_stats v ON v.challenge_id = ch.challenge_id GROUP BY c.interviewer_id HAVING SUM(v.total_submissions) > 0 ORDER BY total_submissions DESC, c.interviewer_id ASC
```

### [#127] 15 Days of Learning SQL

Write a query to find, for each day from the first to the last submission date, the number of distinct hackers who made at least one submission each day up to and including that day, and the hacker_id and name of the hacker with the most submissions on that day (lowest hacker_id if tied). Use the `submissions` and `hackers` tables. Order by submission_date. (Inspired by HackerRank 15 Days of Learning SQL)

```sql
WITH day_seq AS (
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
ORDER BY uc.submission_date
```

### [#128] SQL Project Planning

Write a query to find all projects from the `projects` table where each project is a set of consecutive dates with no gaps. A new project starts whenever there is a gap of more than 1 day. Display project_start and project_end dates, ordered by project duration ascending, then project_start ascending. (Inspired by HackerRank SQL Project Planning)

```sql
WITH flagged AS (SELECT task_date, CASE WHEN LAG(task_date) OVER (ORDER BY task_date) IS NULL OR DATEDIFF(task_date, LAG(task_date) OVER (ORDER BY task_date)) > 1 THEN 1 ELSE 0 END AS is_new FROM projects), grouped AS (SELECT task_date, SUM(is_new) OVER (ORDER BY task_date) AS grp FROM flagged) SELECT MIN(task_date) AS project_start, MAX(task_date) AS project_end FROM grouped GROUP BY grp ORDER BY DATEDIFF(MAX(task_date), MIN(task_date)) ASC, project_start ASC
```

### [#129] Friend Requests Acceptance Rate

Write a query to calculate the overall acceptance rate of friend requests rounded to 2 decimal places from the `friend_requests` and `request_accepted` tables. The rate is total accepted pairs divided by total requests sent. Treat each unique (sender, receiver) pair as one request and one acceptance. (Inspired by LeetCode #597)

```sql
SELECT ROUND((SELECT COUNT(DISTINCT requester_id, accepter_id) FROM request_accepted) / (SELECT COUNT(DISTINCT sender_id, receiver_id) FROM friend_requests), 2) AS acceptance_rate
```

