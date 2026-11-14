/**
 * Canonical mock dataset for LCCB Academix (Subjects, Accredited Peer Tutors, and Faculty Specialists).
 * Used for instant client-side search & filtering in the Find a Tutor tab,
 * while remaining 100% compatible with the seeded PostgreSQL custom_ids and codes.
 */

export const SUBJECTS = [
  { id: 'sub-it101', code: 'IT 101', name: 'Introduction to Computing', department: 'BSIT' },
  { id: 'sub-prog201', code: 'PROG 201', name: 'Data Structures & Algorithms', department: 'BSIT' },
  { id: 'sub-prog301', code: 'PROG 301', name: 'Object-Oriented Programming', department: 'BSIT' },
  { id: 'sub-web301', code: 'WEB 301', name: 'Web Development', department: 'BSIT' },
  { id: 'sub-dbms301', code: 'DBMS 301', name: 'Database Management Systems', department: 'BSIT' },
  { id: 'sub-net201', code: 'NET 201', name: 'Networking Fundamentals', department: 'BSIT' },
  { id: 'sub-sys401', code: 'SYS 401', name: 'Systems Analysis & Design', department: 'BSIT' },
  { id: 'sub-acct102', code: 'ACCT 102', name: 'Fundamentals of Accounting', department: 'BSA' },
  { id: 'sub-math201', code: 'MATH 201', name: 'Calculus I', department: 'General' },
  { id: 'sub-engl101', code: 'ENGL 101', name: 'English Communication', department: 'General' },
  { id: 'sub-fin301', code: 'FIN 301', name: 'Financial Management', department: 'BSA' },
  { id: 'sub-stat101', code: 'STAT 101', name: 'Probability & Statistics', department: 'General' },
  { id: 'sub-mgmt301', code: 'MGMT 301', name: 'Principles of Management', department: 'BSBA' },
  { id: 'sub-mkt201', code: 'MKT 201', name: 'Marketing Management', department: 'BSBA' },
  { id: 'sub-fil102', code: 'FIL 102', name: "Filipino sa Iba't Ibang Disiplina", department: 'General' },
  { id: 'sub-sts101', code: 'STS 101', name: 'Science, Technology & Society', department: 'General' },
];

const SUBJECT_BY_CODE = Object.fromEntries(SUBJECTS.map((s) => [s.code, s]));

function pickSubjects(codes) {
  return codes.map((code) => SUBJECT_BY_CODE[code] || { code, name: code, department: 'General' });
}

export const TUTORS = [
  {
    id: 'TU-042',
    custom_id: 'TU-042',
    name: 'Mark Antipo',
    role: 'tutor',
    avatar: '🧑‍🎓',
    program: 'BSIT 3-A',
    specialization: 'Computing Fundamentals & Data Structures',
    is_available: true,
    is_verified: true,
    bio: "Dean's Lister | Passionate about helping fellow Consolacionians excel in Computing.",
    hourly_rate: 15,
    stats: { rating: '5.0', sessions: 12, completed_sessions: 12 },
    subjects: pickSubjects(['IT 101', 'PROG 201']),
  },
  {
    id: 'TU-015',
    custom_id: 'TU-015',
    name: 'Angela Delos Santos',
    role: 'tutor',
    avatar: '👩‍🎓',
    program: 'BSIT 4-A',
    specialization: 'Object-Oriented Programming & Web Development',
    is_available: true,
    is_verified: true,
    bio: 'Best in Programming awardee. Specializes in Python, Java & Web Dev tutoring.',
    hourly_rate: 20,
    stats: { rating: '5.0', sessions: 18, completed_sessions: 18 },
    subjects: pickSubjects(['PROG 201', 'PROG 301', 'WEB 301']),
  },
  {
    id: 'TU-031',
    custom_id: 'TU-031',
    name: 'Patricia Reyes',
    role: 'tutor',
    avatar: '👩‍🎓',
    program: 'BSED 3-A',
    specialization: 'English Communication & Academic Filipino',
    is_available: true,
    is_verified: true,
    bio: 'Published poet and campus journalist. Can help you write anything.',
    hourly_rate: 12,
    stats: { rating: '5.0', sessions: 14, completed_sessions: 14 },
    subjects: pickSubjects(['ENGL 101', 'FIL 102']),
  },
  {
    id: 'TU-044',
    custom_id: 'TU-044',
    name: 'Sofia Mendoza',
    role: 'tutor',
    avatar: '👩‍🎓',
    program: 'BSA 4-A',
    specialization: 'Calculus, Financial Management & Accounting',
    is_available: true,
    is_verified: true,
    bio: 'Top scorer in board exam practice. Finance & Math double expertise.',
    hourly_rate: 25,
    stats: { rating: '5.0', sessions: 22, completed_sessions: 22 },
    subjects: pickSubjects(['MATH 201', 'FIN 301', 'ACCT 102']),
  },
  {
    id: 'TU-050',
    custom_id: 'TU-050',
    name: 'Renzo Gabriel Tan',
    role: 'tutor',
    avatar: '👨‍🎓',
    program: 'BSIT 4-B',
    specialization: 'Database Systems & Networking Fundamentals',
    is_available: true,
    is_verified: true,
    bio: 'Database enthusiast. Oracle & MySQL certified. Networking nerd.',
    hourly_rate: 18,
    stats: { rating: '4.9', sessions: 15, completed_sessions: 15 },
    subjects: pickSubjects(['DBMS 301', 'IT 101', 'NET 201']),
  },
  {
    id: 'TU-053',
    custom_id: 'TU-053',
    name: 'Kimberly Anne Flores',
    role: 'tutor',
    avatar: '👩‍🎓',
    program: 'BSIT 3-A',
    specialization: 'Full-Stack Web Development & OOP',
    is_available: true,
    is_verified: true,
    bio: 'Full-stack web developer. React & Node.js specialist.',
    hourly_rate: 18,
    stats: { rating: '5.0', sessions: 11, completed_sessions: 11 },
    subjects: pickSubjects(['WEB 301', 'PROG 301']),
  },
  {
    id: 'TU-056',
    custom_id: 'TU-056',
    name: 'Miguel Angelo Cruz',
    role: 'tutor',
    avatar: '🧑‍🎓',
    program: 'BSIT 2-A',
    specialization: 'Introductory Computing & Programming Logic',
    is_available: true,
    is_verified: true,
    bio: 'Rising sophomore tutor. Patient with beginners.',
    hourly_rate: 12,
    stats: { rating: '4.8', sessions: 7, completed_sessions: 7 },
    subjects: pickSubjects(['IT 101', 'PROG 201']),
  },
  {
    id: 'TU-062',
    custom_id: 'TU-062',
    name: 'John Patrick Navarro',
    role: 'tutor',
    avatar: '👨‍🎓',
    program: 'BSIT 4-A',
    specialization: 'Systems Analysis, Databases & Architecture',
    is_available: true,
    is_verified: true,
    bio: 'Systems analyst intern at a local tech company. Capstone mentor.',
    hourly_rate: 22,
    stats: { rating: '4.9', sessions: 19, completed_sessions: 19 },
    subjects: pickSubjects(['SYS 401', 'DBMS 301', 'PROG 301']),
  },
  {
    id: 'TU-065',
    custom_id: 'TU-065',
    name: 'Maria Cecilia Santos',
    role: 'tutor',
    avatar: '👩‍🎓',
    program: 'BSBA 3-A',
    specialization: 'Strategic Management & Marketing',
    is_available: true,
    is_verified: true,
    bio: 'Business plan competition winner. Loves strategic management.',
    hourly_rate: 12,
    stats: { rating: '5.0', sessions: 9, completed_sessions: 9 },
    subjects: pickSubjects(['MGMT 301', 'MKT 201']),
  },
  {
    id: 'TU-023',
    custom_id: 'TU-023',
    name: 'Carlos Villanueva',
    role: 'tutor',
    avatar: '👨‍🎓',
    program: 'BSIT 3-B',
    specialization: 'Calculus & Probability/Statistics',
    is_available: false,
    is_verified: true,
    bio: 'Math Olympiad semi-finalist. Makes Calculus understandable.',
    hourly_rate: 15,
    stats: { rating: '4.8', sessions: 10, completed_sessions: 10 },
    subjects: pickSubjects(['MATH 201', 'STAT 101']),
  },
  {
    id: 'TU-059',
    custom_id: 'TU-059',
    name: 'Jasmine Lim',
    role: 'tutor',
    avatar: '👩‍🎓',
    program: 'BSA 3-B',
    specialization: 'Financial Analysis & Accounting',
    is_available: false,
    is_verified: true,
    bio: "Financial analysis whiz. Dean's Lister for 4 consecutive terms.",
    hourly_rate: 15,
    stats: { rating: '5.0', sessions: 8, completed_sessions: 8 },
    subjects: pickSubjects(['ACCT 102', 'FIN 301']),
  },
];

export const FACULTY_SPECIALISTS = [
  {
    id: 'FA-017',
    custom_id: 'FA-017',
    name: 'Mrs. Bethel Tisuela',
    role: 'faculty',
    avatar: '👩‍🏫',
    title: 'IT Department — Program Head',
    department: 'BSIT',
    specialization: 'Computing Fundamentals, Data Structures & Systems Analysis',
    is_available: true,
    is_verified: true,
    bio: 'IT Department Program Head specializing in Computing Fundamentals, Data Structures, and Systems Analysis & Design.',
    stats: { rating: '5.0', sessions: 14, completed_sessions: 14 },
    subjects: pickSubjects(['IT 101', 'PROG 201', 'SYS 401']),
  },
  {
    id: 'FA-021',
    custom_id: 'FA-021',
    name: 'Sir Charles Torres',
    role: 'faculty',
    avatar: '👨‍🏫',
    title: 'IT Department — Senior Faculty',
    department: 'BSIT',
    specialization: 'Networking Fundamentals & Computing Foundations',
    is_available: true,
    is_verified: true,
    bio: 'Senior IT Faculty specializing in Networking Fundamentals, Cisco Infrastructure, and Computing Foundations.',
    stats: { rating: '5.0', sessions: 11, completed_sessions: 11 },
    subjects: pickSubjects(['IT 101', 'NET 201']),
  },
  {
    id: 'FA-025',
    custom_id: 'FA-025',
    name: 'Sir Lenuel Betita',
    role: 'faculty',
    avatar: '👨‍🏫',
    title: 'IT Department — Faculty',
    department: 'BSIT',
    specialization: 'Object-Oriented Programming & Web Development',
    is_available: true,
    is_verified: true,
    bio: 'IT Faculty mentor specializing in Object-Oriented Programming and Full-Stack Web Development.',
    stats: { rating: '5.0', sessions: 16, completed_sessions: 16 },
    subjects: pickSubjects(['PROG 301', 'WEB 301']),
  },
  {
    id: 'FA-029',
    custom_id: 'FA-029',
    name: 'Sir Vincent Bonifacio',
    role: 'faculty',
    avatar: '👨‍🏫',
    title: 'IT Department — Faculty',
    department: 'BSIT',
    specialization: 'Database Management Systems & Systems Architecture',
    is_available: true,
    is_verified: true,
    bio: 'IT Faculty specializing in Relational Database Management Systems, SQL Optimization, and Systems Architecture.',
    stats: { rating: '5.0', sessions: 9, completed_sessions: 9 },
    subjects: pickSubjects(['DBMS 301', 'SYS 401']),
  },
  {
    id: 'FA-033',
    custom_id: 'FA-033',
    name: 'Prof. Ricardo Santos',
    role: 'faculty',
    avatar: '👨‍🏫',
    title: 'Accounting Department',
    department: 'BSA',
    specialization: 'Financial Accounting & Corporate Finance',
    is_available: true,
    is_verified: true,
    bio: 'Accounting Department Faculty specializing in Financial Accounting, Auditing, and Corporate Financial Management.',
    stats: { rating: '5.0', sessions: 10, completed_sessions: 10 },
    subjects: pickSubjects(['ACCT 102', 'FIN 301']),
  },
  {
    id: 'FA-037',
    custom_id: 'FA-037',
    name: 'Prof. Elena Marcos',
    role: 'faculty',
    avatar: '👩‍🏫',
    title: 'Mathematics Department',
    department: 'General',
    specialization: 'Calculus, Applied Probability & Statistics',
    is_available: true,
    is_verified: true,
    bio: 'Mathematics Department Faculty specializing in Calculus, Applied Probability, and Statistical Analysis.',
    stats: { rating: '5.0', sessions: 12, completed_sessions: 12 },
    subjects: pickSubjects(['MATH 201', 'STAT 101']),
  },
  {
    id: 'FA-041',
    custom_id: 'FA-041',
    name: 'Prof. James Navarro',
    role: 'faculty',
    avatar: '👨‍🏫',
    title: 'IT Department — Adjunct',
    department: 'BSIT',
    specialization: 'Web Technologies & Enterprise Networking',
    is_available: true,
    is_verified: true,
    bio: 'Adjunct IT Faculty specializing in Modern Web Technologies and Enterprise Network Administration.',
    stats: { rating: '5.0', sessions: 6, completed_sessions: 6 },
    subjects: pickSubjects(['NET 201', 'WEB 301']),
  },
  {
    id: 'FA-045',
    custom_id: 'FA-045',
    name: 'Prof. Carmen Villanueva',
    role: 'faculty',
    avatar: '👩‍🏫',
    title: 'English Department',
    department: 'General',
    specialization: 'English Communication & Academic Filipino',
    is_available: true,
    is_verified: true,
    bio: 'Languages & Literature Faculty specializing in Academic English Communication and Komunikasyon sa Filipino.',
    stats: { rating: '5.0', sessions: 8, completed_sessions: 8 },
    subjects: pickSubjects(['ENGL 101', 'FIL 102']),
  },
  {
    id: 'FA-049',
    custom_id: 'FA-049',
    name: 'Prof. Antonio Lacson',
    role: 'faculty',
    avatar: '👨‍🏫',
    title: 'Business Administration Dept.',
    department: 'BSBA',
    specialization: 'Principles of Management & Marketing',
    is_available: true,
    is_verified: true,
    bio: 'Business Administration Faculty specializing in Strategic Management and Marketing Principles.',
    stats: { rating: '5.0', sessions: 7, completed_sessions: 7 },
    subjects: pickSubjects(['MGMT 301', 'MKT 201']),
  },
];

/**
 * Case-insensitive live filter for subjects by name, code, or department.
 */
export function filterSubjects(subjectsOrQuery = SUBJECTS, maybeQuery = '') {
  const list = Array.isArray(subjectsOrQuery) ? subjectsOrQuery : SUBJECTS;
  const query = Array.isArray(subjectsOrQuery) ? maybeQuery : subjectsOrQuery;
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (s) =>
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.code || '').toLowerCase().includes(q) ||
      String(s.department || '').toLowerCase().includes(q)
  );
}

/**
 * Case-insensitive live filter for tutors by name, specialization, program, or subject taught.
 */
export function filterTutors(tutorsOrQuery = TUTORS, maybeQuery = '') {
  const list = Array.isArray(tutorsOrQuery) ? tutorsOrQuery : TUTORS;
  const query = Array.isArray(tutorsOrQuery) ? maybeQuery : tutorsOrQuery;
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return list;
  return list.filter((t) => {
    const nameMatch = String(t.name || '').toLowerCase().includes(q);
    const specMatch = String(t.specialization || '').toLowerCase().includes(q);
    const progMatch = String(t.program || t.department || '').toLowerCase().includes(q);
    const subMatch = Array.isArray(t.subjects) && t.subjects.some(
      (s) =>
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.code || '').toLowerCase().includes(q)
    );
    return nameMatch || specMatch || progMatch || subMatch;
  });
}

/**
 * Returns available verified peer tutors who teach a given subject code.
 */
export function getAvailableTutorsForSubject(tutorsOrCode = TUTORS, maybeCode = '') {
  const list = Array.isArray(tutorsOrCode) ? tutorsOrCode : TUTORS;
  const subjectCode = Array.isArray(tutorsOrCode) ? maybeCode : tutorsOrCode;
  const target = String(subjectCode ?? '').trim().toUpperCase();
  return list.filter(
    (t) =>
      t.is_available !== false &&
      t.is_verified !== false &&
      Array.isArray(t.subjects) &&
      t.subjects.some((s) => String(s.code || s).toUpperCase() === target)
  );
}

/**
 * Resolves a tutor or faculty record from mock data by id, custom_id, or name.
 */
export function findMockMentorById(idOrName) {
  const key = String(idOrName ?? '').trim().toUpperCase();
  if (!key) return null;
  return (
    TUTORS.find(
      (t) =>
        String(t.custom_id || t.id).toUpperCase() === key ||
        String(t.name || '').toUpperCase() === key
    ) ||
    FACULTY_SPECIALISTS.find(
      (f) =>
        String(f.custom_id || f.id).toUpperCase() === key ||
        String(f.name || '').toUpperCase() === key
    ) ||
    null
  );
}
