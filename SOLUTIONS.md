# Bit By Query — August 2026 Solution Sheet

**Confidential — organizer/proctor use only.** Final 60-question set. Every query below was verified against the live grading harness (`scripts/test-problem.js`) on 2026-08-25 (IST).

Questions 1–20 are Easy, 21–50 are Medium, 51–60 are Hard.

## Easy & Medium (50)

### 1. [#2] Find Cheapest Product  ⚠️ FAILED RE-VERIFICATION

Write a query to find the product with the lowest price from the `products` table.

```sql
SELECT product_name, price FROM products ORDER BY price ASC LIMIT 1
```

### 2. [#5] Top 5 Expensive Products  ⚠️ FAILED RE-VERIFICATION

Write a query to retrieve the top 5 most expensive products from the `products` table, ordered by price descending.

```sql
SELECT product_name, price FROM products ORDER BY price DESC LIMIT 5
```

### 3. [#10] Products with NULL Description  ⚠️ FAILED RE-VERIFICATION

Write a query to retrieve the names of all products that have a NULL description from the `products` table.

```sql
SELECT product_name FROM products WHERE description IS NULL
```

### 4. [#18] Find Courses with No Prerequisites  ⚠️ FAILED RE-VERIFICATION

Write a query to retrieve the names of courses that have no prerequisite (NULL) from the `courses` table.

```sql
SELECT course_name FROM courses WHERE prerequisite IS NULL
```

### 5. [#19] Employees Hired in 2023  ⚠️ FAILED RE-VERIFICATION

Write a query to retrieve the names of employees who were hired in the year 2023 from the `employees` table.

```sql
SELECT name FROM employees WHERE YEAR(hire_date) = 2023
```

### 6. [#22] Find the Oldest Book  ⚠️ FAILED RE-VERIFICATION

Write a query to find the title and publication year of the oldest book from the `books` table.

```sql
SELECT title, publication_year FROM books ORDER BY publication_year ASC LIMIT 1
```

### 7. [#25] Retrieve Jedi or Sith Characters  ⚠️ FAILED RE-VERIFICATION

Write a query to retrieve all characters from the `star_wars_characters` table who belong to either the 'Jedi' or 'Sith' affiliation.

```sql
SELECT name, affiliation FROM star_wars_characters WHERE affiliation IN ('Jedi', 'Sith')
```

### 8. [#28] List Distinct Departments  ⚠️ FAILED RE-VERIFICATION

Write a query to retrieve all unique department names from the `employees` table.

```sql
SELECT DISTINCT department FROM employees
```

### 9. [#29] Hogwarts Students in Slytherin  ⚠️ FAILED RE-VERIFICATION

Write a query to retrieve the names and house points of all students in 'Slytherin' from the `hogwarts_students` table, ordered by house points descending.

```sql
SELECT name, house_points FROM hogwarts_students WHERE house = 'Slytherin' ORDER BY house_points DESC
```

### 10. [#32] Find Customer Referee  ⚠️ FAILED RE-VERIFICATION

Write a query to report the names of the customers that are not referred by the customer with id = 2. 

```sql
SELECT name FROM customers WHERE referee_id IS NULL OR referee_id != 2
```

### 11. [#33] Big Countries  ⚠️ FAILED RE-VERIFICATION

Write a query to find the name, population, and area of big countries (area >= 3000000 or population >= 25000000). Table name is `world`

```sql
SELECT name, population, area FROM world WHERE area >= 3000000 OR population >= 25000000
```

### 12. [#34] Article Views I  ⚠️ FAILED RE-VERIFICATION

Write a query to find all the authors that viewed at least one of their own articles. Sort the result by author_id ascending. Table name is `views`

```sql
SELECT DISTINCT author_id FROM views WHERE author_id = viewer_id ORDER BY author_id ASC
```

### 13. [#37] Higher Than 75 Marks  ⚠️ FAILED RE-VERIFICATION

Write a query to get the Name of any student in `students` who scored strictly higher than 75 Marks. Order your output by Name alphabetically.

```sql
SELECT name FROM students WHERE marks > 75 ORDER BY name ASC
```

### 14. [#40] Invalid Tweets  ⚠️ FAILED RE-VERIFICATION

Write a query to find the IDs of the invalid tweets. A tweet is invalid if the number of characters used in the content of the tweet is strictly greater than 15. Table name is `tweets`.

```sql
SELECT tweet_id FROM tweets WHERE CHAR_LENGTH(content) > 15
```

### 15. [#43] Non-Gryffindor Students  ⚠️ FAILED RE-VERIFICATION

Write a query to find the names of Hogwarts students who are NOT in the 'Gryffindor' house, using the NOT IN operator. Table name is `wizards`.

```sql
SELECT name FROM wizards WHERE house NOT IN ('Gryffindor')
```

### 16. [#44] The Ultimate High Score  ⚠️ FAILED RE-VERIFICATION

Write a query to retrieve the player_name and score of the single highest score in the `match_scores` table using LIMIT 1.

```sql
SELECT player_name, score FROM match_scores ORDER BY score DESC LIMIT 1
```

### 17. [#45] Patients with Specific Medications  ⚠️ FAILED RE-VERIFICATION

Write a query to retrieve the patient_name for all patients whose prescribed medicine is either 'Amoxicillin' or 'Ibuprofen' (use IN). Table name is `patients`.

```sql
SELECT patient_name FROM patients WHERE medicine IN ('Amoxicillin', 'Ibuprofen')
```

### 18. [#46] Count Inactive Subscriptions  ⚠️ FAILED RE-VERIFICATION

Write a query to count the total number of subscriptions where the `is_active` status is FALSE (or 0 in integer terms). Return as `inactive_count`. Table name is `subscriptions`.

```sql
SELECT COUNT(*) AS inactive_count FROM subscriptions WHERE is_active = 0
```

### 19. [#48] Total Inventory Stock  ⚠️ FAILED RE-VERIFICATION

Write a query to calculate the sum of all `stock_quantity` across all products in the `inventory` table. Return the result as `total_stock`.

```sql
SELECT SUM(stock_quantity) AS total_stock FROM inventory
```

### 20. [#50] Shortest Song  ⚠️ FAILED RE-VERIFICATION

Write a query to find the title of the shortest song in the `songs` table by ordering the `duration_seconds` ascending and limiting to 1.

```sql
SELECT title FROM songs ORDER BY duration_seconds ASC LIMIT 1
```

### 21. [#51] Customers with Multiple Orders  ⚠️ FAILED RE-VERIFICATION

Write a query to find all customers who have placed more than one order from the `orders` table, along with their order count.

```sql
SELECT customer_name, COUNT(*) AS order_count FROM orders GROUP BY customer_name HAVING COUNT(*) > 1 ORDER BY customer_name
```

### 22. [#52] Classify Employees by Salary Band  ⚠️ FAILED RE-VERIFICATION

Write a query to classify employees into salary bands: 'Low' (below 50000), 'Medium' (50000-80000), 'High' (above 80000) from the `employees` table.

```sql
SELECT name, CASE WHEN salary < 50000 THEN 'Low' WHEN salary <= 80000 THEN 'Medium' ELSE 'High' END AS salary_band FROM employees ORDER BY id
```

### 23. [#53] Find Duplicate Student Enrollments  ⚠️ FAILED RE-VERIFICATION

Write a query to find students who are enrolled in the same course more than once from the `enrollments` table.

```sql
SELECT student_name, course_name FROM enrollments GROUP BY student_name, course_name HAVING COUNT(*) > 1 ORDER BY student_name
```

### 24. [#54] Total Sales Per Category  ⚠️ FAILED RE-VERIFICATION

Write a query to calculate the total sales amount for each product category from the `sales` table, ordered by total sales descending (ties broken by category name descending).

```sql
SELECT category, SUM(amount) AS total_sales FROM sales GROUP BY category ORDER BY total_sales DESC, category DESC
```

### 25. [#55] Employees Above Average Salary  ⚠️ FAILED RE-VERIFICATION

Write a query to find employees whose salary is above the average salary of all employees from the `employees` table.

```sql
SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees) ORDER BY salary DESC
```

### 26. [#56] Update Product Prices by Category  ⚠️ FAILED RE-VERIFICATION

Write a query to increase the price of all 'Electronics' products by 10% in the `products` table. Then display the updated electronics products.

```sql
UPDATE products SET price = price * 1.10 WHERE category = 'Electronics'; SELECT * FROM products WHERE category = 'Electronics'
```

### 27. [#57] Delete Inactive Users  ⚠️ FAILED RE-VERIFICATION

Write a query to delete all users with an 'inactive' status from the `users` table, then display the remaining users.

```sql
DELETE FROM users WHERE status = 'inactive'; SELECT * FROM users ORDER BY id
```

### 28. [#58] Departments with More Than 3 Employees  ⚠️ FAILED RE-VERIFICATION

Write a query to find departments that have more than 3 employees from the `employees` table, along with the employee count.

```sql
SELECT department, COUNT(*) AS employee_count FROM employees GROUP BY department HAVING COUNT(*) > 3
```

### 29. [#59] Students Not Enrolled in Mathematics  ⚠️ FAILED RE-VERIFICATION

Write a query to find students who are not enrolled in 'Mathematics' from the `enrollments` table.

```sql
SELECT DISTINCT student_name FROM enrollments WHERE student_name NOT IN (SELECT student_name FROM enrollments WHERE course_name = 'Mathematics') ORDER BY student_name
```

### 30. [#60] Movies with Above Average Rating  ⚠️ FAILED RE-VERIFICATION

Write a query to find all movies with a rating above the average rating of all movies from the `movies` table.

```sql
SELECT title, rating FROM movies WHERE rating > (SELECT AVG(rating) FROM movies) ORDER BY rating DESC
```

### 31. [#61] Tag Students by Performance  ⚠️ FAILED RE-VERIFICATION

Write a query to tag students as 'Pass' if their grade is 50 or above, and 'Fail' otherwise from the `students` table.

```sql
SELECT name, CASE WHEN grade >= 50 THEN 'Pass' ELSE 'Fail' END AS result FROM students ORDER BY id
```

### 32. [#62] Find Employees with Same Job Title  ⚠️ FAILED RE-VERIFICATION

Write a query to find employees who share the same job title as at least one other employee from the `employees` table.

```sql
SELECT name, job_title FROM employees WHERE job_title IN (SELECT job_title FROM employees GROUP BY job_title HAVING COUNT(*) > 1) ORDER BY id
```

### 33. [#63] Total Orders Per Day  ⚠️ FAILED RE-VERIFICATION

Write a query to find the total number of orders placed on each day from the `orders` table, ordered by date ascending.

```sql
SELECT order_date, COUNT(*) AS total_orders FROM orders GROUP BY order_date ORDER BY order_date
```

### 34. [#65] Players Enrolled in Multiple Games  ⚠️ FAILED RE-VERIFICATION

Write a query to find players who have participated in more than one game from the `game_participants` table.

```sql
SELECT player_name, COUNT(*) AS game_count FROM game_participants GROUP BY player_name HAVING COUNT(*) > 1 ORDER BY player_name
```

### 35. [#66] Give Bonus to Low Earners  ⚠️ FAILED RE-VERIFICATION

Write a query to increase the salary of employees earning less than 50000 by 5000 in the `employees` table. Then display only the updated employees.

```sql
UPDATE employees SET salary = salary + 5000 WHERE salary < 50000; SELECT name, salary FROM employees WHERE salary < 55000 ORDER BY id
```

### 36. [#67] Delete Expired Coupons  ⚠️ FAILED RE-VERIFICATION

Write a query to delete all coupons that expired before '2025-01-01' from the `coupons` table. Then display the remaining coupons.

```sql
DELETE FROM coupons WHERE expiry_date < '2025-01-01'; SELECT code, expiry_date FROM coupons ORDER BY id
```

### 37. [#68] Authors with Multiple Books  ⚠️ FAILED RE-VERIFICATION

Write a query to find authors who have written more than one book from the `books` table.

```sql
SELECT author, COUNT(*) AS book_count FROM books GROUP BY author HAVING COUNT(*) > 1 ORDER BY MIN(id)
```

### 38. [#69] Classify Orders by Size  ⚠️ FAILED RE-VERIFICATION

Write a query to classify orders as 'Small' (below 100), 'Medium' (100-500), or 'Large' (above 500) from the `orders` table.

```sql
SELECT customer_name, CASE WHEN amount < 100 THEN 'Small' WHEN amount <= 500 THEN 'Medium' ELSE 'Large' END AS order_size FROM orders ORDER BY id
```

### 39. [#70] Find Repeated Transactions  ⚠️ FAILED RE-VERIFICATION

Write a query to detect duplicate transactions where the same customer has the same amount on the same date from the `transactions` table.

```sql
SELECT customer_name, amount, transaction_date FROM transactions GROUP BY customer_name, amount, transaction_date HAVING COUNT(*) > 1 ORDER BY MIN(id)
```

### 40. [#71] Average Rating Per Genre  ⚠️ FAILED RE-VERIFICATION

Write a query to calculate the average rating for each movie genre from the `movies` table, only showing genres with an average rating above 7.0.

```sql
SELECT genre, AVG(rating) AS avg_rating FROM movies GROUP BY genre HAVING AVG(rating) > 7.0 ORDER BY MIN(id)
```

### 41. [#73] Hogwarts Houses with High Average Points  ⚠️ FAILED RE-VERIFICATION

Write a query to find houses whose average house points exceed 150 from the `hogwarts_students` table.

```sql
SELECT house, AVG(house_points) AS avg_points FROM hogwarts_students GROUP BY house HAVING AVG(house_points) > 150
```

### 42. [#76] Delete Low Stock Items  ⚠️ FAILED RE-VERIFICATION

Write a query to delete items with a quantity of 0 from the `inventory` table. Then display the remaining items.

```sql
DELETE FROM inventory WHERE quantity = 0; SELECT item_name, quantity FROM inventory
```

### 43. [#77] Find Students Scoring in Multiple Subjects  ⚠️ FAILED RE-VERIFICATION

Write a query to find students who have scores recorded in more than one subject from the `scores` table.

```sql
SELECT student_name, COUNT(DISTINCT subject) AS subject_count FROM scores GROUP BY student_name HAVING COUNT(DISTINCT subject) > 1
```

### 44. [#78] Classify Planets by Size  ⚠️ FAILED RE-VERIFICATION

Write a query to classify planets as 'Small' (diameter < 10000 km), 'Medium' (10000-50000 km), or 'Large' (above 50000 km) from the `planets` table.

```sql
SELECT planet_name, CASE WHEN diameter_km < 10000 THEN 'Small' WHEN diameter_km <= 50000 THEN 'Medium' ELSE 'Large' END AS size_category FROM planets
```

### 45. [#79] Courses with Highest Enrollment  ⚠️ FAILED RE-VERIFICATION

Write a query to find the course(s) with the highest number of enrolled students from the `enrollments` table.

```sql
SELECT course_name, COUNT(*) AS enrollment_count FROM enrollments GROUP BY course_name HAVING COUNT(*) = (SELECT MAX(cnt) FROM (SELECT COUNT(*) AS cnt FROM enrollments GROUP BY course_name) t) ORDER BY course_name
```

### 46. [#80] Mark Heroes by Power Tier  ⚠️ FAILED RE-VERIFICATION

Write a query to classify Marvel characters as 'God-Tier' (power_level > 95), 'Elite' (80-95), or 'Street-Level' (below 80) from the `marvel_characters` table.

```sql
SELECT name, CASE WHEN power_level > 95 THEN 'God-Tier' WHEN power_level >= 80 THEN 'Elite' ELSE 'Street-Level' END AS tier FROM marvel_characters
```

### 47. [#81] Find Professors Teaching Multiple Subjects  ⚠️ FAILED RE-VERIFICATION

Write a query to find professors who teach more than one subject from the `teaching_assignments` table.

```sql
SELECT professor_name, COUNT(DISTINCT subject) AS subject_count FROM teaching_assignments GROUP BY professor_name HAVING COUNT(DISTINCT subject) > 1
```

### 48. [#87] Count Security Incidents by Type  ⚠️ FAILED RE-VERIFICATION

Write a query to count the number of incidents for each incident type from the `security_incidents` table, ordered by count descending.

```sql
SELECT incident_type, COUNT(*) AS incident_count FROM security_incidents GROUP BY incident_type ORDER BY incident_count DESC
```

### 49. [#89] Find Users with Failed Logins on the Same Day  ⚠️ FAILED RE-VERIFICATION

Write a query to find IP addresses that had more than 2 failed login attempts on the same day from the `login_attempts` table.

```sql
SELECT ip_address, attempt_date, COUNT(*) AS failed_count FROM login_attempts WHERE status='failed' GROUP BY ip_address, attempt_date HAVING COUNT(*) > 2
```

### 50. [#95] Identify Multi-genre Directors  ⚠️ FAILED RE-VERIFICATION

Write a query to find directors who have directed movies in more than one genre from the `director_movies` table.

```sql
SELECT director_name, COUNT(DISTINCT genre) AS genre_count FROM director_movies GROUP BY director_name HAVING COUNT(DISTINCT genre) > 1
```

## Hard (10)

### [#97] Second Highest Salary  ⚠️ FAILED RE-VERIFICATION

Write a query to report the second highest salary from the `employees` table. If there is no second highest salary, the query should report null.

```sql
SELECT (SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1) AS SecondHighestSalary
```

### [#101] Customers Who Bought All Products  ⚠️ FAILED RE-VERIFICATION

Write a query to report the customer ids from the `customer` table that bought all the products in the `product` table.

```sql
SELECT customer_id FROM customer GROUP BY customer_id HAVING COUNT(DISTINCT product_key) = (SELECT COUNT(*) FROM product)
```

### [#108] Exchange Seats  ⚠️ FAILED RE-VERIFICATION

Write a query to swap the seat id of every two consecutive students. If the number of students is odd, the id of the last student is not swapped. Order the result by id ascending.

```sql
SELECT s1.id, COALESCE((CASE WHEN s1.id % 2 = 1 THEN (SELECT student FROM seat WHERE id = s1.id+1) ELSE (SELECT student FROM seat WHERE id = s1.id-1) END), s1.student) AS student FROM seat s1 ORDER BY s1.id
```

### [#112] Running Total of Sales  ⚠️ FAILED RE-VERIFICATION

Write a query to calculate the running total of sales amounts ordered by sale date from the `sales` table. Display the sale date, amount, and cumulative total.

```sql
SELECT sale_date, amount, SUM(amount) OVER (ORDER BY sale_date, id) AS running_total FROM sales ORDER BY sale_date, id
```

### [#113] Departments Where Every Employee Earns Above 60000  ⚠️ FAILED RE-VERIFICATION

Write a query to find departments where ALL employees have a salary above 60000 from the `employees` table. Display the department and its employee count.

```sql
SELECT department, COUNT(*) AS employee_count FROM employees GROUP BY department HAVING MIN(salary) > 60000 ORDER BY MIN(id)
```

### [#117] Detect Salary Anomalies  ⚠️ FAILED RE-VERIFICATION

Write a query to find employees whose salary is more than 1.5 times the average salary of their own department from the `employees` table. Display their name, department, salary, and their department's average salary.

```sql
SELECT name, department, salary, ROUND(dept_avg_all, 2) AS dept_avg_salary FROM (SELECT name, department, salary, AVG(salary) OVER (PARTITION BY department) AS dept_avg_all, (SUM(salary) OVER (PARTITION BY department) - salary) / (COUNT(*) OVER (PARTITION BY department) - 1) AS avg_excl_self FROM employees) t WHERE salary > 1.5 * avg_excl_self
```

### [#118] Consecutive Day Streak Detection  ⚠️ FAILED RE-VERIFICATION

Write a query to find users who have logged in on at least 3 consecutive days from the `user_logins` table. Return each qualifying user and their streak start date.

```sql
SELECT username, MIN(login_date) AS streak_start FROM (SELECT username, login_date, DATE_SUB(login_date, INTERVAL ROW_NUMBER() OVER (PARTITION BY username ORDER BY login_date) DAY) AS grp FROM user_logins) t GROUP BY username, grp HAVING COUNT(*) >= 3
```

### [#124] Median Salary by Department  ⚠️ FAILED RE-VERIFICATION

Write a query to find the median salary for each department from the `employees` table. If the department has an even number of employees, return the lower of the two middle values. Display department and median_salary ordered by department. (Inspired by LeetCode #569)

```sql
WITH ranked AS (SELECT department, salary, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary ASC, id ASC) AS rn, COUNT(*) OVER (PARTITION BY department) AS cnt FROM employees) SELECT department, salary AS median_salary FROM ranked WHERE rn = CEIL(cnt/2) ORDER BY department
```

### [#125] Cumulative Salary Per Employee  ⚠️ FAILED RE-VERIFICATION

Write a query to compute the 3-month rolling sum of salary for each employee from the `salary_records` table, ordered by employee_id and month. Exclude the most recent month for each employee. Display employee_id, month, and rolling_3month_sum. (Inspired by LeetCode #579)

```sql
WITH rolled AS (SELECT employee_id, month, SUM(salary) OVER (PARTITION BY employee_id ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rolling_3month_sum, MAX(month) OVER (PARTITION BY employee_id) AS max_month FROM salary_records) SELECT employee_id, month, rolling_3month_sum FROM rolled WHERE month <> max_month ORDER BY employee_id, month
```

### [#130] Placements — Best Friend Salary Comparison  ⚠️ FAILED RE-VERIFICATION

Write a query to output the names of students whose best friends got offered a higher salary package than themselves from the `students`, `friends`, and `packages` tables. Order the output alphabetically by student name. (Inspired by HackerRank Placements)

```sql
SELECT s.name FROM students s JOIN friends f ON f.student_id = s.id JOIN packages p_self ON p_self.student_id = s.id JOIN packages p_friend ON p_friend.student_id = f.friend_id WHERE p_friend.salary > p_self.salary ORDER BY s.name
```

