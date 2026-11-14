-- 013_faculty_subjects.sql
-- Assign specialized subjects and default academic bios to faculty members (FA-017 .. FA-049)

UPDATE users SET bio = 'IT Department Program Head specializing in Computing Fundamentals, Data Structures, and Systems Analysis & Design.' WHERE custom_id = 'FA-017' AND (bio IS NULL OR bio = '');
UPDATE users SET bio = 'Senior IT Faculty specializing in Networking Fundamentals, Cisco Infrastructure, and Computing Foundations.' WHERE custom_id = 'FA-021' AND (bio IS NULL OR bio = '');
UPDATE users SET bio = 'IT Faculty mentor specializing in Object-Oriented Programming and Full-Stack Web Development.' WHERE custom_id = 'FA-025' AND (bio IS NULL OR bio = '');
UPDATE users SET bio = 'IT Faculty specializing in Relational Database Management Systems, SQL Optimization, and Systems Architecture.' WHERE custom_id = 'FA-029' AND (bio IS NULL OR bio = '');
UPDATE users SET bio = 'Accounting Department Faculty specializing in Financial Accounting, Auditing, and Corporate Financial Management.' WHERE custom_id = 'FA-033' AND (bio IS NULL OR bio = '');
UPDATE users SET bio = 'Mathematics Department Faculty specializing in Calculus, Applied Probability, and Statistical Analysis.' WHERE custom_id = 'FA-037' AND (bio IS NULL OR bio = '');
UPDATE users SET bio = 'Adjunct IT Faculty specializing in Modern Web Technologies and Enterprise Network Administration.' WHERE custom_id = 'FA-041' AND (bio IS NULL OR bio = '');
UPDATE users SET bio = 'Languages & Literature Faculty specializing in Academic English Communication and Komunikasyon sa Filipino.' WHERE custom_id = 'FA-045' AND (bio IS NULL OR bio = '');
UPDATE users SET bio = 'Business Administration Faculty specializing in Strategic Management and Marketing Principles.' WHERE custom_id = 'FA-049' AND (bio IS NULL OR bio = '');

INSERT INTO user_subjects (user_id, subject_id)
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'FA-017' AND s.code IN ('IT 101', 'PROG 201', 'SYS 401') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'FA-021' AND s.code IN ('IT 101', 'NET 201') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'FA-025' AND s.code IN ('PROG 301', 'WEB 301') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'FA-029' AND s.code IN ('DBMS 301', 'SYS 401') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'FA-033' AND s.code IN ('ACCT 102', 'FIN 301') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'FA-037' AND s.code IN ('MATH 201', 'STAT 101') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'FA-041' AND s.code IN ('NET 201', 'WEB 301') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'FA-045' AND s.code IN ('ENGL 101', 'FIL 102') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'FA-049' AND s.code IN ('MGMT 301', 'MKT 201')
ON CONFLICT DO NOTHING;

