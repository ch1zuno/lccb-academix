BEGIN;

-- ASSUMPTION: Used dummy bcrypt hashes for passwords and generated emails for users missing them in data.js to satisfy UNIQUE constraint.
-- ASSUMPTION: Superadmin email appended with .admin to avoid collision with Faculty record for Sir Lenuel Betita.
-- Seed accounts share one demo password: demo1234

INSERT INTO subjects (code, name, department) VALUES
('IT 101', 'Introduction to Computing', 'BSIT'),
('PROG 201', 'Data Structures & Algorithms', 'BSIT'),
('PROG 301', 'Object-Oriented Programming', 'BSIT'),
('WEB 301', 'Web Development', 'BSIT'),
('DBMS 301', 'Database Management Systems', 'BSIT'),
('NET 201', 'Networking Fundamentals', 'BSIT'),
('SYS 401', 'Systems Analysis & Design', 'BSIT'),
('ACCT 102', 'Fundamentals of Accounting', 'BSA'),
('MATH 201', 'Calculus I', 'General'),
('ENGL 101', 'English Communication', 'General'),
('FIN 301', 'Financial Management', 'BSA'),
('STAT 101', 'Probability & Statistics', 'General'),
('MGMT 301', 'Principles of Management', 'BSBA'),
('MKT 201', 'Marketing Management', 'BSBA'),
('FIL 102', 'Filipino sa IbaNULLt Ibang Disiplina', 'General'),
('STS 101', 'Science, Technology & Society', 'General');

INSERT INTO users (custom_id, name, email, role, avatar, title, department, program, is_available, is_verified, bio, hourly_rate, password_hash)
VALUES
('SA-001', 'Sir Lenuel Betita', 'l.betita.admin@lccbacolod.edu.ph', 'superadmin', '👨‍🏫', 'IT Department Head', NULL, NULL, true, true, NULL, NULL, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu');

INSERT INTO users (custom_id, name, email, role, avatar, title, department, program, is_available, is_verified, bio, hourly_rate, password_hash)
VALUES
('FA-017', 'Mrs. Bethel Tisuela', 'b.tisuela@lccbacolod.edu.ph', 'faculty', '👩‍🏫', 'IT Department — Program Head', 'BSIT', NULL, true, true, NULL, NULL, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('FA-021', 'Sir Charles Torres', 'c.torres@lccbacolod.edu.ph', 'faculty', '👨‍🏫', 'IT Department — Senior Faculty', 'BSIT', NULL, true, true, NULL, NULL, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('FA-025', 'Sir Lenuel Betita', 'l.betita@lccbacolod.edu.ph', 'faculty', '👨‍🏫', 'IT Department — Faculty', 'BSIT', NULL, true, true, NULL, NULL, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('FA-029', 'Sir Vincent Bonifacio', 'v.bonifacio@lccbacolod.edu.ph', 'faculty', '👨‍🏫', 'IT Department — Faculty', 'BSIT', NULL, true, true, NULL, NULL, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('FA-033', 'Prof. Ricardo Santos', 'r.santos@lccbacolod.edu.ph', 'faculty', '👨‍🏫', 'Accounting Department', 'BSA', NULL, true, true, NULL, NULL, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('FA-037', 'Prof. Elena Marcos', 'e.marcos@lccbacolod.edu.ph', 'faculty', '👩‍🏫', 'Mathematics Department', 'General', NULL, true, true, NULL, NULL, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('FA-041', 'Prof. James Navarro', 'j.navarro@lccbacolod.edu.ph', 'faculty', '👨‍🏫', 'IT Department — Adjunct', 'BSIT', NULL, true, true, NULL, NULL, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('FA-045', 'Prof. Carmen Villanueva', 'c.villanueva@lccbacolod.edu.ph', 'faculty', '👩‍🏫', 'English Department', 'General', NULL, true, true, NULL, NULL, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('FA-049', 'Prof. Antonio Lacson', 'a.lacson@lccbacolod.edu.ph', 'faculty', '👨‍🏫', 'Business Administration Dept.', 'BSBA', NULL, true, true, NULL, NULL, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu');

INSERT INTO users (custom_id, name, email, role, avatar, program, is_available, is_verified, bio, hourly_rate, password_hash) VALUES
('TU-042', 'Mark Antipo', 'm.antipo@lccbacolod.edu.ph', 'tutor', '🧑‍🎓', 'BSIT 3-A', true, true, 'DeanNULLs Lister | Passionate about helping fellow Consolacionians excel in Computing.', 15, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TU-015', 'Angela Delos Santos', 'a.delossantos@lccbacolod.edu.ph', 'tutor', '👩‍🎓', 'BSIT 4-A', true, true, 'Best in Programming awardee. Specializes in Python, Java & Web Dev tutoring.', 20, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TU-023', 'Carlos Villanueva', 'c.villanueva.tutor@lccbacolod.edu.ph', 'tutor', '👨‍🎓', 'BSIT 3-B', false, true, 'Math Olympiad semi-finalist. Makes Calculus understandable.', 15, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TU-031', 'Patricia Reyes', 'p.reyes@lccbacolod.edu.ph', 'tutor', '👩‍🎓', 'BSED 3-A', true, true, 'Published poet and campus journalist. Can help you write anything.', 12, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TU-038', 'Jerome Lacson', 'j.lacson.tutor@lccbacolod.edu.ph', 'tutor', '🧑‍🎓', 'BSA 3-A', true, false, 'Aspiring CPA with hands-on experience in bookkeeping.', 15, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TU-044', 'Sofia Mendoza', 's.mendoza.tutor@lccbacolod.edu.ph', 'tutor', '👩‍🎓', 'BSA 4-A', true, true, 'Top scorer in board exam practice. Finance & Math double expertise.', 25, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TU-050', 'Renzo Gabriel Tan', 'r.tan@lccbacolod.edu.ph', 'tutor', '👨‍🎓', 'BSIT 4-B', true, true, 'Database enthusiast. Oracle & MySQL certified. Networking nerd.', 18, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TU-053', 'Kimberly Anne Flores', 'k.flores@lccbacolod.edu.ph', 'tutor', '👩‍🎓', 'BSIT 3-A', true, true, 'Full-stack web developer. React & Node.js specialist.', 18, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TU-056', 'Miguel Angelo Cruz', 'm.cruz.tutor@lccbacolod.edu.ph', 'tutor', '🧑‍🎓', 'BSIT 2-A', true, true, 'Rising sophomore tutor. Patient with beginners.', 12, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TU-059', 'Jasmine Lim', 'j.lim@lccbacolod.edu.ph', 'tutor', '👩‍🎓', 'BSA 3-B', false, true, 'Financial analysis whiz. DeanNULLs Lister for 4 consecutive terms.', 15, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TU-062', 'John Patrick Navarro', 'jp.navarro@lccbacolod.edu.ph', 'tutor', '👨‍🎓', 'BSIT 4-A', true, true, 'Systems analyst intern at a local tech company. Capstone mentor.', 22, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TU-065', 'Maria Cecilia Santos', 'mc.santos@lccbacolod.edu.ph', 'tutor', '👩‍🎓', 'BSBA 3-A', true, true, 'Business plan competition winner. Loves strategic management.', 12, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TU-068', 'Francis Dela Peña', 'f.delapena@lccbacolod.edu.ph', 'tutor', '🧑‍🎓', 'BSIT 3-B', true, false, 'Cisco Networking Academy student. Passionate about infrastructure.', 12, '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu');

UPDATE users SET certified_by_id = (SELECT id FROM users WHERE name = 'Mrs. Bethel Tisuela' LIMIT 1) WHERE custom_id = 'TU-042';
UPDATE users SET certified_by_id = (SELECT id FROM users WHERE name = 'Sir Lenuel Betita' AND role = 'faculty' LIMIT 1) WHERE custom_id IN ('TU-015', 'TU-053');
UPDATE users SET certified_by_id = (SELECT id FROM users WHERE name = 'Prof. Elena Marcos' LIMIT 1) WHERE custom_id = 'TU-023';
UPDATE users SET certified_by_id = (SELECT id FROM users WHERE name = 'Prof. Carmen Villanueva' LIMIT 1) WHERE custom_id = 'TU-031';
UPDATE users SET certified_by_id = (SELECT id FROM users WHERE name = 'Prof. Ricardo Santos' LIMIT 1) WHERE custom_id IN ('TU-038', 'TU-044', 'TU-059');
UPDATE users SET certified_by_id = (SELECT id FROM users WHERE name = 'Sir Vincent Bonifacio' LIMIT 1) WHERE custom_id IN ('TU-050', 'TU-062');
UPDATE users SET certified_by_id = (SELECT id FROM users WHERE name = 'Sir Charles Torres' LIMIT 1) WHERE custom_id IN ('TU-056', 'TU-068');
UPDATE users SET certified_by_id = (SELECT id FROM users WHERE name = 'Prof. Antonio Lacson' LIMIT 1) WHERE custom_id = 'TU-065';

INSERT INTO users (custom_id, name, email, role, program, password_hash) VALUES
('TE-128', 'Julian Gemelo', 'j.gemelo@lccbacolod.edu.ph', 'learner', 'BSIT 2-B', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TE-092', 'Maria Luisa Tan', 'ml.tan@lccbacolod.edu.ph', 'learner', 'BSA 1-A', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TE-145', 'Rafael Cruz', 'r.cruz@lccbacolod.edu.ph', 'learner', 'BSIT 3-A', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TE-067', 'Anna Garcia', 'a.garcia@lccbacolod.edu.ph', 'learner', 'BSBA 2-C', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TE-201', 'Miguel Santos', 'm.santos@lccbacolod.edu.ph', 'learner', 'BSA 2-A', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TE-178', 'Bianca Lopez', 'b.lopez@lccbacolod.edu.ph', 'learner', 'BSIT 1-B', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TE-203', 'Kenneth James Reyes', 'kj.reyes@lccbacolod.edu.ph', 'learner', 'BSIT 1-A', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TE-210', 'Christine Joy Lacson', 'cj.lacson@lccbacolod.edu.ph', 'learner', 'BSIT 2-A', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TE-215', 'Aaron Paul Mendoza', 'ap.mendoza@lccbacolod.edu.ph', 'learner', 'BSIT 1-B', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TE-220', 'Samantha Nicole Tan', 'sn.tan@lccbacolod.edu.ph', 'learner', 'BSA 1-B', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TE-225', 'Gabriel Luis Navarro', 'gl.navarro@lccbacolod.edu.ph', 'learner', 'BSIT 2-B', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TE-230', 'Isabelle Marie Cruz', 'im.cruz@lccbacolod.edu.ph', 'learner', 'BSBA 1-A', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TE-235', 'Daniel Marco Flores', 'dm.flores@lccbacolod.edu.ph', 'learner', 'BSIT 3-B', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TE-240', 'Princess Mae Gonzales', 'pm.gonzales@lccbacolod.edu.ph', 'learner', 'BSA 2-B', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu'),
('TE-245', 'Joshua Carlo Dela Cruz', 'jc.delacruz@lccbacolod.edu.ph', 'learner', 'BSIT 1-A', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu');

INSERT INTO user_subjects (user_id, subject_id)
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'TU-042' AND s.code IN ('IT 101', 'PROG 201') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'TU-015' AND s.code IN ('PROG 201', 'PROG 301', 'WEB 301') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'TU-023' AND s.code IN ('MATH 201', 'STAT 101') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'TU-031' AND s.code IN ('ENGL 101', 'FIL 102') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'TU-038' AND s.code IN ('ACCT 102', 'MGMT 301') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'TU-044' AND s.code IN ('MATH 201', 'FIN 301', 'ACCT 102') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'TU-050' AND s.code IN ('DBMS 301', 'IT 101', 'NET 201') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'TU-053' AND s.code IN ('WEB 301', 'PROG 301') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'TU-056' AND s.code IN ('IT 101', 'PROG 201') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'TU-059' AND s.code IN ('ACCT 102', 'FIN 301') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'TU-062' AND s.code IN ('SYS 401', 'DBMS 301', 'PROG 301') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'TU-065' AND s.code IN ('MGMT 301', 'MKT 201') UNION ALL
SELECT u.id, s.id FROM users u, subjects s WHERE u.custom_id = 'TU-068' AND s.code IN ('NET 201', 'IT 101');

INSERT INTO referrals (referral_code, learner_id, faculty_id, assigned_tutor_id, subject_id, topic, urgency, status, date, notes, hours_required)
VALUES
('REF-001', (SELECT id FROM users WHERE custom_id = 'TE-128'), (SELECT id FROM users WHERE custom_id = 'FA-017'), NULL, (SELECT id FROM subjects WHERE code = 'PROG 201'), 'Linked Lists & Pointers', 'high', 'flagged', '2026-09-28', 'Consistently failing lab exercises. Cannot implement basic data structures.', 6),
('REF-002', (SELECT id FROM users WHERE custom_id = 'TE-203'), (SELECT id FROM users WHERE custom_id = 'FA-021'), NULL, (SELECT id FROM subjects WHERE code = 'IT 101'), 'Binary & Number Systems', 'high', 'flagged', '2026-09-27', 'Failed Quiz 1 and Quiz 2. Needs foundational help with number conversions.', 4),
('REF-003', (SELECT id FROM users WHERE custom_id = 'TE-210'), (SELECT id FROM users WHERE custom_id = 'FA-029'), NULL, (SELECT id FROM subjects WHERE code = 'DBMS 301'), 'SQL Joins & Normalization', 'medium', 'flagged', '2026-09-26', 'Struggles with complex JOIN queries and 3NF normalization.', 5),
('REF-004', (SELECT id FROM users WHERE custom_id = 'TE-215'), (SELECT id FROM users WHERE custom_id = 'FA-021'), (SELECT id FROM users WHERE custom_id = 'TU-056'), (SELECT id FROM subjects WHERE code = 'IT 101'), 'Flowcharting & Pseudocode', 'medium', 'assigned', '2026-09-25', 'Missed 3 classes due to illness. Needs catch-up on logic fundamentals.', 3),
('REF-005', (SELECT id FROM users WHERE custom_id = 'TE-225'), (SELECT id FROM users WHERE custom_id = 'FA-025'), (SELECT id FROM users WHERE custom_id = 'TU-053'), (SELECT id FROM subjects WHERE code = 'WEB 301'), 'JavaScript DOM Manipulation', 'high', 'assigned', '2026-09-24', 'Cannot complete lab exercises independently. Zero scores on JS assignments.', 6),
('REF-006', (SELECT id FROM users WHERE custom_id = 'TE-235'), (SELECT id FROM users WHERE custom_id = 'FA-025'), (SELECT id FROM users WHERE custom_id = 'TU-015'), (SELECT id FROM subjects WHERE code = 'PROG 301'), 'Inheritance & Polymorphism', 'medium', 'in-progress', '2026-09-22', 'Understands basic OOP but fails to apply inheritance patterns.', 4),
('REF-007', (SELECT id FROM users WHERE custom_id = 'TE-178'), (SELECT id FROM users WHERE custom_id = 'FA-017'), (SELECT id FROM users WHERE custom_id = 'TU-042'), (SELECT id FROM subjects WHERE code = 'PROG 201'), 'Recursion', 'low', 'in-progress', '2026-09-20', 'Grasps iteration but needs help transitioning to recursive thinking.', 3),
('REF-008', (SELECT id FROM users WHERE custom_id = 'TE-092'), (SELECT id FROM users WHERE custom_id = 'FA-033'), (SELECT id FROM users WHERE custom_id = 'TU-044'), (SELECT id FROM subjects WHERE code = 'ACCT 102'), 'Journal Entries & T-Accounts', 'medium', 'in-progress', '2026-09-18', 'Shows potential but confuses debit/credit placements consistently.', 4),
('REF-009', (SELECT id FROM users WHERE custom_id = 'TE-067'), (SELECT id FROM users WHERE custom_id = 'FA-045'), (SELECT id FROM users WHERE custom_id = 'TU-031'), (SELECT id FROM subjects WHERE code = 'ENGL 101'), 'Essay Writing & Argumentation', 'medium', 'resolved', '2026-09-10', 'Improved significantly after 3 sessions. Essay score went from 62% to 88%.', 4),
('REF-010', (SELECT id FROM users WHERE custom_id = 'TE-145'), (SELECT id FROM users WHERE custom_id = 'FA-021'), (SELECT id FROM users WHERE custom_id = 'TU-050'), (SELECT id FROM subjects WHERE code = 'NET 201'), 'Subnetting & IP Addressing', 'low', 'resolved', '2026-09-08', 'Now scoring above average. Great improvement in lab performance.', 3),
('REF-011', (SELECT id FROM users WHERE custom_id = 'TE-220'), (SELECT id FROM users WHERE custom_id = 'FA-037'), (SELECT id FROM users WHERE custom_id = 'TU-044'), (SELECT id FROM subjects WHERE code = 'MATH 201'), 'Derivatives & Integration', 'high', 'assigned', '2026-09-29', 'Failed midterm exam. At risk of failing the semester.', 8),
('REF-012', (SELECT id FROM users WHERE custom_id = 'TE-245'), (SELECT id FROM users WHERE custom_id = 'FA-017'), (SELECT id FROM users WHERE custom_id = 'TU-068'), (SELECT id FROM subjects WHERE code = 'IT 101'), 'Computer Hardware Components', 'low', 'resolved', '2026-09-05', 'Quick learner. Passed retest with 90% after 2 sessions.', 2);

INSERT INTO sessions (session_code, tutor_id, learner_id, subject_id, topic, date, time, duration, status, location, faculty_id, rating, cancel_reason)
VALUES
('SES-001', (SELECT id FROM users WHERE custom_id = 'TU-042'), (SELECT id FROM users WHERE custom_id = 'TE-128'), (SELECT id FROM subjects WHERE code = 'PROG 201'), 'Linked Lists', '2026-09-30', '2:00 PM', '1.5 hrs', 'upcoming', 'Library Study Room A', (SELECT id FROM users WHERE custom_id = 'FA-017'), NULL, NULL),
('SES-002', (SELECT id FROM users WHERE custom_id = 'TU-053'), (SELECT id FROM users WHERE custom_id = 'TE-225'), (SELECT id FROM subjects WHERE code = 'WEB 301'), 'DOM Manipulation', '2026-09-30', '3:30 PM', '2 hrs', 'upcoming', 'CS Lab 3', (SELECT id FROM users WHERE custom_id = 'FA-025'), NULL, NULL),
('SES-003', (SELECT id FROM users WHERE custom_id = 'TU-015'), (SELECT id FROM users WHERE custom_id = 'TE-235'), (SELECT id FROM subjects WHERE code = 'PROG 301'), 'Polymorphism', '2026-10-01', '10:00 AM', '1.5 hrs', 'upcoming', 'IT Building Rm 204', (SELECT id FROM users WHERE custom_id = 'FA-025'), NULL, NULL),
('SES-004', (SELECT id FROM users WHERE custom_id = 'TU-044'), (SELECT id FROM users WHERE custom_id = 'TE-220'), (SELECT id FROM subjects WHERE code = 'MATH 201'), 'Derivatives', '2026-10-01', '1:00 PM', '2 hrs', 'upcoming', 'Study Hall A', (SELECT id FROM users WHERE custom_id = 'FA-037'), NULL, NULL),
('SES-005', (SELECT id FROM users WHERE custom_id = 'TU-056'), (SELECT id FROM users WHERE custom_id = 'TE-215'), (SELECT id FROM subjects WHERE code = 'IT 101'), 'Flowcharting', '2026-10-02', '9:00 AM', '1 hr', 'upcoming', 'Library Study Room B', (SELECT id FROM users WHERE custom_id = 'FA-021'), NULL, NULL),
('SES-006', (SELECT id FROM users WHERE custom_id = 'TU-050'), (SELECT id FROM users WHERE custom_id = 'TE-210'), (SELECT id FROM subjects WHERE code = 'DBMS 301'), 'SQL Joins', '2026-10-02', '2:00 PM', '1.5 hrs', 'upcoming', 'CS Lab 1', (SELECT id FROM users WHERE custom_id = 'FA-029'), NULL, NULL),
('SES-007', (SELECT id FROM users WHERE custom_id = 'TU-031'), (SELECT id FROM users WHERE custom_id = 'TE-067'), (SELECT id FROM subjects WHERE code = 'ENGL 101'), 'Essay Argumentation', '2026-09-28', '3:00 PM', '1 hr', 'completed', 'Library Rm 102', (SELECT id FROM users WHERE custom_id = 'FA-045'), 5, NULL),
('SES-008', (SELECT id FROM users WHERE custom_id = 'TU-042'), (SELECT id FROM users WHERE custom_id = 'TE-178'), (SELECT id FROM subjects WHERE code = 'PROG 201'), 'Recursion Basics', '2026-09-27', '10:00 AM', '1.5 hrs', 'completed', 'Study Hall A', (SELECT id FROM users WHERE custom_id = 'FA-017'), 5, NULL),
('SES-009', (SELECT id FROM users WHERE custom_id = 'TU-050'), (SELECT id FROM users WHERE custom_id = 'TE-145'), (SELECT id FROM subjects WHERE code = 'NET 201'), 'Subnetting', '2026-09-26', '11:00 AM', '1.5 hrs', 'completed', 'IT Building Rm 201', (SELECT id FROM users WHERE custom_id = 'FA-021'), 4, NULL),
('SES-010', (SELECT id FROM users WHERE custom_id = 'TU-044'), (SELECT id FROM users WHERE custom_id = 'TE-092'), (SELECT id FROM subjects WHERE code = 'ACCT 102'), 'T-Accounts Review', '2026-09-25', '2:00 PM', '2 hrs', 'completed', 'Study Hall B', (SELECT id FROM users WHERE custom_id = 'FA-033'), 5, NULL),
('SES-011', (SELECT id FROM users WHERE custom_id = 'TU-015'), (SELECT id FROM users WHERE custom_id = 'TE-235'), (SELECT id FROM subjects WHERE code = 'PROG 301'), 'Inheritance Basics', '2026-09-24', '10:00 AM', '1.5 hrs', 'completed', 'CS Lab 2', (SELECT id FROM users WHERE custom_id = 'FA-025'), 5, NULL),
('SES-012', (SELECT id FROM users WHERE custom_id = 'TU-062'), (SELECT id FROM users WHERE custom_id = 'TE-210'), (SELECT id FROM subjects WHERE code = 'DBMS 301'), 'ER Diagrams', '2026-09-23', '1:00 PM', '1 hr', 'completed', 'IT Building Rm 204', (SELECT id FROM users WHERE custom_id = 'FA-029'), 4, NULL),
('SES-013', (SELECT id FROM users WHERE custom_id = 'TU-023'), (SELECT id FROM users WHERE custom_id = 'TE-201'), (SELECT id FROM subjects WHERE code = 'MATH 201'), 'Limits & Continuity', '2026-09-22', '11:00 AM', '1.5 hrs', 'completed', 'Study Hall B', (SELECT id FROM users WHERE custom_id = 'FA-037'), 4, NULL),
('SES-014', (SELECT id FROM users WHERE custom_id = 'TU-068'), (SELECT id FROM users WHERE custom_id = 'TE-245'), (SELECT id FROM subjects WHERE code = 'IT 101'), 'Hardware Components', '2026-09-20', '9:00 AM', '1 hr', 'completed', 'Library Study Room A', (SELECT id FROM users WHERE custom_id = 'FA-017'), 5, NULL),
('SES-015', (SELECT id FROM users WHERE custom_id = 'TU-038'), (SELECT id FROM users WHERE custom_id = 'TE-230'), (SELECT id FROM subjects WHERE code = 'MGMT 301'), 'Strategic Planning', '2026-09-21', '3:00 PM', '1 hr', 'cancelled', 'Study Hall A', (SELECT id FROM users WHERE custom_id = 'FA-049'), NULL, 'Learner conflict with exam schedule');

INSERT INTO session_check_ins (session_id, user_id, method)
VALUES
((SELECT id FROM sessions WHERE session_code = 'SES-007'), (SELECT id FROM users WHERE custom_id = 'TU-031'), 'qr'),
((SELECT id FROM sessions WHERE session_code = 'SES-007'), (SELECT id FROM users WHERE custom_id = 'TE-067'), 'qr'),
((SELECT id FROM sessions WHERE session_code = 'SES-008'), (SELECT id FROM users WHERE custom_id = 'TU-042'), 'otp'),
((SELECT id FROM sessions WHERE session_code = 'SES-008'), (SELECT id FROM users WHERE custom_id = 'TE-178'), 'otp');

INSERT INTO exam_questions (question_number, question, options, answer) VALUES
(1, 'What is the primary purpose of a peer tutoring program in an academic institution?', '["To replace faculty instruction", "To supplement learning through collaborative peer support", "To reduce the number of classes needed", "To evaluate faculty performance"]', 1),
(2, 'When a learner is struggling with a concept, the best approach is to:', '["Give them the answer directly", "Use guided questions to help them discover the answer", "Skip the topic and move on", "Tell them to read the textbook"]', 1),
(3, 'Which of the following best describes "active listening" in a tutoring context?', '["Waiting for your turn to speak", "Fully concentrating on the learnerNULLs words, understanding, and responding thoughtfully", "Taking notes silently", "Repeating everything the learner says"]', 1),
(4, 'If a learner reveals personal or emotional struggles during a session, you should:', '["Ignore it and continue tutoring", "Provide counseling advice", "Listen empathetically and refer them to the appropriate campus resource", "Post about it on social media"]', 2),
(5, 'The concept of "scaffolding" in education refers to:', '["Building a physical structure", "Providing temporary support that is gradually removed as the learner gains competence", "Giving increasingly difficult tasks without support", "Creating a strict curriculum"]', 1),
(6, 'What is the La Consolacion College BacolodNULLs core value that aligns with peer tutoring?', '["Competition", "Community and Service", "Isolation", "Profit"]', 1),
(7, 'When preparing for a tutoring session, a tutor should:', '["Wait for the learner to bring all materials", "Review the topic beforehand and prepare examples", "Only focus on topics they are comfortable with", "Cancel if they feel slightly unprepared"]', 1),
(8, 'A "growth mindset" in the context of tutoring means:', '["Believing intelligence is fixed", "Understanding that abilities can be developed through effort and strategies", "Focusing only on grades", "Avoiding challenges"]', 1),
(9, 'How should confidential student information be handled by an accredited tutor?', '["Shared freely with classmates", "Protected under FERPA/DPA and only discussed with authorized faculty", "Posted online for reference", "Discussed in group chats"]', 1),
(10, 'The incentive ledger system at LCCB rewards tutors with Community Points. What is the primary motivation behind this system?', '["To create competition among tutors", "To recognize and encourage sustained, high-quality peer mentorship", "To replace monetary compensation", "To track attendance only"]', 1),
(11, 'What is the recommended session length for effective peer tutoring at LCCB?', '["15 minutes", "30 minutes", "1 to 1.5 hours", "4 hours"]', 2),
(12, 'Which of the following is NOT an appropriate tutoring strategy?', '["Breaking problems into smaller steps", "Using analogies relevant to the learner", "Doing the learnerNULLs homework for them", "Encouraging the learner to practice independently"]', 2),
(13, 'When a learner is repeatedly late or absent to sessions, the tutor should:', '["Cancel all future sessions immediately", "Document the issue and report to the referring faculty member", "Complain to other students", "Ignore it and wait"]', 1),
(14, 'What does "differentiated instruction" mean in peer tutoring?', '["Teaching the same way regardless of the learner", "Adapting teaching methods to match the learnerNULLs learning style and pace", "Only tutoring advanced students", "Using textbooks exclusively"]', 1),
(15, 'The LCCB Academix platform uses a dual-confirmation check-in system. This ensures:', '["That the tutor gets paid", "That both tutor and learner verify session attendance for accurate records", "That the session happens online only", "That the faculty member is present"]', 1);

INSERT INTO rewards (reward_code, name, cost, category, icon, stock, description) VALUES
('RW-001', 'Campus Printing Credits (50 pages)', 200, 'Campus Perks', '🖨️', 45, 'Redeemable at the LCCB Computer Lab printing station.'),
('RW-002', 'LCCB Academix T-Shirt', 800, 'Merchandise', '👕', 20, 'Premium cotton tee with the Academix logo.'),
('RW-003', 'Cafeteria Meal Voucher', 150, 'Campus Perks', '🍽️', 100, 'Good for 1 meal at the LCCB cafeteria.'),
('RW-004', 'Library Extended Hours Pass', 100, 'Campus Perks', '📖', 30, 'Access the library until 10 PM for one week.'),
('RW-005', 'LCCB Tumbler', 500, 'Merchandise', '🥤', 15, 'Stainless steel tumbler with college seal.'),
('RW-006', 'Priority Class Registration', 1500, 'Exclusive', '⭐', 5, 'Register for classes 24 hours before general enrollment.'),
('RW-007', 'Parking Pass (1 Month)', 1200, 'Exclusive', '🅿️', 8, 'Reserved parking spot on campus for one month.'),
('RW-008', 'LCCB Hoodie', 1000, 'Merchandise', '🧥', 12, 'Premium embroidered hoodie in Navy Blue.'),
('RW-009', 'Free Photocopying (100 pages)', 120, 'Campus Perks', '📄', 60, 'Redeemable at the Campus Bookstore copier.'),
('RW-010', 'Tech Symposium VIP Pass', 600, 'Events', '🎟️', 25, 'VIP seating and networking access at the annual LCCB Tech Symposium.'),
('RW-011', 'LCCB Laptop Sleeve', 700, 'Merchandise', '💼', 18, 'Neoprene laptop sleeve with embroidered college crest.'),
('RW-012', 'DeanNULLs List Nomination Letter', 2000, 'Exclusive', '🏅', 3, 'Official commendation letter co-signed by the Dean for your portfolio.');

INSERT INTO badges (badge_code, name, icon, description) VALUES
('BG-001', 'First Session', '🌟', 'Completed your first tutoring session'),
('BG-002', 'Faculty Certified', '🏅', 'Passed the qualification exam'),
('BG-003', 'Rising Star', '⭐', '10+ sessions with 4.5+ rating'),
('BG-004', 'Community Champion', '🏆', '50+ sessions completed'),
('BG-005', 'Perfect Score', '💯', '100% on qualification exam'),
('BG-006', 'Subject Master', '📘', 'Tutored 3+ subjects'),
('BG-007', 'Marathon Mentor', '🏃', '100+ total hours tutored'),
('BG-008', 'Consistency King', '👑', '20 sessions in one month'),
('BG-009', 'Peer Favorite', '💖', '5.0 rating for 10+ consecutive sessions'),
('BG-010', 'IT Specialist', '💻', 'Certified in 2+ IT subjects');

INSERT INTO points_ledger (user_id, amount, description) VALUES
((SELECT id FROM users WHERE custom_id = 'TU-042'), 2450, 'Historical ledger entry'),
((SELECT id FROM users WHERE custom_id = 'TU-015'), 3100, 'Historical ledger entry'),
((SELECT id FROM users WHERE custom_id = 'TU-023'), 1680, 'Historical ledger entry'),
((SELECT id FROM users WHERE custom_id = 'TU-031'), 2100, 'Historical ledger entry'),
((SELECT id FROM users WHERE custom_id = 'TU-038'), 1420, 'Historical ledger entry'),
((SELECT id FROM users WHERE custom_id = 'TU-044'), 3680, 'Historical ledger entry'),
((SELECT id FROM users WHERE custom_id = 'TU-050'), 2280, 'Historical ledger entry'),
((SELECT id FROM users WHERE custom_id = 'TU-053'), 1920, 'Historical ledger entry'),
((SELECT id FROM users WHERE custom_id = 'TU-056'), 890, 'Historical ledger entry'),
((SELECT id FROM users WHERE custom_id = 'TU-059'), 1350, 'Historical ledger entry'),
((SELECT id FROM users WHERE custom_id = 'TU-062'), 3050, 'Historical ledger entry'),
((SELECT id FROM users WHERE custom_id = 'TU-065'), 1100, 'Historical ledger entry'),
((SELECT id FROM users WHERE custom_id = 'TU-068'), 760, 'Historical ledger entry');

INSERT INTO tutor_applications (application_code, user_id, exam_score, grades, achievements, status, date_applied) VALUES
('APP-001', (SELECT id FROM users WHERE custom_id = 'TU-068'), 92, '{"prelim": 90, "midterm": 93, "preFinal": 94, "final": 95}', '["DeanNULLs Lister (3 Consecutive Semesters)", "1st Place - Campus Cisco Networking Competition"]', 'pending', '2026-10-01'),
('APP-002', (SELECT id FROM users WHERE custom_id = 'TU-038'), 88, '{"prelim": 88, "midterm": 89, "preFinal": 90, "final": 91}', '["President, Junior Philippine Institute of Accountants (LCCB Chapter)", "Academic Scholar 2025-2026"]', 'pending', '2026-10-02');

INSERT INTO users (name, email, role, avatar, program, password_hash)
VALUES ('Camille Santos', 'c.santos@lccbacolod.edu.ph', 'learner', '👩‍🎓', 'BSED 2-A', '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu');

INSERT INTO tutor_applications (application_code, user_id, exam_score, grades, achievements, status, date_applied) VALUES
('APP-003', (SELECT id FROM users WHERE name = 'Camille Santos'), 95, '{"prelim": 95, "midterm": 96, "preFinal": 97, "final": 98}', '["Editor-in-Chief, Campus Publication", "Best Speaker, Regional Debate Championship"]', 'pending', '2026-10-02');

INSERT INTO application_subjects (application_id, subject_id)
SELECT a.id, s.id FROM tutor_applications a, subjects s WHERE a.application_code = 'APP-001' AND s.code IN ('NET 201', 'IT 101') UNION ALL
SELECT a.id, s.id FROM tutor_applications a, subjects s WHERE a.application_code = 'APP-002' AND s.code IN ('ACCT 102', 'MGMT 301') UNION ALL
SELECT a.id, s.id FROM tutor_applications a, subjects s WHERE a.application_code = 'APP-003' AND s.code IN ('ENGL 101');

COMMIT;

-- 001: hours remaining starts equal to hours required
UPDATE referrals SET hours_remaining = hours_required;

-- Learner joining bonus so the earn → redeem demo flow works right after reset
INSERT INTO points_ledger (user_id, amount, description)
SELECT id, 100, 'Academix joining bonus' FROM users WHERE role = 'learner';

COMMIT;