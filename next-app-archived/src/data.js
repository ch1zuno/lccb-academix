// LCCB Academix — Mock Data with realistic LCCB-flavored names and subjects

export const ROLES = {
  SUPERADMIN: 'superadmin',
  FACULTY: 'faculty',
  TUTOR: 'tutor',
  TUTEE: 'tutee',
};

export const ROLE_LABELS = {
  [ROLES.SUPERADMIN]: 'Superadmin (Principal / Deans)',
  [ROLES.FACULTY]: 'Faculty Member / Academic Advisor',
  [ROLES.TUTOR]: 'Accredited Student Tutor',
  [ROLES.TUTEE]: 'Tutee (Referred Student)',
};

export const ROLE_COLORS = {
  [ROLES.SUPERADMIN]: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  [ROLES.FACULTY]: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  [ROLES.TUTOR]: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  [ROLES.TUTEE]: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
};

export const USERS = {
  superadmin: { id: 'SA-001', name: 'Dr. Maria Cristina Reyes', email: 'mc.reyes@lccbacolod.edu.ph', role: 'superadmin', avatar: '👩‍💼', title: 'Dean of Academics' },
  faculty: { id: 'FA-017', name: 'Prof. Ricardo Santos', email: 'r.santos@lccbacolod.edu.ph', role: 'faculty', avatar: '👨‍🏫', title: 'Accounting Department' },
  tutor: { id: 'TU-042', name: 'Mark Antipo', email: 'm.antipo@lccbacolod.edu.ph', role: 'tutor', avatar: '🧑‍🎓', title: 'BSA 3-A | Accredited Tutor', points: 2450, rating: 4.8, sessions: 67 },
  tutee: { id: 'TE-128', name: 'Julian Gemelo', email: 'j.gemelo@lccbacolod.edu.ph', role: 'tutee', avatar: '📚', title: 'BSIT 2-B | Student' },
};

export const SUBJECTS = [
  { code: 'IT 101', name: 'Introduction to Computing', dept: 'BSIT' },
  { code: 'ACCT 102', name: 'Fundamentals of Accounting', dept: 'BSA' },
  { code: 'MATH 201', name: 'Calculus I', dept: 'General' },
  { code: 'ENGL 101', name: 'English Communication', dept: 'General' },
  { code: 'FIN 301', name: 'Financial Management', dept: 'BSA' },
  { code: 'PROG 201', name: 'Data Structures & Algorithms', dept: 'BSIT' },
  { code: 'STAT 101', name: 'Probability & Statistics', dept: 'General' },
  { code: 'MGMT 301', name: 'Principles of Management', dept: 'BSBA' },
];

export const TUTORS = [
  { id: 'TU-042', name: 'Mark Antipo', avatar: '🧑‍🎓', subjects: ['ACCT 102', 'FIN 301'], rating: 4.8, sessions: 67, points: 2450, rate: 15, available: true, verified: true, bio: 'Dean\'s Lister | Passionate about helping fellow Consolacionians excel in Accounting.' },
  { id: 'TU-015', name: 'Angela Delos Santos', avatar: '👩‍🎓', subjects: ['IT 101', 'PROG 201'], rating: 4.9, sessions: 82, points: 3100, rate: 20, available: true, verified: true, bio: 'Best in Programming awardee. Specializes in Python & Java tutoring.' },
  { id: 'TU-023', name: 'Carlos Villanueva', avatar: '👨‍🎓', subjects: ['MATH 201', 'STAT 101'], rating: 4.6, sessions: 43, points: 1680, rate: 15, available: false, verified: true, bio: 'Math Olympiad semi-finalist. Makes Calculus understandable.' },
  { id: 'TU-031', name: 'Patricia Reyes', avatar: '👩‍🎓', subjects: ['ENGL 101'], rating: 4.7, sessions: 55, points: 2100, rate: 12, available: true, verified: true, bio: 'Published poet and campus journalist. Can help you write anything.' },
  { id: 'TU-038', name: 'Jerome Lacson', avatar: '🧑‍🎓', subjects: ['ACCT 102', 'MGMT 301'], rating: 4.5, sessions: 38, points: 1420, rate: 15, available: true, verified: false, bio: 'Aspiring CPA with hands-on experience in bookkeeping.' },
  { id: 'TU-044', name: 'Sofia Mendoza', avatar: '👩‍🎓', subjects: ['MATH 201', 'FIN 301'], rating: 4.9, sessions: 91, points: 3680, rate: 25, available: true, verified: true, bio: 'Top scorer in board exam practice. Finance & Math double expertise.' },
];

export const STUDENTS = [
  { id: 'TE-128', name: 'Julian Gemelo', program: 'BSIT 2-B', email: 'j.gemelo@lccbacolod.edu.ph' },
  { id: 'TE-092', name: 'Maria Luisa Tan', program: 'BSA 1-A', email: 'ml.tan@lccbacolod.edu.ph' },
  { id: 'TE-145', name: 'Rafael Cruz', program: 'BSIT 3-A', email: 'r.cruz@lccbacolod.edu.ph' },
  { id: 'TE-067', name: 'Anna Garcia', program: 'BSBA 2-C', email: 'a.garcia@lccbacolod.edu.ph' },
  { id: 'TE-201', name: 'Miguel Santos', program: 'BSA 2-A', email: 'm.santos@lccbacolod.edu.ph' },
  { id: 'TE-178', name: 'Bianca Lopez', program: 'BSIT 1-B', email: 'b.lopez@lccbacolod.edu.ph' },
];

export const REFERRALS = [
  { id: 'REF-001', student: 'Julian Gemelo', studentId: 'TE-128', subject: 'ACCT 102', topic: 'Journal Entries & T-Accounts', urgency: 'high', faculty: 'Prof. Ricardo Santos', status: 'flagged', date: '2026-09-20', notes: 'Consistently failing quizzes. Needs immediate peer support.' },
  { id: 'REF-002', student: 'Maria Luisa Tan', studentId: 'TE-092', subject: 'MATH 201', topic: 'Limits & Continuity', urgency: 'medium', faculty: 'Prof. Elena Marcos', status: 'assigned', date: '2026-09-18', notes: 'Shows potential but struggles with conceptual understanding.' },
  { id: 'REF-003', student: 'Rafael Cruz', studentId: 'TE-145', subject: 'PROG 201', topic: 'Linked Lists', urgency: 'low', faculty: 'Prof. James Navarro', status: 'in-progress', date: '2026-09-15', notes: 'Needs practice with pointer manipulation.' },
  { id: 'REF-004', student: 'Anna Garcia', studentId: 'TE-067', subject: 'ENGL 101', topic: 'Essay Writing', urgency: 'medium', faculty: 'Prof. Ricardo Santos', status: 'resolved', date: '2026-09-10', notes: 'Improved significantly after 3 sessions.' },
];

export const SESSIONS = [
  { id: 'SES-001', tutor: 'Mark Antipo', tutee: 'Julian Gemelo', subject: 'ACCT 102', date: '2026-09-24', time: '10:00 AM', duration: '1.5 hrs', status: 'upcoming', location: 'Library Rm 201' },
  { id: 'SES-002', tutor: 'Angela Delos Santos', tutee: 'Bianca Lopez', subject: 'PROG 201', date: '2026-09-24', time: '2:00 PM', duration: '1 hr', status: 'upcoming', location: 'CS Lab 3' },
  { id: 'SES-003', tutor: 'Mark Antipo', tutee: 'Miguel Santos', subject: 'FIN 301', date: '2026-09-25', time: '9:00 AM', duration: '2 hrs', status: 'upcoming', location: 'Study Hall A' },
  { id: 'SES-004', tutor: 'Patricia Reyes', tutee: 'Anna Garcia', subject: 'ENGL 101', date: '2026-09-22', time: '3:00 PM', duration: '1 hr', status: 'completed', location: 'Library Rm 102', rating: 5 },
  { id: 'SES-005', tutor: 'Carlos Villanueva', tutee: 'Rafael Cruz', subject: 'MATH 201', date: '2026-09-21', time: '11:00 AM', duration: '1.5 hrs', status: 'completed', location: 'Study Hall B', rating: 4 },
];

export const EXAM_QUESTIONS = [
  { id: 1, question: 'What is the primary purpose of a peer tutoring program in an academic institution?', options: ['To replace faculty instruction', 'To supplement learning through collaborative peer support', 'To reduce the number of classes needed', 'To evaluate faculty performance'], answer: 1 },
  { id: 2, question: 'When a tutee is struggling with a concept, the best approach is to:', options: ['Give them the answer directly', 'Use guided questions to help them discover the answer', 'Skip the topic and move on', 'Tell them to read the textbook'], answer: 1 },
  { id: 3, question: 'Which of the following best describes "active listening" in a tutoring context?', options: ['Waiting for your turn to speak', 'Fully concentrating on the tutee\'s words, understanding, and responding thoughtfully', 'Taking notes silently', 'Repeating everything the tutee says'], answer: 1 },
  { id: 4, question: 'If a tutee reveals personal or emotional struggles during a session, you should:', options: ['Ignore it and continue tutoring', 'Provide counseling advice', 'Listen empathetically and refer them to the appropriate campus resource', 'Post about it on social media'], answer: 2 },
  { id: 5, question: 'The concept of "scaffolding" in education refers to:', options: ['Building a physical structure', 'Providing temporary support that is gradually removed as the learner gains competence', 'Giving increasingly difficult tasks without support', 'Creating a strict curriculum'], answer: 1 },
  { id: 6, question: 'What is the La Consolacion College Bacolod\'s core value that aligns with peer tutoring?', options: ['Competition', 'Community and Service', 'Isolation', 'Profit'], answer: 1 },
  { id: 7, question: 'When preparing for a tutoring session, a tutor should:', options: ['Wait for the tutee to bring all materials', 'Review the topic beforehand and prepare examples', 'Only focus on topics they are comfortable with', 'Cancel if they feel slightly unprepared'], answer: 1 },
  { id: 8, question: 'A "growth mindset" in the context of tutoring means:', options: ['Believing intelligence is fixed', 'Understanding that abilities can be developed through effort and strategies', 'Focusing only on grades', 'Avoiding challenges'], answer: 1 },
  { id: 9, question: 'How should confidential student information be handled by an accredited tutor?', options: ['Shared freely with classmates', 'Protected under FERPA/DPA and only discussed with authorized faculty', 'Posted online for reference', 'Discussed in group chats'], answer: 1 },
  { id: 10, question: 'The incentive ledger system at LCCB rewards tutors with Community Points. What is the primary motivation behind this system?', options: ['To create competition among tutors', 'To recognize and encourage sustained, high-quality peer mentorship', 'To replace monetary compensation', 'To track attendance only'], answer: 1 },
];

export const REWARDS = [
  { id: 'RW-001', name: 'Campus Printing Credits (50 pages)', cost: 200, category: 'Campus Perks', icon: '🖨️', stock: 45, description: 'Redeemable at the LCCB Computer Lab printing station.' },
  { id: 'RW-002', name: 'LCCB Academix T-Shirt', cost: 800, category: 'Merchandise', icon: '👕', stock: 20, description: 'Premium cotton tee with the Academix logo.' },
  { id: 'RW-003', name: 'Cafeteria Meal Voucher', cost: 150, category: 'Campus Perks', icon: '🍽️', stock: 100, description: 'Good for 1 meal at the LCCB cafeteria.' },
  { id: 'RW-004', name: 'Library Extended Hours Pass', cost: 100, category: 'Campus Perks', icon: '📖', stock: 30, description: 'Access the library until 10 PM for one week.' },
  { id: 'RW-005', name: 'LCCB Tumbler', cost: 500, category: 'Merchandise', icon: '🥤', stock: 15, description: 'Stainless steel tumbler with college seal.' },
  { id: 'RW-006', name: 'Priority Class Registration', cost: 1500, category: 'Exclusive', icon: '⭐', stock: 5, description: 'Register for classes 24 hours before general enrollment.' },
  { id: 'RW-007', name: 'Parking Pass (1 Month)', cost: 1200, category: 'Exclusive', icon: '🅿️', stock: 8, description: 'Reserved parking spot on campus for one month.' },
  { id: 'RW-008', name: 'LCCB Hoodie', cost: 1000, category: 'Merchandise', icon: '🧥', stock: 12, description: 'Premium embroidered hoodie in Navy Blue.' },
];

export const BADGES = [
  { id: 'BG-001', name: 'First Session', icon: '🌟', description: 'Completed your first tutoring session', earned: true },
  { id: 'BG-002', name: 'Faculty Certified', icon: '🏅', description: 'Passed the qualification exam', earned: true },
  { id: 'BG-003', name: 'Rising Star', icon: '⭐', description: '10+ sessions with 4.5+ rating', earned: true },
  { id: 'BG-004', name: 'Community Champion', icon: '🏆', description: '50+ sessions completed', earned: true },
  { id: 'BG-005', name: 'Perfect Score', icon: '💯', description: '100% on qualification exam', earned: false },
  { id: 'BG-006', name: 'Subject Master', icon: '📘', description: 'Tutored 3+ subjects', earned: false },
];

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

export const NOTIFICATIONS = [
  { id: 1, type: 'info', message: 'New faculty referral received for Julian Gemelo', time: '5 min ago', read: false },
  { id: 2, type: 'success', message: 'Session with Miguel Santos completed successfully', time: '1 hr ago', read: false },
  { id: 3, type: 'warning', message: 'Qualification exam expiring in 7 days — Retake required', time: '3 hrs ago', read: true },
  { id: 4, type: 'info', message: 'Community Points: +30 pts credited to your wallet', time: 'Yesterday', read: true },
];

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
