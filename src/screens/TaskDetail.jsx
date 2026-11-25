import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Image as ImageIcon,
  Upload,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Send,
  Loader2,
  Lock,
  MessageSquare,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import Avatar from '../components/ui/Avatar';
import { cn } from '../lib/utils';
import { fmtManilaDateTime } from '../lib/ux';
import api from '../api';

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusPill(displayStatus, isOverdue = false) {
  switch (displayStatus) {
    case 'reviewed':
      return { label: 'Reviewed', cls: 'bg-emerald text-paper border-ink' };
    case 'late':
      return { label: 'Submitted late', cls: 'bg-gold text-ink border-ink' };
    case 'submitted':
      return { label: 'Submitted', cls: 'bg-surface-highlight text-ink border-ink' };
    default:
      return isOverdue
        ? { label: 'Missing · Overdue', cls: 'bg-crimson text-paper border-ink' }
        : { label: 'Missing', cls: 'bg-paper text-muted-foreground border-ink' };
  }
}

export default function TaskDetail({ role, showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isTutor = role === 'tutor';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [task, setTask] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [assignment, setAssignment] = useState(null);

  // Tutor edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueAt, setEditDueAt] = useState('');
  const [editFormUrl, setEditFormUrl] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [reviewingId, setReviewingId] = useState(null);

  // Student turn-in state
  const [subText, setSubText] = useState('');
  const [formCompleted, setFormCompleted] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [turningIn, setTurningIn] = useState(false);
  const [unsubmitting, setUnsubmitting] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get(`/tasks/${id}`);
      setTask(data.task);
      setAttachments(data.attachments || []);
      setEditTitle(data.task.title || '');
      setEditDescription(data.task.description || '');
      setEditDueAt(toLocalInputValue(data.task.due_at));
      setEditFormUrl(data.task.form_url || '');

      if (isTutor) {
        const subs = data.submissions || [];
        setSubmissions(subs);
        const drafts = {};
        for (const s of subs) drafts[s.learner_id] = s.feedback || '';
        setFeedbackDrafts(drafts);
      } else {
        setAssignment(data.assignment || null);
        setSubText(data.assignment?.submission_text || '');
        setFormCompleted(Boolean(data.assignment?.form_completed));
      }
    } catch (err) {
      setError(err.message || 'Could not load task details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, role]);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await api.patch(`/tasks/${id}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        dueAt: editDueAt ? new Date(editDueAt).toISOString() : null,
        formUrl: editFormUrl.trim() || null,
      });
      setEditing(false);
      showToast?.('Task updated and students notified.', 'success');
      await loadDetail();
    } catch (err) {
      showToast?.(err.message || 'Could not update task.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteTask = async () => {
    setDeleting(true);
    try {
      await api.delete(`/tasks/${id}`);
      showToast?.('Task deleted.', 'success');
      navigate('/tasks', { replace: true });
    } catch (err) {
      showToast?.(err.message || 'Could not delete task.', 'error');
      setDeleting(false);
    }
  };

  const uploadSingleImage = async (endpoint, file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showToast?.('Only PNG, JPG, and WEBP images are allowed.', 'error');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showToast?.('Each image must be 4 MB or smaller.', 'error');
      return;
    }
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await api.upload(endpoint, fd);
      showToast?.('Image uploaded.', 'success');
      await loadDetail();
    } catch (err) {
      showToast?.(err.message || 'Image upload failed.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveAttachment = async (attachmentId) => {
    try {
      await api.delete(`/tasks/${id}/attachments/${attachmentId}`);
      showToast?.('Image removed.', 'success');
      await loadDetail();
    } catch (err) {
      showToast?.(err.message || 'Could not remove image.', 'error');
    }
  };

  const handleTurnIn = async (e) => {
    e.preventDefault();
    setTurningIn(true);
    try {
      await api.post(`/tasks/${id}/submit`, {
        text: subText,
        formCompleted: task?.form_url ? formCompleted : false,
      });
      showToast?.('Task turned in.', 'success');
      await loadDetail();
    } catch (err) {
      showToast?.(err.message || 'Could not turn in task.', 'error');
    } finally {
      setTurningIn(false);
    }
  };

  const handleUnsubmit = async () => {
    setUnsubmitting(true);
    try {
      await api.post(`/tasks/${id}/unsubmit`, {});
      showToast?.('Submission reopened — edit and turn in again.', 'success');
      await loadDetail();
    } catch (err) {
      showToast?.(err.message || 'Could not unsubmit.', 'error');
    } finally {
      setUnsubmitting(false);
    }
  };

  const handleReview = async (learnerId) => {
    setReviewingId(learnerId);
    try {
      await api.post(`/tasks/${id}/submissions/${learnerId}/review`, {
        feedback: feedbackDrafts[learnerId] || '',
      });
      showToast?.('Submission marked reviewed and student notified.', 'success');
      await loadDetail();
    } catch (err) {
      showToast?.(err.message || 'Could not save review.', 'error');
    } finally {
      setReviewingId(null);
    }
  };

  if (loading) {
    return (
      <div className="panel flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink" strokeWidth={2.2} />
        <p className="mt-3 font-display text-[15px] font-bold">Loading task…</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/tasks')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to tasks
        </Button>
        <div className="border-2 border-crimson bg-surface-alert p-6 shadow-[4px_4px_0_var(--color-ink)]">
          <p className="font-bold text-crimson">{error || 'Task not found'}</p>
        </div>
      </div>
    );
  }

  const subImages = assignment?.attachments || [];
  const isReviewed = assignment?.status === 'reviewed';
  const isSubmitted = assignment?.status === 'submitted';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/tasks')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to tasks
        </Button>

        {isTutor && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
              <Edit3 className="mr-1.5 h-4 w-4" /> {editing ? 'Close editor' : 'Edit task'}
            </Button>
            {!confirmDelete ? (
              <Button variant="outline" size="sm" className="text-crimson" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 border-2 border-crimson bg-surface-alert px-2.5 py-1">
                <span className="text-[12px] font-bold text-crimson">Delete task?</span>
                <Button size="sm" variant="destructive" disabled={deleting} onClick={handleDeleteTask}>
                  {deleting ? 'Deleting…' : 'Confirm'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tutor edit form */}
      {isTutor && editing && (
        <form
          onSubmit={handleSaveEdit}
          className="border-2 border-ink bg-paper p-5 shadow-[5px_5px_0_var(--color-ink)] space-y-4"
        >
          <h2 className="font-display text-[17px] font-extrabold uppercase text-ink">Edit Task Details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-[12px] font-bold uppercase tracking-[0.06em] text-ink">Title *</label>
              <input
                type="text"
                required
                maxLength={200}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 w-full border-2 border-ink bg-stone/40 px-3 py-2 text-[14px] text-ink focus:bg-paper focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[12px] font-bold uppercase tracking-[0.06em] text-ink">Instructions</label>
              <textarea
                rows={4}
                maxLength={4000}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="mt-1 w-full border-2 border-ink bg-stone/40 px-3 py-2 text-[14px] text-ink focus:bg-paper focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-[0.06em] text-ink">Due date</label>
              <input
                type="datetime-local"
                value={editDueAt}
                onChange={(e) => setEditDueAt(e.target.value)}
                className="mt-1 w-full border-2 border-ink bg-stone/40 px-3 py-2 text-[14px] text-ink focus:bg-paper focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-[0.06em] text-ink">Google Forms link</label>
              <input
                type="url"
                maxLength={500}
                value={editFormUrl}
                onChange={(e) => setEditFormUrl(e.target.value)}
                placeholder="https://forms.gle/... or https://docs.google.com/forms/..."
                className="mt-1 w-full border-2 border-ink bg-stone/40 px-3 py-2 text-[14px] text-ink focus:bg-paper focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="submit" disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      )}

      {/* Main task details card */}
      <div className="border-2 border-ink bg-paper p-6 shadow-[5px_5px_0_var(--color-ink)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Assigned by {task.tutor_name}
            </p>
            <h1 className="mt-1 font-display text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
              {task.title}
            </h1>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
              <Calendar className="h-4 w-4 text-ink" />
              {task.due_at ? `Due ${fmtManilaDateTime(task.due_at)}` : 'No due date'}
            </p>
          </div>

          {task.form_url && (
            <a
              href={task.form_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 border-2 border-ink bg-gold px-4 py-2 text-[13px] font-extrabold uppercase tracking-[0.04em] text-ink shadow-[3px_3px_0_var(--color-ink)] hover:bg-[#e3bb19]"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={2.2} />
              Open form
            </a>
          )}
        </div>

        <div className="mt-4">
          {task.description ? (
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{task.description}</p>
          ) : (
            <p className="text-[13px] italic text-muted-foreground">No additional instructions provided.</p>
          )}
        </div>

        {/* Task reference images */}
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Reference images ({attachments.length}/{MAX_IMAGES})
            </p>
            {isTutor && attachments.length < MAX_IMAGES && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 border-2 border-ink bg-paper px-3 py-1 text-[12px] font-bold text-ink shadow-[2px_2px_0_var(--color-ink)] hover:bg-gold">
                <Upload className="h-3.5 w-3.5" />
                {uploadingImage ? 'Uploading…' : 'Attach image'}
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) uploadSingleImage(`/tasks/${id}/attachments`, f);
                  }}
                />
              </label>
            )}
          </div>
          {attachments.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {attachments.map((att) => (
                <div key={att.id} className="relative border-2 border-ink bg-stone/50 p-1.5">
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={att.url}
                      alt={att.file_name}
                      className="h-28 w-full object-cover border border-ink/20"
                    />
                  </a>
                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <span className="truncate text-[11px] font-semibold text-ink">{att.file_name}</span>
                    {isTutor && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="shrink-0 text-[11px] font-bold text-crimson hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* STUDENT VIEW: Classroom-style Your Work panel */}
      {!isTutor && assignment && (
        <div className="border-2 border-ink bg-paper p-6 shadow-[5px_5px_0_var(--color-ink)] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-3">
            <h2 className="font-display text-[19px] font-extrabold uppercase tracking-[-0.02em] text-ink">
              Your work
            </h2>
            {(() => {
              const display = isReviewed
                ? 'reviewed'
                : isSubmitted
                  ? (assignment.is_late ? 'late' : 'submitted')
                  : 'missing';
              const pill = statusPill(display, assignment.is_overdue);
              return (
                <span className={cn('border-2 px-2.5 py-1 text-[12px] font-extrabold uppercase tracking-[0.05em]', pill.cls)}>
                  {assignment.status === 'assigned' && !assignment.is_overdue ? 'Assigned' : pill.label}
                </span>
              );
            })()}
          </div>

          {isReviewed && (
            <div className="border-2 border-ink bg-surface-highlight p-4">
              <div className="flex items-center gap-2 text-[13px] font-extrabold uppercase text-emerald">
                <CheckCircle2 className="h-4 w-4" /> Reviewed by {task.tutor_name}
                {assignment.reviewed_at && (
                  <span className="font-normal normal-case text-muted-foreground">
                    · {fmtManilaDateTime(assignment.reviewed_at)}
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[14px] text-ink">
                {assignment.feedback || 'Marked reviewed with no extra notes.'}
              </p>
            </div>
          )}

          {assignment.status === 'assigned' ? (
            <form onSubmit={handleTurnIn} className="space-y-4">
              <div>
                <label htmlFor="sub-text" className="block text-[12px] font-bold uppercase tracking-[0.06em] text-ink">
                  Your answer / notes (plain text)
                </label>
                <textarea
                  id="sub-text"
                  rows={5}
                  maxLength={4000}
                  value={subText}
                  onChange={(e) => setSubText(e.target.value)}
                  placeholder="Write your response, solution summary, or questions for your tutor."
                  className="mt-1.5 w-full border-2 border-ink bg-stone/40 px-3 py-2.5 text-[14px] text-ink focus:bg-paper focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink">
                    Your image attachments ({subImages.length}/{MAX_IMAGES})
                  </span>
                  {subImages.length < MAX_IMAGES && (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 border-2 border-ink bg-paper px-3 py-1.5 text-[12px] font-bold text-ink shadow-[2px_2px_0_var(--color-ink)] hover:bg-gold">
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingImage ? 'Uploading…' : 'Upload image'}
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (f) uploadSingleImage(`/tasks/${id}/submission/attachments`, f);
                        }}
                      />
                    </label>
                  )}
                </div>
                {subImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {subImages.map((att) => (
                      <div key={att.id} className="border-2 border-ink bg-stone/50 p-1.5">
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={att.url} alt={att.file_name} className="h-24 w-full object-cover border border-ink/20" />
                        </a>
                        <div className="mt-1 flex items-center justify-between gap-1">
                          <span className="truncate text-[11px] font-semibold text-ink">{att.file_name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.id)}
                            className="shrink-0 text-[11px] font-bold text-crimson hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {task.form_url && (
                <label className="flex cursor-pointer items-center gap-3 border-2 border-ink bg-stone/50 px-3.5 py-3">
                  <input
                    type="checkbox"
                    checked={formCompleted}
                    onChange={(e) => setFormCompleted(e.target.checked)}
                    className="h-4 w-4 accent-ink"
                  />
                  <span className="text-[13px] font-bold text-ink">
                    I opened and completed the Google Form for this task.
                  </span>
                </label>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-4">
                {assignment.is_overdue ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-crimson">
                    <AlertTriangle className="h-4 w-4" /> Past due — this turn-in will be marked late.
                  </span>
                ) : (
                  <span className="text-[12px] text-muted-foreground">
                    You can unsubmit and edit until your tutor marks it reviewed.
                  </span>
                )}
                <Button type="submit" disabled={turningIn} className="min-h-[44px]">
                  {turningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {turningIn ? 'Turning in…' : 'Turn in'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {assignment.submitted_at && (
                <p className="text-[12px] font-semibold text-muted-foreground">
                  Turned in {fmtManilaDateTime(assignment.submitted_at)}
                  {assignment.is_late ? ' · Marked late' : ''}
                </p>
              )}
              {assignment.submission_text && (
                <div className="border-2 border-ink/30 bg-stone/40 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Your note</p>
                  <p className="mt-1 whitespace-pre-wrap text-[14px] text-ink">{assignment.submission_text}</p>
                </div>
              )}
              {task.form_url && (
                <p className="text-[13px] font-bold text-ink">
                  Google Form: {assignment.form_completed ? '✓ Confirmed completed' : 'Not confirmed'}
                </p>
              )}
              {subImages.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {subImages.map((att) => (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border-2 border-ink bg-stone/50 p-1.5"
                    >
                      <img src={att.url} alt={att.file_name} className="h-24 w-full object-cover border border-ink/20" />
                      <p className="mt-1 truncate text-[11px] font-semibold text-ink">{att.file_name}</p>
                    </a>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between border-t-2 border-ink pt-4">
                {isReviewed ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground">
                    <Lock className="h-4 w-4" /> Locked after tutor review.
                  </span>
                ) : (
                  <>
                    <span className="text-[12px] text-muted-foreground">
                      Need to fix something before review?
                    </span>
                    <Button variant="outline" disabled={unsubmitting} onClick={handleUnsubmit}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {unsubmitting ? 'Reopening…' : 'Unsubmit'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TUTOR VIEW: Per-student submissions list */}
      {isTutor && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-[20px] font-extrabold uppercase tracking-[-0.02em] text-ink">
              Student submissions ({submissions.length})
            </h2>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-extrabold uppercase">
              <span className="border-2 border-ink bg-surface-highlight px-2 py-0.5 text-ink">
                {submissions.filter((s) => s.status !== 'assigned').length} submitted
              </span>
              <span className="border-2 border-ink bg-paper px-2 py-0.5 text-muted-foreground">
                {submissions.filter((s) => s.status === 'assigned').length} missing
              </span>
              <span className="border-2 border-ink bg-gold px-2 py-0.5 text-ink">
                {submissions.filter((s) => s.is_late).length} late
              </span>
              <span className="border-2 border-ink bg-emerald px-2 py-0.5 text-paper">
                {submissions.filter((s) => s.status === 'reviewed').length} reviewed
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {submissions.map((sub) => {
              const pill = statusPill(sub.display_status, sub.is_overdue);
              return (
                <div
                  key={sub.id}
                  className="border-2 border-ink bg-paper p-5 shadow-[4px_4px_0_var(--color-ink)] space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={sub.learner_name} avatarUrl={sub.learner_avatar} size="md" />
                      <div>
                        <p className="font-display text-[16px] font-extrabold text-ink">{sub.learner_name}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {sub.learner_custom_id}{sub.learner_program ? ` · ${sub.learner_program}` : ''}
                          {sub.submitted_at ? ` · Turned in ${fmtManilaDateTime(sub.submitted_at)}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className={cn('border-2 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.05em]', pill.cls)}>
                      {pill.label}
                    </span>
                  </div>

                  {sub.status === 'assigned' ? (
                    <p className="text-[13px] italic text-muted-foreground">
                      Not turned in yet.
                    </p>
                  ) : (
                    <>
                      {sub.submission_text && (
                        <div className="border-2 border-ink/25 bg-stone/40 p-3.5">
                          <p className="whitespace-pre-wrap text-[13px] text-ink">{sub.submission_text}</p>
                        </div>
                      )}
                      {task.form_url && (
                        <p className="text-[12px] font-bold text-ink">
                          Google Form: {sub.form_completed ? '✓ Student confirmed completion' : 'Not confirmed'}
                        </p>
                      )}
                      {sub.attachments?.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {sub.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block border-2 border-ink bg-stone/50 p-1.5"
                            >
                              <img src={att.url} alt={att.file_name} className="h-24 w-full object-cover border border-ink/20" />
                              <p className="mt-1 truncate text-[11px] font-semibold text-ink">{att.file_name}</p>
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="border-t-2 border-ink/20 pt-3 space-y-2">
                        <label className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-ink">
                          <MessageSquare className="h-3.5 w-3.5" /> Tutor feedback (optional)
                        </label>
                        <textarea
                          rows={2}
                          maxLength={2000}
                          value={feedbackDrafts[sub.learner_id] ?? ''}
                          onChange={(e) =>
                            setFeedbackDrafts((prev) => ({ ...prev, [sub.learner_id]: e.target.value }))
                          }
                          placeholder="Leave short, constructive feedback for this student…"
                          className="w-full border-2 border-ink bg-stone/40 px-3 py-2 text-[13px] text-ink focus:bg-paper focus:outline-none"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            {sub.reviewed_at
                              ? `Reviewed ${fmtManilaDateTime(sub.reviewed_at)}`
                              : 'Marking reviewed locks unsubmit and notifies the student.'}
                          </span>
                          <Button
                            size="sm"
                            disabled={reviewingId === sub.learner_id}
                            onClick={() => handleReview(sub.learner_id)}
                          >
                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                            {reviewingId === sub.learner_id
                              ? 'Saving…'
                              : sub.status === 'reviewed'
                                ? 'Update feedback'
                                : 'Mark reviewed'}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
