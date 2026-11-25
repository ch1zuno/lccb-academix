/* Classroom tasks e2e: access guards → assign → notify → attach → edit → due-soon → submit → unsubmit → resubmit (late) → review → delete. */
const BASE = (process.env.E2E_API_BASE || 'http://localhost:4000').replace(/\/+$/, '') + '/api';

const TINY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000080000000808020000004b6d29dc0000002449444154789c63e0d774bab286178290d90c5845f9359d18b08a427560358d810e760000330852116232cd090000000049454e44ae426082',
  'hex',
);

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

async function uploadImage(path, token, filename, buffer, mime = 'image/png') {
  const fd = new FormData();
  fd.append('image', new Blob([buffer], { type: mime }), filename);
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

const login = (loginId) => request('/auth/login', { method: 'POST', body: { loginId, password: 'demo1234' } });
const check = (ok, msg) => { if (!ok) throw new Error(msg); };

(async () => {
  const tutor = (await login('TU-042')).data;
  const studentA = (await login('TE-128')).data;
  const studentB = (await login('TE-178')).data;
  const unrelated = (await login('TE-201')).data;
  const faculty = (await login('b.tisuela@lccbacolod.edu.ph')).data;
  check(tutor?.token && studentA?.token && studentB?.token && unrelated?.token && faculty?.token, 'demo logins failed');

  // Snapshot wallet balance to verify points_ledger is never touched
  const walletBefore = (await request('/wallet', { token: studentA.token })).data.balance;

  // Role & access guards
  const facultyTasks = await request('/tasks', { token: faculty.token });
  check(facultyTasks.status === 403, `faculty should be blocked from /tasks, got ${facultyTasks.status}`);

  const badForm = await request('/tasks', {
    method: 'POST',
    token: tutor.token,
    body: { title: 'Bad form test', formUrl: 'http://evil.example.com/form', learnerIds: [studentA.user.id] },
  });
  check(badForm.status === 400, `invalid form URL should return 400, got ${badForm.status}`);

  const badAssignee = await request('/tasks', {
    method: 'POST',
    token: tutor.token,
    body: { title: 'Unrelated student', learnerIds: [unrelated.user.id] },
  });
  check(badAssignee.status === 403, `unrelated student should return 403, got ${badAssignee.status}`);

  // Tutee list includes active tutees
  const tuteesRes = await request('/tasks/tutees', { token: tutor.token });
  check(tuteesRes.status === 200, `tutees list failed: ${tuteesRes.status}`);
  const tuteeIds = new Set((tuteesRes.data.tutees || []).map((t) => t.id));
  check(tuteeIds.has(studentA.user.id) && tuteeIds.has(studentB.user.id), 'TU-042 active tutees missing TE-128/TE-178');
  check(!tuteeIds.has(unrelated.user.id), 'unrelated student TE-201 must not appear in TU-042 tutees');

  // 1. Assign task to both active tutees (due in 3 hours so due-soon notification triggers cleanly)
  const soonDue = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  const created = await request('/tasks', {
    method: 'POST',
    token: tutor.token,
    body: {
      title: 'E2E Pointer Tracing Task',
      description: 'Trace push and pop on a linked list.',
      dueAt: soonDue,
      formUrl: 'https://forms.gle/E2eAcademixForm999',
      learnerIds: [studentA.user.id, studentB.user.id],
    },
  });
  check(created.status === 201 && created.data.task?.id, `create task failed: ${created.status} ${created.data.error ?? ''}`);
  const taskId = created.data.task.id;
  check(created.data.assignedCount === 2, `expected assignedCount 2, got ${created.data.assignedCount}`);

  try {
    // Unrelated student blocked from reading the task
    const blockedDetail = await request(`/tasks/${taskId}`, { token: unrelated.token });
    check(blockedDetail.status === 403, `unrelated student should get 403 on task detail, got ${blockedDetail.status}`);

    // 2. High-priority assign + due-soon notifications (and dedupe on second fetch)
    const notifs1 = await request('/notifications', { token: studentA.token });
    check(notifs1.status === 200, `notifications failed: ${notifs1.status}`);
    const taskNotifs1 = (notifs1.data.notifications || []).filter((n) => n.entity_id === taskId);
    check(taskNotifs1.some((n) => n.title === 'New task assigned' && n.priority === 'high'), 'missing high-priority assign notification');
    check(taskNotifs1.some((n) => n.title === 'Task due soon' && n.priority === 'high'), 'missing high-priority due-soon notification');
    const dueSoonCount1 = taskNotifs1.filter((n) => n.title === 'Task due soon').length;
    check(dueSoonCount1 === 1, `expected 1 due-soon notification, got ${dueSoonCount1}`);

    const notifs2 = await request('/notifications', { token: studentA.token });
    const dueSoonCount2 = (notifs2.data.notifications || []).filter((n) => n.entity_id === taskId && n.title === 'Task due soon').length;
    check(dueSoonCount2 === 1, `due-soon notification duplicated: ${dueSoonCount2}`);

    // High-priority pinned ahead of normal notifications
    const list = notifs2.data.notifications || [];
    const firstNormalIdx = list.findIndex((n) => n.priority !== 'high');
    const lastHighIdx = list.map((n) => n.priority === 'high').lastIndexOf(true);
    if (firstNormalIdx !== -1 && lastHighIdx !== -1) {
      check(lastHighIdx < firstNormalIdx, 'high-priority notifications must be pinned above normal notifications');
    }

    // 3. Task image upload + magic byte check + access check
    const fakeImg = await uploadImage(`/tasks/${taskId}/attachments`, tutor.token, 'fake.png', Buffer.from('not-a-png'));
    check(fakeImg.status === 400, `fake png should be 400, got ${fakeImg.status}`);

    const taskImg = await uploadImage(`/tasks/${taskId}/attachments`, tutor.token, 'prompt.png', TINY_PNG);
    check(taskImg.status === 201 && taskImg.data.attachment?.id, `task image upload failed: ${taskImg.status}`);
    const promptAttId = taskImg.data.attachment.id;

    const studentReadPrompt = await fetch(`${BASE}/tasks/attachments/${promptAttId}`, {
      headers: { Authorization: `Bearer ${studentA.token}` },
    });
    check(studentReadPrompt.status === 200, `assigned student should read prompt image, got ${studentReadPrompt.status}`);

    const unrelatedReadPrompt = await fetch(`${BASE}/tasks/attachments/${promptAttId}`, {
      headers: { Authorization: `Bearer ${unrelated.token}` },
    });
    check(unrelatedReadPrompt.status === 403, `unrelated student must get 403 on prompt image, got ${unrelatedReadPrompt.status}`);

    // 4. Tutor edits task -> triggers edit notification
    const edited = await request(`/tasks/${taskId}`, {
      method: 'PATCH',
      token: tutor.token,
      body: { title: 'E2E Pointer Tracing Task (Updated)' },
    });
    check(edited.status === 200, `edit task failed: ${edited.status}`);
    const notifsAfterEdit = (await request('/notifications', { token: studentA.token })).data.notifications || [];
    check(notifsAfterEdit.some((n) => n.entity_id === taskId && n.title === 'Task updated'), 'missing edit notification');

    // 5. Student attaches submission image + turns in on time
    const subImg = await uploadImage(`/tasks/${taskId}/submission/attachments`, studentA.token, 'solution.png', TINY_PNG);
    check(subImg.status === 201 && subImg.data.attachment?.id, `submission image upload failed: ${subImg.status}`);
    const subAttId = subImg.data.attachment.id;

    // Peer student B must NOT be able to read student A's submission image
    const peerReadSub = await fetch(`${BASE}/tasks/attachments/${subAttId}`, {
      headers: { Authorization: `Bearer ${studentB.token}` },
    });
    check(peerReadSub.status === 403, `other student must get 403 on private submission image, got ${peerReadSub.status}`);

    const turnIn1 = await request(`/tasks/${taskId}/submit`, {
      method: 'POST',
      token: studentA.token,
      body: { text: 'Initial pointer trace', formCompleted: true },
    });
    check(turnIn1.status === 200 && turnIn1.data.assignment?.status === 'submitted', `submit failed: ${turnIn1.status}`);
    check(turnIn1.data.assignment.is_late === false, 'on-time submission should not be marked late');
    check(turnIn1.data.assignment.form_completed === true, 'form_completed should be true');

    // 6. Unsubmit works before review
    const unsub = await request(`/tasks/${taskId}/unsubmit`, { method: 'POST', token: studentA.token });
    check(unsub.status === 200 && unsub.data.assignment?.status === 'assigned', `unsubmit failed: ${unsub.status}`);

    // 7. Move due date to the past and resubmit -> automatically marked late
    const pastDue = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await request(`/tasks/${taskId}`, { method: 'PATCH', token: tutor.token, body: { dueAt: pastDue } });

    const turnIn2 = await request(`/tasks/${taskId}/submit`, {
      method: 'POST',
      token: studentA.token,
      body: { text: 'Revised pointer trace with edge cases', formCompleted: true },
    });
    check(turnIn2.status === 200 && turnIn2.data.assignment?.is_late === true, 'past-due resubmission must be marked late');

    // Tutor sees both late and missing statuses in submissions list
    const tutorDetail = await request(`/tasks/${taskId}`, { token: tutor.token });
    check(tutorDetail.status === 200, `tutor detail failed: ${tutorDetail.status}`);
    const subA = tutorDetail.data.submissions.find((s) => s.learner_id === studentA.user.id);
    const subB = tutorDetail.data.submissions.find((s) => s.learner_id === studentB.user.id);
    check(subA?.display_status === 'late', `expected studentA late, got ${subA?.display_status}`);
    check(subB?.display_status === 'missing', `expected studentB missing, got ${subB?.display_status}`);

    // 8. Tutor marks reviewed with feedback -> notifies student and locks unsubmit
    const review = await request(`/tasks/${taskId}/submissions/${studentA.user.id}/review`, {
      method: 'POST',
      token: tutor.token,
      body: { feedback: 'Great diagram; double-check null head case.' },
    });
    check(review.status === 200 && review.data.submission?.status === 'reviewed', `review failed: ${review.status}`);

    const lockedUnsub = await request(`/tasks/${taskId}/unsubmit`, { method: 'POST', token: studentA.token });
    check(lockedUnsub.status === 409, `unsubmit after review must return 409, got ${lockedUnsub.status}`);

    const notifsAfterReview = (await request('/notifications', { token: studentA.token })).data.notifications || [];
    check(
      notifsAfterReview.some((n) => n.entity_id === taskId && n.title === 'Task feedback returned' && n.priority === 'high'),
      'missing high-priority feedback notification',
    );

    // Points ledger untouched
    const walletAfter = (await request('/wallet', { token: studentA.token })).data.balance;
    check(walletBefore === walletAfter, `points ledger changed unexpectedly (${walletBefore} -> ${walletAfter})`);
  } finally {
    // 9. Clean up task + stored attachments
    const del = await request(`/tasks/${taskId}`, { method: 'DELETE', token: tutor.token });
    check(del.status === 200 && del.data.deleted === true, `delete task failed: ${del.status}`);
  }

  const gone = await request(`/tasks/${taskId}`, { token: tutor.token });
  check(gone.status === 404, `deleted task should return 404, got ${gone.status}`);

  console.log('Classroom tasks e2e passed.');
})().catch((err) => {
  console.error('FAIL', err.message);
  process.exit(1);
});
