/* E2E verification for Dual-Purpose Chat and Antigravity AI Assistant */
const BASE = 'http://localhost:4000/api';

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { status: res.status, data };
}

const login = (loginId) =>
  request('/auth/login', { method: 'POST', body: { loginId, password: 'demo1234' } });

const assert = (ok, msg) => {
  if (!ok) {
    console.error(`✗ FAIL: ${msg}`);
    throw new Error(msg);
  }
  console.log(`✓ PASS: ${msg}`);
};

try {
  console.log('--- Testing Dual-Purpose Chat & Antigravity AI Assistant ---');

  // 1. Log in demo participants
  const tutorRes = await login('TU-042');
  const learnerRes = await login('TE-128');
  assert(tutorRes.status === 200, 'Tutor Mark Antipo logged in');
  assert(learnerRes.status === 200, 'Learner Julian Gemelo logged in');

  const tutorToken = tutorRes.data.token;
  const learnerToken = learnerRes.data.token;

  // 2. Fetch tutor's sessions to find an active or upcoming session
  const { data: { sessions } } = await request('/sessions/mine', { token: tutorToken });
  const session = sessions.find((s) => s.status === 'upcoming' || s.status === 'in-progress');
  assert(Boolean(session), `Found target session ${session?.session_code}`);

  // 3. Test Dual-Purpose Chat Persistence
  const msg1 = await request(`/sessions/${session.id}/messages`, {
    method: 'POST',
    token: learnerToken,
    body: {
      content: 'Hello Tutor Mark, can we review linked list deletions?',
      recipientRole: 'all',
    },
  });
  assert(msg1.status === 201 && msg1.data.message.sender_role === 'student', 'Learner sent chat message with student role');

  const msg2 = await request(`/sessions/${session.id}/messages`, {
    method: 'POST',
    token: tutorToken,
    body: {
      content: 'Sure Julian! Let us start by tracing the head and previous pointers.',
      recipientRole: 'all',
    },
  });
  assert(msg2.status === 201 && msg2.data.message.sender_role === 'tutor', 'Tutor sent chat message with tutor role');

  // 4. Test Chat History Retrieval
  const history = await request(`/sessions/${session.id}/messages`, {
    method: 'GET',
    token: learnerToken,
  });
  assert(history.status === 200 && Array.isArray(history.data.messages), 'Chat history retrieved successfully');
  assert(history.data.messages.length >= 2, 'Chat contains persisted messages');

  // 5. Test Antigravity AI Assistant Real-Time Hint
  const hintRes = await request(`/sessions/${session.id}/ai/hint`, {
    method: 'POST',
    token: learnerToken,
    body: {
      queryText: 'How does node deletion work if the target node is at the head?',
    },
  });
  assert(hintRes.status === 201 && hintRes.data.message?.content, 'Antigravity AI hint generated');
  assert(hintRes.data.message && hintRes.data.message.sender_role === 'ai', 'AI hint saved to session chat ledger with ai role');

  // 6. Test Lesson Wrap-Up Synthesis & Quiz Generation
  const wrapUpRes = await request(`/sessions/${session.id}/ai/wrap-up-assist`, {
    method: 'POST',
    token: tutorToken,
    body: {},
  });
  assert(wrapUpRes.status === 200, 'Wrap-up synthesis generated');
  assert(typeof wrapUpRes.data.summary === 'string' && wrapUpRes.data.summary.length > 0, 'Lesson summary generated from chat log');
  assert(Array.isArray(wrapUpRes.data.quiz) && wrapUpRes.data.quiz.length === 3, '3 custom quiz questions synthesized');
  assert(typeof wrapUpRes.data.quiz[0].question === 'string', 'Quiz question structured properly');
  assert(wrapUpRes.data.quiz[0].options?.length === 4, 'Quiz question has 4 options');

  console.log('\nAll Chat & AI Assistant assertions passed successfully!\n');
  process.exit(0);
} catch (err) {
  console.error('\nE2E Verification Failed:', err.message);
  process.exit(1);
}
