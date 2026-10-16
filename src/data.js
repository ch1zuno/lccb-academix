// LCCB Academix — Comprehensive Mock Data for Prototype
// La Consolacion College Bacolod — Faculty-Guided Peer Tutoring & Incentive Ledger

export const ROLES = {
  SUPERADMIN: 'superadmin',
  FACULTY: 'faculty',
  TUTOR: 'tutor',
  LEARNER: 'learner',
};

export const ROLE_LABELS = {
  [ROLES.SUPERADMIN]: 'Superadmin (Principal / Deans)',
  [ROLES.FACULTY]: 'Faculty Member / Academic Advisor',
  [ROLES.TUTOR]: 'Accredited Student Tutor',
  [ROLES.LEARNER]: 'Learner (Referred Student)',
};

export const ROLE_COLORS = {
  [ROLES.SUPERADMIN]: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  [ROLES.FACULTY]: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  [ROLES.TUTOR]: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  [ROLES.LEARNER]: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
};

// ─── USER PROFILES ───────────────────────────────────────────────
export const USERS = {
  superadmin: { id: 'SA-001', name: 'Sir Lenuel Betita', email: 'l.betita@lccbacolod.edu.ph', role: 'superadmin', avatar: '👨‍🏫', title: 'IT Department Head' },
  faculty: { id: 'FA-017', name: 'Mrs. Bethel Tisuela', email: 'b.tisuela@lccbacolod.edu.ph', role: 'faculty', avatar: '👩‍🏫', title: 'IT Department — Program Head' },
  tutor: { id: 'TU-042', name: 'Mark Antipo', email: 'm.antipo@lccbacolod.edu.ph', role: 'tutor', avatar: '🧑‍🎓', title: 'BSIT 3-A | Accredited Tutor', points: 2450, rating: 4.8, sessions: 67 },
  learner: { id: 'TE-128', name: 'Julian Gemelo', email: 'j.gemelo@lccbacolod.edu.ph', role: 'learner', avatar: '📚', title: 'BSIT 2-B | Student' },
};

// ─── FACULTY MEMBERS ─────────────────────────────────────────────
export const FACULTY = [
  // IT Department
  { id: 'FA-017', name: 'Mrs. Bethel Tisuela', email: 'b.tisuela@lccbacolod.edu.ph', dept: 'BSIT', title: 'IT Department — Program Head', avatar: '👩‍🏫', subjects: ['IT 101', 'PROG 201', 'PROG 301'], referrals: 14, status: 'active' },
  { id: 'FA-021', name: 'Sir Charles Torres', email: 'c.torres@lccbacolod.edu.ph', dept: 'BSIT', title: 'IT Department — Senior Faculty', avatar: '👨‍🏫', subjects: ['IT 101', 'NET 201', 'DBMS 301'], referrals: 11, status: 'active' },
  { id: 'FA-025', name: 'Sir Lenuel Betita', email: 'l.betita@lccbacolod.edu.ph', dept: 'BSIT', title: 'IT Department — Faculty', avatar: '👨‍🏫', subjects: ['PROG 201', 'WEB 301', 'PROG 301'], referrals: 8, status: 'active' },
  { id: 'FA-029', name: 'Sir Vincent Bonifacio', email: 'v.bonifacio@lccbacolod.edu.ph', dept: 'BSIT', title: 'IT Department — Faculty', avatar: '👨‍🏫', subjects: ['DBMS 301', 'IT 101', 'SYS 401'], referrals: 9, status: 'active' },
  // Other Departments
  { id: 'FA-033', name: 'Prof. Ricardo Santos', email: 'r.santos@lccbacolod.edu.ph', dept: 'BSA', title: 'Accounting Department', avatar: '👨‍🏫', subjects: ['ACCT 102', 'FIN 301'], referrals: 7, status: 'active' },
  { id: 'FA-037', name: 'Prof. Elena Marcos', email: 'e.marcos@lccbacolod.edu.ph', dept: 'General', title: 'Mathematics Department', avatar: '👩‍🏫', subjects: ['MATH 201', 'STAT 101'], referrals: 5, status: 'active' },
  { id: 'FA-041', name: 'Prof. James Navarro', email: 'j.navarro@lccbacolod.edu.ph', dept: 'BSIT', title: 'IT Department — Adjunct', avatar: '👨‍🏫', subjects: ['PROG 201'], referrals: 3, status: 'active' },
  { id: 'FA-045', name: 'Prof. Carmen Villanueva', email: 'c.villanueva@lccbacolod.edu.ph', dept: 'General', title: 'English Department', avatar: '👩‍🏫', subjects: ['ENGL 101'], referrals: 4, status: 'active' },
  { id: 'FA-049', name: 'Prof. Antonio Lacson', email: 'a.lacson@lccbacolod.edu.ph', dept: 'BSBA', title: 'Business Administration Dept.', avatar: '👨‍🏫', subjects: ['MGMT 301', 'MKT 201'], referrals: 6, status: 'active' },
];

// ─── SUBJECTS ────────────────────────────────────────────────────
export const SUBJECTS = [
  { code: 'IT 101', name: 'Introduction to Computing', dept: 'BSIT' },
  { code: 'PROG 201', name: 'Data Structures & Algorithms', dept: 'BSIT' },
  { code: 'PROG 301', name: 'Object-Oriented Programming', dept: 'BSIT' },
  { code: 'WEB 301', name: 'Web Development', dept: 'BSIT' },
  { code: 'DBMS 301', name: 'Database Management Systems', dept: 'BSIT' },
  { code: 'NET 201', name: 'Networking Fundamentals', dept: 'BSIT' },
  { code: 'SYS 401', name: 'Systems Analysis & Design', dept: 'BSIT' },
  { code: 'ACCT 102', name: 'Fundamentals of Accounting', dept: 'BSA' },
  { code: 'MATH 201', name: 'Calculus I', dept: 'General' },
  { code: 'ENGL 101', name: 'English Communication', dept: 'General' },
  { code: 'FIN 301', name: 'Financial Management', dept: 'BSA' },
  { code: 'STAT 101', name: 'Probability & Statistics', dept: 'General' },
  { code: 'MGMT 301', name: 'Principles of Management', dept: 'BSBA' },
  { code: 'MKT 201', name: 'Marketing Management', dept: 'BSBA' },
  { code: 'FIL 102', name: 'Filipino sa Iba\'t Ibang Disiplina', dept: 'General' },
  { code: 'STS 101', name: 'Science, Technology & Society', dept: 'General' },
];

// ─── TUTORS (Accredited Student Tutors) ──────────────────────────
export const TUTORS = [
  { id: 'TU-042', name: 'Mark Antipo', avatar: '🧑‍🎓', program: 'BSIT 3-A', subjects: ['IT 101', 'PROG 201'], rating: 4.8, sessions: 67, points: 2450, rate: 15, available: true, verified: true, bio: 'Dean\'s Lister | Passionate about helping fellow Consolacionians excel in Computing.', certifiedBy: 'Mrs. Bethel Tisuela' },
  { id: 'TU-015', name: 'Angela Delos Santos', avatar: '👩‍🎓', program: 'BSIT 4-A', subjects: ['PROG 201', 'PROG 301', 'WEB 301'], rating: 4.9, sessions: 82, points: 3100, rate: 20, available: true, verified: true, bio: 'Best in Programming awardee. Specializes in Python, Java & Web Dev tutoring.', certifiedBy: 'Sir Lenuel Betita' },
  { id: 'TU-023', name: 'Carlos Villanueva', avatar: '👨‍🎓', program: 'BSIT 3-B', subjects: ['MATH 201', 'STAT 101'], rating: 4.6, sessions: 43, points: 1680, rate: 15, available: false, verified: true, bio: 'Math Olympiad semi-finalist. Makes Calculus understandable.', certifiedBy: 'Prof. Elena Marcos' },
  { id: 'TU-031', name: 'Patricia Reyes', avatar: '👩‍🎓', program: 'BSED 3-A', subjects: ['ENGL 101', 'FIL 102'], rating: 4.7, sessions: 55, points: 2100, rate: 12, available: true, verified: true, bio: 'Published poet and campus journalist. Can help you write anything.', certifiedBy: 'Prof. Carmen Villanueva' },
  { id: 'TU-038', name: 'Jerome Lacson', avatar: '🧑‍🎓', program: 'BSA 3-A', subjects: ['ACCT 102', 'MGMT 301'], rating: 4.5, sessions: 38, points: 1420, rate: 15, available: true, verified: false, bio: 'Aspiring CPA with hands-on experience in bookkeeping.', certifiedBy: 'Prof. Ricardo Santos' },
  { id: 'TU-044', name: 'Sofia Mendoza', avatar: '👩‍🎓', program: 'BSA 4-A', subjects: ['MATH 201', 'FIN 301', 'ACCT 102'], rating: 4.9, sessions: 91, points: 3680, rate: 25, available: true, verified: true, bio: 'Top scorer in board exam practice. Finance & Math double expertise.', certifiedBy: 'Prof. Ricardo Santos' },
  { id: 'TU-050', name: 'Renzo Gabriel Tan', avatar: '👨‍🎓', program: 'BSIT 4-B', subjects: ['DBMS 301', 'IT 101', 'NET 201'], rating: 4.7, sessions: 59, points: 2280, rate: 18, available: true, verified: true, bio: 'Database enthusiast. Oracle & MySQL certified. Networking nerd.', certifiedBy: 'Sir Vincent Bonifacio' },
  { id: 'TU-053', name: 'Kimberly Anne Flores', avatar: '👩‍🎓', program: 'BSIT 3-A', subjects: ['WEB 301', 'PROG 301'], rating: 4.8, sessions: 46, points: 1920, rate: 18, available: true, verified: true, bio: 'Full-stack web developer. React & Node.js specialist.', certifiedBy: 'Sir Lenuel Betita' },
  { id: 'TU-056', name: 'Miguel Angelo Cruz', avatar: '🧑‍🎓', program: 'BSIT 2-A', subjects: ['IT 101', 'PROG 201'], rating: 4.4, sessions: 21, points: 890, rate: 12, available: true, verified: true, bio: 'Rising sophomore tutor. Patient with beginners.', certifiedBy: 'Sir Charles Torres' },
  { id: 'TU-059', name: 'Jasmine Lim', avatar: '👩‍🎓', program: 'BSA 3-B', subjects: ['ACCT 102', 'FIN 301'], rating: 4.6, sessions: 33, points: 1350, rate: 15, available: false, verified: true, bio: 'Financial analysis whiz. Dean\'s Lister for 4 consecutive terms.', certifiedBy: 'Prof. Ricardo Santos' },
  { id: 'TU-062', name: 'John Patrick Navarro', avatar: '👨‍🎓', program: 'BSIT 4-A', subjects: ['SYS 401', 'DBMS 301', 'PROG 301'], rating: 4.9, sessions: 78, points: 3050, rate: 22, available: true, verified: true, bio: 'Systems analyst intern at a local tech company. Capstone mentor.', certifiedBy: 'Sir Vincent Bonifacio' },
  { id: 'TU-065', name: 'Maria Cecilia Santos', avatar: '👩‍🎓', program: 'BSBA 3-A', subjects: ['MGMT 301', 'MKT 201'], rating: 4.5, sessions: 28, points: 1100, rate: 12, available: true, verified: true, bio: 'Business plan competition winner. Loves strategic management.', certifiedBy: 'Prof. Antonio Lacson' },
  { id: 'TU-068', name: 'Francis Dela Peña', avatar: '🧑‍🎓', program: 'BSIT 3-B', subjects: ['NET 201', 'IT 101'], rating: 4.3, sessions: 19, points: 760, rate: 12, available: true, verified: false, bio: 'Cisco Networking Academy student. Passionate about infrastructure.', certifiedBy: 'Sir Charles Torres' },
];

// ─── STUDENTS (Learners / Referred Students) ───────────────────────
export const STUDENTS = [
  { id: 'TE-128', name: 'Julian Gemelo', program: 'BSIT 2-B', email: 'j.gemelo@lccbacolod.edu.ph', referredBy: 'Mrs. Bethel Tisuela' },
  { id: 'TE-092', name: 'Maria Luisa Tan', program: 'BSA 1-A', email: 'ml.tan@lccbacolod.edu.ph', referredBy: 'Prof. Ricardo Santos' },
  { id: 'TE-145', name: 'Rafael Cruz', program: 'BSIT 3-A', email: 'r.cruz@lccbacolod.edu.ph', referredBy: 'Sir Charles Torres' },
  { id: 'TE-067', name: 'Anna Garcia', program: 'BSBA 2-C', email: 'a.garcia@lccbacolod.edu.ph', referredBy: 'Prof. Carmen Villanueva' },
  { id: 'TE-201', name: 'Miguel Santos', program: 'BSA 2-A', email: 'm.santos@lccbacolod.edu.ph', referredBy: 'Prof. Ricardo Santos' },
  { id: 'TE-178', name: 'Bianca Lopez', program: 'BSIT 1-B', email: 'b.lopez@lccbacolod.edu.ph', referredBy: 'Sir Lenuel Betita' },
  { id: 'TE-203', name: 'Kenneth James Reyes', program: 'BSIT 1-A', email: 'kj.reyes@lccbacolod.edu.ph', referredBy: 'Mrs. Bethel Tisuela' },
  { id: 'TE-210', name: 'Christine Joy Lacson', program: 'BSIT 2-A', email: 'cj.lacson@lccbacolod.edu.ph', referredBy: 'Sir Vincent Bonifacio' },
  { id: 'TE-215', name: 'Aaron Paul Mendoza', program: 'BSIT 1-B', email: 'ap.mendoza@lccbacolod.edu.ph', referredBy: 'Sir Charles Torres' },
  { id: 'TE-220', name: 'Samantha Nicole Tan', program: 'BSA 1-B', email: 'sn.tan@lccbacolod.edu.ph', referredBy: 'Prof. Ricardo Santos' },
  { id: 'TE-225', name: 'Gabriel Luis Navarro', program: 'BSIT 2-B', email: 'gl.navarro@lccbacolod.edu.ph', referredBy: 'Sir Lenuel Betita' },
  { id: 'TE-230', name: 'Isabelle Marie Cruz', program: 'BSBA 1-A', email: 'im.cruz@lccbacolod.edu.ph', referredBy: 'Prof. Antonio Lacson' },
  { id: 'TE-235', name: 'Daniel Marco Flores', program: 'BSIT 3-B', email: 'dm.flores@lccbacolod.edu.ph', referredBy: 'Sir Vincent Bonifacio' },
  { id: 'TE-240', name: 'Princess Mae Gonzales', program: 'BSA 2-B', email: 'pm.gonzales@lccbacolod.edu.ph', referredBy: 'Prof. Elena Marcos' },
  { id: 'TE-245', name: 'Joshua Carlo Dela Cruz', program: 'BSIT 1-A', email: 'jc.delacruz@lccbacolod.edu.ph', referredBy: 'Mrs. Bethel Tisuela' },
];

// ─── REFERRALS ───────────────────────────────────────────────────
export const REFERRALS = [
  { id: 'REF-001', student: 'Julian Gemelo', studentId: 'TE-128', subject: 'PROG 201', topic: 'Linked Lists & Pointers', urgency: 'high', faculty: 'Mrs. Bethel Tisuela', status: 'flagged', date: '2026-09-28', notes: 'Consistently failing lab exercises. Cannot implement basic data structures.', hoursRequired: 6 },
  { id: 'REF-002', student: 'Kenneth James Reyes', studentId: 'TE-203', subject: 'IT 101', topic: 'Binary & Number Systems', urgency: 'high', faculty: 'Sir Charles Torres', status: 'flagged', date: '2026-09-27', notes: 'Failed Quiz 1 and Quiz 2. Needs foundational help with number conversions.', hoursRequired: 4 },
  { id: 'REF-003', student: 'Christine Joy Lacson', studentId: 'TE-210', subject: 'DBMS 301', topic: 'SQL Joins & Normalization', urgency: 'medium', faculty: 'Sir Vincent Bonifacio', status: 'flagged', date: '2026-09-26', notes: 'Struggles with complex JOIN queries and 3NF normalization.', hoursRequired: 5 },
  { id: 'REF-004', student: 'Aaron Paul Mendoza', studentId: 'TE-215', subject: 'IT 101', topic: 'Flowcharting & Pseudocode', urgency: 'medium', faculty: 'Sir Charles Torres', status: 'assigned', date: '2026-09-25', notes: 'Missed 3 classes due to illness. Needs catch-up on logic fundamentals.', assignedTutor: 'Miguel Angelo Cruz', hoursRequired: 3 },
  { id: 'REF-005', student: 'Gabriel Luis Navarro', studentId: 'TE-225', subject: 'WEB 301', topic: 'JavaScript DOM Manipulation', urgency: 'high', faculty: 'Sir Lenuel Betita', status: 'assigned', date: '2026-09-24', notes: 'Cannot complete lab exercises independently. Zero scores on JS assignments.', assignedTutor: 'Kimberly Anne Flores', hoursRequired: 6 },
  { id: 'REF-006', student: 'Daniel Marco Flores', studentId: 'TE-235', subject: 'PROG 301', topic: 'Inheritance & Polymorphism', urgency: 'medium', faculty: 'Sir Lenuel Betita', status: 'in-progress', date: '2026-09-22', notes: 'Understands basic OOP but fails to apply inheritance patterns.', assignedTutor: 'Angela Delos Santos', hoursRequired: 4, hoursCompleted: 2 },
  { id: 'REF-007', student: 'Bianca Lopez', studentId: 'TE-178', subject: 'PROG 201', topic: 'Recursion', urgency: 'low', faculty: 'Mrs. Bethel Tisuela', status: 'in-progress', date: '2026-09-20', notes: 'Grasps iteration but needs help transitioning to recursive thinking.', assignedTutor: 'Mark Antipo', hoursRequired: 3, hoursCompleted: 1.5 },
  { id: 'REF-008', student: 'Maria Luisa Tan', studentId: 'TE-092', subject: 'ACCT 102', topic: 'Journal Entries & T-Accounts', urgency: 'medium', faculty: 'Prof. Ricardo Santos', status: 'in-progress', date: '2026-09-18', notes: 'Shows potential but confuses debit/credit placements consistently.', assignedTutor: 'Sofia Mendoza', hoursRequired: 4, hoursCompleted: 3 },
  { id: 'REF-009', student: 'Anna Garcia', studentId: 'TE-067', subject: 'ENGL 101', topic: 'Essay Writing & Argumentation', urgency: 'medium', faculty: 'Prof. Carmen Villanueva', status: 'resolved', date: '2026-09-10', notes: 'Improved significantly after 3 sessions. Essay score went from 62% to 88%.', assignedTutor: 'Patricia Reyes', hoursRequired: 4, hoursCompleted: 4 },
  { id: 'REF-010', student: 'Rafael Cruz', studentId: 'TE-145', subject: 'NET 201', topic: 'Subnetting & IP Addressing', urgency: 'low', faculty: 'Sir Charles Torres', status: 'resolved', date: '2026-09-08', notes: 'Now scoring above average. Great improvement in lab performance.', assignedTutor: 'Renzo Gabriel Tan', hoursRequired: 3, hoursCompleted: 3 },
  { id: 'REF-011', student: 'Samantha Nicole Tan', studentId: 'TE-220', subject: 'MATH 201', topic: 'Derivatives & Integration', urgency: 'high', faculty: 'Prof. Elena Marcos', status: 'assigned', date: '2026-09-29', notes: 'Failed midterm exam. At risk of failing the semester.', assignedTutor: 'Sofia Mendoza', hoursRequired: 8 },
  { id: 'REF-012', student: 'Joshua Carlo Dela Cruz', studentId: 'TE-245', subject: 'IT 101', topic: 'Computer Hardware Components', urgency: 'low', faculty: 'Mrs. Bethel Tisuela', status: 'resolved', date: '2026-09-05', notes: 'Quick learner. Passed retest with 90% after 2 sessions.', assignedTutor: 'Francis Dela Peña', hoursRequired: 2, hoursCompleted: 2 },
];

// ─── SESSIONS ────────────────────────────────────────────────────
export const SESSIONS = [
  { id: 'SES-001', tutor: 'Mark Antipo', tutorId: 'TU-042', learner: 'Julian Gemelo', learnerId: 'TE-128', subject: 'PROG 201', topic: 'Linked Lists', date: '2026-09-30', time: '2:00 PM', duration: '1.5 hrs', status: 'upcoming', location: 'Library Study Room A', faculty: 'Mrs. Bethel Tisuela' },
  { id: 'SES-002', tutor: 'Kimberly Anne Flores', tutorId: 'TU-053', learner: 'Gabriel Luis Navarro', learnerId: 'TE-225', subject: 'WEB 301', topic: 'DOM Manipulation', date: '2026-09-30', time: '3:30 PM', duration: '2 hrs', status: 'upcoming', location: 'CS Lab 3', faculty: 'Sir Lenuel Betita' },
  { id: 'SES-003', tutor: 'Angela Delos Santos', tutorId: 'TU-015', learner: 'Daniel Marco Flores', learnerId: 'TE-235', subject: 'PROG 301', topic: 'Polymorphism', date: '2026-10-01', time: '10:00 AM', duration: '1.5 hrs', status: 'upcoming', location: 'IT Building Rm 204', faculty: 'Sir Lenuel Betita' },
  { id: 'SES-004', tutor: 'Sofia Mendoza', tutorId: 'TU-044', learner: 'Samantha Nicole Tan', learnerId: 'TE-220', subject: 'MATH 201', topic: 'Derivatives', date: '2026-10-01', time: '1:00 PM', duration: '2 hrs', status: 'upcoming', location: 'Study Hall A', faculty: 'Prof. Elena Marcos' },
  { id: 'SES-005', tutor: 'Miguel Angelo Cruz', tutorId: 'TU-056', learner: 'Aaron Paul Mendoza', learnerId: 'TE-215', subject: 'IT 101', topic: 'Flowcharting', date: '2026-10-02', time: '9:00 AM', duration: '1 hr', status: 'upcoming', location: 'Library Study Room B', faculty: 'Sir Charles Torres' },
  { id: 'SES-006', tutor: 'Renzo Gabriel Tan', tutorId: 'TU-050', learner: 'Christine Joy Lacson', learnerId: 'TE-210', subject: 'DBMS 301', topic: 'SQL Joins', date: '2026-10-02', time: '2:00 PM', duration: '1.5 hrs', status: 'upcoming', location: 'CS Lab 1', faculty: 'Sir Vincent Bonifacio' },
  // Completed Sessions
  { id: 'SES-007', tutor: 'Patricia Reyes', tutorId: 'TU-031', learner: 'Anna Garcia', learnerId: 'TE-067', subject: 'ENGL 101', topic: 'Essay Argumentation', date: '2026-09-28', time: '3:00 PM', duration: '1 hr', status: 'completed', location: 'Library Rm 102', rating: 5, faculty: 'Prof. Carmen Villanueva', pointsAwarded: 50 },
  { id: 'SES-008', tutor: 'Mark Antipo', tutorId: 'TU-042', learner: 'Bianca Lopez', learnerId: 'TE-178', subject: 'PROG 201', topic: 'Recursion Basics', date: '2026-09-27', time: '10:00 AM', duration: '1.5 hrs', status: 'completed', location: 'Study Hall A', rating: 5, faculty: 'Mrs. Bethel Tisuela', pointsAwarded: 75 },
  { id: 'SES-009', tutor: 'Renzo Gabriel Tan', tutorId: 'TU-050', learner: 'Rafael Cruz', learnerId: 'TE-145', subject: 'NET 201', topic: 'Subnetting', date: '2026-09-26', time: '11:00 AM', duration: '1.5 hrs', status: 'completed', location: 'IT Building Rm 201', rating: 4, faculty: 'Sir Charles Torres', pointsAwarded: 50 },
  { id: 'SES-010', tutor: 'Sofia Mendoza', tutorId: 'TU-044', learner: 'Maria Luisa Tan', learnerId: 'TE-092', subject: 'ACCT 102', topic: 'T-Accounts Review', date: '2026-09-25', time: '2:00 PM', duration: '2 hrs', status: 'completed', location: 'Study Hall B', rating: 5, faculty: 'Prof. Ricardo Santos', pointsAwarded: 100 },
  { id: 'SES-011', tutor: 'Angela Delos Santos', tutorId: 'TU-015', learner: 'Daniel Marco Flores', learnerId: 'TE-235', subject: 'PROG 301', topic: 'Inheritance Basics', date: '2026-09-24', time: '10:00 AM', duration: '1.5 hrs', status: 'completed', location: 'CS Lab 2', rating: 5, faculty: 'Sir Lenuel Betita', pointsAwarded: 75 },
  { id: 'SES-012', tutor: 'John Patrick Navarro', tutorId: 'TU-062', learner: 'Christine Joy Lacson', learnerId: 'TE-210', subject: 'DBMS 301', topic: 'ER Diagrams', date: '2026-09-23', time: '1:00 PM', duration: '1 hr', status: 'completed', location: 'IT Building Rm 204', rating: 4, faculty: 'Sir Vincent Bonifacio', pointsAwarded: 50 },
  { id: 'SES-013', tutor: 'Carlos Villanueva', tutorId: 'TU-023', learner: 'Miguel Santos', learnerId: 'TE-201', subject: 'MATH 201', topic: 'Limits & Continuity', date: '2026-09-22', time: '11:00 AM', duration: '1.5 hrs', status: 'completed', location: 'Study Hall B', rating: 4, faculty: 'Prof. Elena Marcos', pointsAwarded: 75 },
  { id: 'SES-014', tutor: 'Francis Dela Peña', tutorId: 'TU-068', learner: 'Joshua Carlo Dela Cruz', learnerId: 'TE-245', subject: 'IT 101', topic: 'Hardware Components', date: '2026-09-20', time: '9:00 AM', duration: '1 hr', status: 'completed', location: 'Library Study Room A', rating: 5, faculty: 'Mrs. Bethel Tisuela', pointsAwarded: 50 },
  // Cancelled
  { id: 'SES-015', tutor: 'Jerome Lacson', tutorId: 'TU-038', learner: 'Isabelle Marie Cruz', learnerId: 'TE-230', subject: 'MGMT 301', topic: 'Strategic Planning', date: '2026-09-21', time: '3:00 PM', duration: '1 hr', status: 'cancelled', location: 'Study Hall A', cancelReason: 'Learner conflict with exam schedule', faculty: 'Prof. Antonio Lacson' },
];

// ─── EXAM QUESTIONS ──────────────────────────────────────────────
export const EXAM_QUESTIONS = [
  { id: 1, question: 'What is the primary purpose of a peer tutoring program in an academic institution?', options: ['To replace faculty instruction', 'To supplement learning through collaborative peer support', 'To reduce the number of classes needed', 'To evaluate faculty performance'], answer: 1 },
  { id: 2, question: 'When a learner is struggling with a concept, the best approach is to:', options: ['Give them the answer directly', 'Use guided questions to help them discover the answer', 'Skip the topic and move on', 'Tell them to read the textbook'], answer: 1 },
  { id: 3, question: 'Which of the following best describes "active listening" in a tutoring context?', options: ['Waiting for your turn to speak', 'Fully concentrating on the learner\'s words, understanding, and responding thoughtfully', 'Taking notes silently', 'Repeating everything the learner says'], answer: 1 },
  { id: 4, question: 'If a learner reveals personal or emotional struggles during a session, you should:', options: ['Ignore it and continue tutoring', 'Provide counseling advice', 'Listen empathetically and refer them to the appropriate campus resource', 'Post about it on social media'], answer: 2 },
  { id: 5, question: 'The concept of "scaffolding" in education refers to:', options: ['Building a physical structure', 'Providing temporary support that is gradually removed as the learner gains competence', 'Giving increasingly difficult tasks without support', 'Creating a strict curriculum'], answer: 1 },
  { id: 6, question: 'What is the La Consolacion College Bacolod\'s core value that aligns with peer tutoring?', options: ['Competition', 'Community and Service', 'Isolation', 'Profit'], answer: 1 },
  { id: 7, question: 'When preparing for a tutoring session, a tutor should:', options: ['Wait for the learner to bring all materials', 'Review the topic beforehand and prepare examples', 'Only focus on topics they are comfortable with', 'Cancel if they feel slightly unprepared'], answer: 1 },
  { id: 8, question: 'A "growth mindset" in the context of tutoring means:', options: ['Believing intelligence is fixed', 'Understanding that abilities can be developed through effort and strategies', 'Focusing only on grades', 'Avoiding challenges'], answer: 1 },
  { id: 9, question: 'How should confidential student information be handled by an accredited tutor?', options: ['Shared freely with classmates', 'Protected under FERPA/DPA and only discussed with authorized faculty', 'Posted online for reference', 'Discussed in group chats'], answer: 1 },
  { id: 10, question: 'The incentive ledger system at LCCB rewards tutors with Community Points. What is the primary motivation behind this system?', options: ['To create competition among tutors', 'To recognize and encourage sustained, high-quality peer mentorship', 'To replace monetary compensation', 'To track attendance only'], answer: 1 },
  { id: 11, question: 'What is the recommended session length for effective peer tutoring at LCCB?', options: ['15 minutes', '30 minutes', '1 to 1.5 hours', '4 hours'], answer: 2 },
  { id: 12, question: 'Which of the following is NOT an appropriate tutoring strategy?', options: ['Breaking problems into smaller steps', 'Using analogies relevant to the learner', 'Doing the learner\'s homework for them', 'Encouraging the learner to practice independently'], answer: 2 },
  { id: 13, question: 'When a learner is repeatedly late or absent to sessions, the tutor should:', options: ['Cancel all future sessions immediately', 'Document the issue and report to the referring faculty member', 'Complain to other students', 'Ignore it and wait'], answer: 1 },
  { id: 14, question: 'What does "differentiated instruction" mean in peer tutoring?', options: ['Teaching the same way regardless of the learner', 'Adapting teaching methods to match the learner\'s learning style and pace', 'Only tutoring advanced students', 'Using textbooks exclusively'], answer: 1 },
  { id: 15, question: 'The LCCB Academix platform uses a dual-confirmation check-in system. This ensures:', options: ['That the tutor gets paid', 'That both tutor and learner verify session attendance for accurate records', 'That the session happens online only', 'That the faculty member is present'], answer: 1 },
];

// ─── REWARDS ─────────────────────────────────────────────────────
export const REWARDS = [
  { id: 'RW-001', name: 'Campus Printing Credits (50 pages)', cost: 200, category: 'Campus Perks', icon: '🖨️', stock: 45, description: 'Redeemable at the LCCB Computer Lab printing station.' },
  { id: 'RW-002', name: 'LCCB Academix T-Shirt', cost: 800, category: 'Merchandise', icon: '👕', stock: 20, description: 'Premium cotton tee with the Academix logo.' },
  { id: 'RW-003', name: 'Cafeteria Meal Voucher', cost: 150, category: 'Campus Perks', icon: '🍽️', stock: 100, description: 'Good for 1 meal at the LCCB cafeteria.' },
  { id: 'RW-004', name: 'Library Extended Hours Pass', cost: 100, category: 'Campus Perks', icon: '📖', stock: 30, description: 'Access the library until 10 PM for one week.' },
  { id: 'RW-005', name: 'LCCB Tumbler', cost: 500, category: 'Merchandise', icon: '🥤', stock: 15, description: 'Stainless steel tumbler with college seal.' },
  { id: 'RW-006', name: 'Priority Class Registration', cost: 1500, category: 'Exclusive', icon: '⭐', stock: 5, description: 'Register for classes 24 hours before general enrollment.' },
  { id: 'RW-007', name: 'Parking Pass (1 Month)', cost: 1200, category: 'Exclusive', icon: '🅿️', stock: 8, description: 'Reserved parking spot on campus for one month.' },
  { id: 'RW-008', name: 'LCCB Hoodie', cost: 1000, category: 'Merchandise', icon: '🧥', stock: 12, description: 'Premium embroidered hoodie in Navy Blue.' },
  { id: 'RW-009', name: 'Free Photocopying (100 pages)', cost: 120, category: 'Campus Perks', icon: '📄', stock: 60, description: 'Redeemable at the Campus Bookstore copier.' },
  { id: 'RW-010', name: 'Tech Symposium VIP Pass', cost: 600, category: 'Events', icon: '🎟️', stock: 25, description: 'VIP seating and networking access at the annual LCCB Tech Symposium.' },
  { id: 'RW-011', name: 'LCCB Laptop Sleeve', cost: 700, category: 'Merchandise', icon: '💼', stock: 18, description: 'Neoprene laptop sleeve with embroidered college crest.' },
  { id: 'RW-012', name: 'Dean\'s List Nomination Letter', cost: 2000, category: 'Exclusive', icon: '🏅', stock: 3, description: 'Official commendation letter co-signed by the Dean for your portfolio.' },
];

// ─── BADGES ──────────────────────────────────────────────────────
export const BADGES = [
  { id: 'BG-001', name: 'First Session', icon: '🌟', description: 'Completed your first tutoring session', earned: true },
  { id: 'BG-002', name: 'Faculty Certified', icon: '🏅', description: 'Passed the qualification exam', earned: true },
  { id: 'BG-003', name: 'Rising Star', icon: '⭐', description: '10+ sessions with 4.5+ rating', earned: true },
  { id: 'BG-004', name: 'Community Champion', icon: '🏆', description: '50+ sessions completed', earned: true },
  { id: 'BG-005', name: 'Perfect Score', icon: '💯', description: '100% on qualification exam', earned: false },
  { id: 'BG-006', name: 'Subject Master', icon: '📘', description: 'Tutored 3+ subjects', earned: false },
  { id: 'BG-007', name: 'Marathon Mentor', icon: '🏃', description: '100+ total hours tutored', earned: true },
  { id: 'BG-008', name: 'Consistency King', icon: '👑', description: '20 sessions in one month', earned: false },
  { id: 'BG-009', name: 'Peer Favorite', icon: '💖', description: '5.0 rating for 10+ consecutive sessions', earned: false },
  { id: 'BG-010', name: 'IT Specialist', icon: '💻', description: 'Certified in 2+ IT subjects', earned: true },
];

// ─── CHART DATA ──────────────────────────────────────────────────
export const CHART_DATA_HOURS = [
  { month: 'Apr', hours: 120 },
  { month: 'May', hours: 185 },
  { month: 'Jun', hours: 145 },
  { month: 'Jul', hours: 210 },
  { month: 'Aug', hours: 278 },
  { month: 'Sep', hours: 340 },
];

export const CHART_DATA_SESSIONS = [
  { week: 'W1', sessions: 32, referrals: 8 },
  { week: 'W2', sessions: 45, referrals: 12 },
  { week: 'W3', sessions: 38, referrals: 6 },
  { week: 'W4', sessions: 52, referrals: 15 },
];

export const CHART_DATA_BY_DEPT = [
  { dept: 'BSIT', sessions: 145, students: 48 },
  { dept: 'BSA', sessions: 87, students: 32 },
  { dept: 'BSBA', sessions: 42, students: 18 },
  { dept: 'BSED', sessions: 28, students: 12 },
  { dept: 'General', sessions: 56, students: 24 },
];

export const CHART_DATA_RECOVERY = [
  { month: 'Apr', passRate: 72, referredCount: 18 },
  { month: 'May', passRate: 78, referredCount: 22 },
  { month: 'Jun', passRate: 81, referredCount: 15 },
  { month: 'Jul', passRate: 84, referredCount: 25 },
  { month: 'Aug', passRate: 85, referredCount: 30 },
  { month: 'Sep', passRate: 87, referredCount: 28 },
];

// ─── LEADERBOARD ─────────────────────────────────────────────────
export const LEADERBOARD = [
  { rank: 1, name: 'Sofia Mendoza', program: 'BSA 4-A', points: 3680, sessions: 91, rating: 4.9, avatar: '👩‍🎓' },
  { rank: 2, name: 'Angela Delos Santos', program: 'BSIT 4-A', points: 3100, sessions: 82, rating: 4.9, avatar: '👩‍🎓' },
  { rank: 3, name: 'John Patrick Navarro', program: 'BSIT 4-A', points: 3050, sessions: 78, rating: 4.9, avatar: '👨‍🎓' },
  { rank: 4, name: 'Mark Antipo', program: 'BSIT 3-A', points: 2450, sessions: 67, rating: 4.8, avatar: '🧑‍🎓' },
  { rank: 5, name: 'Renzo Gabriel Tan', program: 'BSIT 4-B', points: 2280, sessions: 59, rating: 4.7, avatar: '👨‍🎓' },
  { rank: 6, name: 'Patricia Reyes', program: 'BSED 3-A', points: 2100, sessions: 55, rating: 4.7, avatar: '👩‍🎓' },
  { rank: 7, name: 'Kimberly Anne Flores', program: 'BSIT 3-A', points: 1920, sessions: 46, rating: 4.8, avatar: '👩‍🎓' },
  { rank: 8, name: 'Carlos Villanueva', program: 'BSIT 3-B', points: 1680, sessions: 43, rating: 4.6, avatar: '👨‍🎓' },
  { rank: 9, name: 'Jerome Lacson', program: 'BSA 3-A', points: 1420, sessions: 38, rating: 4.5, avatar: '🧑‍🎓' },
  { rank: 10, name: 'Jasmine Lim', program: 'BSA 3-B', points: 1350, sessions: 33, rating: 4.6, avatar: '👩‍🎓' },
];

// ─── NOTIFICATIONS ───────────────────────────────────────────────
export const NOTIFICATIONS = [
  { id: 1, type: 'warning', message: 'New high-urgency referral from Mrs. Bethel Tisuela for Julian Gemelo (PROG 201)', time: '5 min ago', read: false },
  { id: 2, type: 'info', message: 'Sir Charles Torres referred Kenneth James Reyes for IT 101 tutoring', time: '25 min ago', read: false },
  { id: 3, type: 'success', message: 'Session with Bianca Lopez completed — +75 pts credited to Mark Antipo', time: '1 hr ago', read: false },
  { id: 4, type: 'info', message: 'Sir Lenuel Betita assigned Kimberly Anne Flores to Gabriel Luis Navarro', time: '2 hrs ago', read: true },
  { id: 5, type: 'success', message: 'Anna Garcia resolved referral — Essay score improved from 62% to 88%', time: '3 hrs ago', read: true },
  { id: 6, type: 'warning', message: 'Sir Vincent Bonifacio flagged Christine Joy Lacson for DBMS 301 support', time: '5 hrs ago', read: true },
  { id: 7, type: 'info', message: 'Community Points: +50 pts credited for NET 201 session', time: 'Yesterday', read: true },
  { id: 8, type: 'info', message: 'New tutor application: Francis Dela Peña — pending qualification exam', time: 'Yesterday', read: true },
];

// ─── ACTIVITY FEED ───────────────────────────────────────────────
export const ACTIVITY_FEED = [
  { id: 1, type: 'referral', actor: 'Mrs. Bethel Tisuela', action: 'referred', target: 'Julian Gemelo', detail: 'PROG 201 — Linked Lists', time: '5 min ago', icon: '🚩' },
  { id: 2, type: 'session', actor: 'Mark Antipo', action: 'completed session with', target: 'Bianca Lopez', detail: 'PROG 201 — Recursion (1.5 hrs)', time: '1 hr ago', icon: '✅' },
  { id: 3, type: 'referral', actor: 'Sir Charles Torres', action: 'referred', target: 'Kenneth James Reyes', detail: 'IT 101 — Binary & Number Systems', time: '2 hrs ago', icon: '🚩' },
  { id: 4, type: 'points', actor: 'System', action: 'awarded 75 pts to', target: 'Mark Antipo', detail: 'For session with Bianca Lopez', time: '1 hr ago', icon: '💰' },
  { id: 5, type: 'exam', actor: 'Kimberly Anne Flores', action: 'passed qualification exam for', target: 'WEB 301', detail: 'Score: 94% — Certified by Sir Lenuel Betita', time: '3 hrs ago', icon: '🏅' },
  { id: 6, type: 'resolved', actor: 'Patricia Reyes', action: 'resolved referral for', target: 'Anna Garcia', detail: 'ENGL 101 — Essay score improved 62% → 88%', time: '5 hrs ago', icon: '🎉' },
  { id: 7, type: 'session', actor: 'Angela Delos Santos', action: 'started session with', target: 'Daniel Marco Flores', detail: 'PROG 301 — Inheritance', time: '6 hrs ago', icon: '📘' },
  { id: 8, type: 'reward', actor: 'Sofia Mendoza', action: 'redeemed', target: 'Cafeteria Meal Voucher', detail: '150 pts deducted', time: 'Yesterday', icon: '🎁' },
];

// ─── PLATFORM STATS (Superadmin) ─────────────────────────────────
export const PLATFORM_STATS = {
  totalTutors: 13,
  activeTutors: 11,
  verifiedTutors: 11,
  pendingVerification: 2,
  totalLearners: 15,
  activeLearners: 12,
  totalSessions: 358,
  sessionsThisMonth: 52,
  totalHours: 537,
  hoursThisMonth: 78,
  avgSessionRating: 4.7,
  totalPointsIssued: 24650,
  pointsThisMonth: 3850,
  totalReferrals: 12,
  activeReferrals: 8,
  resolvedReferrals: 3,
  recoveryRate: 87,
  avgRecoveryTime: '8.5 days',
  topDepartment: 'BSIT',
  totalFaculty: 9,
  activeFaculty: 9,
};

// ─── CALENDAR SLOTS ──────────────────────────────────────────────
export const CALENDAR_SLOTS = (() => {
  const slots = {};
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const hours = ['8:00', '9:00', '10:00', '11:00', '1:00', '2:00', '3:00', '4:00'];
  days.forEach(day => {
    slots[day] = {};
    hours.forEach(hour => {
      slots[day][hour] = Math.random() > 0.4 ? 'available' : Math.random() > 0.5 ? 'booked' : 'unavailable';
    });
  });
  return slots;
})();

// ─── TUTOR APPLICATIONS ──────────────────────────────────────────
export const TUTOR_APPLICATIONS = [
  {
    id: 'APP-001',
    studentName: 'Francis Dela Peña',
    program: 'BSIT 3-B',
    avatar: '🧑‍🎓',
    subjects: ['NET 201', 'IT 101'],
    examScore: 92,
    grades: {
      prelim: 90,
      midterm: 93,
      preFinal: 94,
      final: 95
    },
    achievements: [
      'Dean\'s Lister (3 Consecutive Semesters)',
      '1st Place - Campus Cisco Networking Competition',
    ],
    status: 'pending',
    dateApplied: '2026-10-01'
  },
  {
    id: 'APP-002',
    studentName: 'Jerome Lacson',
    program: 'BSA 3-A',
    avatar: '🧑‍🎓',
    subjects: ['ACCT 102', 'MGMT 301'],
    examScore: 88,
    grades: {
      prelim: 88,
      midterm: 89,
      preFinal: 90,
      final: 91
    },
    achievements: [
      'President, Junior Philippine Institute of Accountants (LCCB Chapter)',
      'Academic Scholar 2025-2026'
    ],
    status: 'pending',
    dateApplied: '2026-10-02'
  },
  {
    id: 'APP-003',
    studentName: 'Camille Santos',
    program: 'BSED 2-A',
    avatar: '👩‍🎓',
    subjects: ['ENGL 101'],
    examScore: 95,
    grades: {
      prelim: 95,
      midterm: 96,
      preFinal: 97,
      final: 98
    },
    achievements: [
      'Editor-in-Chief, Campus Publication',
      'Best Speaker, Regional Debate Championship'
    ],
    status: 'pending',
    dateApplied: '2026-10-02'
  }
];
