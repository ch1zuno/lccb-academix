import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Plus,
  X,
  Calendar,
  ExternalLink,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  ChevronRight,
  Loader2,
  Upload,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { fmtManilaDateTime } from '../lib/ux';
import api from '../api';

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function studentBadge(task) {
  if (task.status === 'reviewed') {
    return { label: 'Reviewed', cls: 'bg-emerald text-paper border-ink' };
  }
  if (task.status === 'submitted') {
    return task.is_late
      ? { label: 'Submitted late', cls: 'bg-gold text-ink border-ink' }
      : { label: 'Submitted', cls: 'bg-surface-highlight text-ink border-ink' };
  }
  if (task.is_overdue) {
    return { label: 'Overdue', cls: 'bg-crimson text-paper border-ink' };
  }
  return { label: 'Assigned', cls: 'bg-gold text-ink border-ink' };
}

export default function Tasks({ role, showToast }) {
  const navigate = useNavigate();
  const isTutor = role === 'tutor';

  const [tasks, setTasks] = useState([]);
  const [tutees, setTutees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  // Create task state (tutor)
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [selectedLearners, setSelectedLearners] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const reqs = [api.get('/tasks')];
      if (isTutor) reqs.push(api.get('/tasks/tutees'));
      const [tasksRes, tuteesRes] = await Promise.all(reqs);
      setTasks(tasksRes.tasks || []);
      if (tuteesRes) setTutees(tuteesRes.tutees || []);
    } catch (err) {
      setError(err.message || 'Could not load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const toggleLearner = (id) => {
    setSelectedLearners((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllLearners = () => {
    if (selectedLearners.length === tutees.length) {
      setSelectedLearners([]);
    } else {
      setSelectedLearners(tutees.map((t) => t.id));
    }
  };

  const handlePickImages = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const next = [...pendingImages];
    for (const file of files) {
      if (next.length >= MAX_IMAGES) {
        showToast?.(`You can attach up to ${MAX_IMAGES} images per task.`, 'error');
        break;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        showToast?.(`${file.name}: only PNG, JPG, and WEBP images are allowed.`, 'error');
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        showToast?.(`${file.name}: exceeds the 4 MB image limit.`, 'error');
        continue;
      }
      next.push(file);
    }
    setPendingImages(next);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast?.('Enter a task title.', 'error');
      return;
    }
    if (selectedLearners.length === 0) {
      showToast?.('Select at least one tutee.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        formUrl: formUrl.trim() || null,
        learnerIds: selectedLearners,
      };
      const { task } = await api.post('/tasks', payload);

      let uploadErrors = 0;
      for (const file of pendingImages) {
        const fd = new FormData();
        fd.append('image', file);
        try {
          await api.upload(`/tasks/${task.id}/attachments`, fd);
        } catch {
          uploadErrors += 1;
        }
      }

      setTitle('');
      setDescription('');
      setDueAt('');
      setFormUrl('');
      setSelectedLearners([]);
      setPendingImages([]);
      setShowCreate(false);
      showToast?.(
        uploadErrors
          ? `Task assigned, but ${uploadErrors} image(s) failed to upload.`
          : `Task assigned to ${selectedLearners.length} tutee${selectedLearners.length === 1 ? '' : 's'}.`,
        uploadErrors ? 'error' : 'success',
      );
      await loadData();
    } catch (err) {
      showToast?.(err.message || 'Could not create task.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudentTasks = tasks.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return Boolean(t.is_overdue);
    if (filter === 'assigned') return t.status === 'assigned' && !t.is_overdue;
    if (filter === 'submitted') return t.status === 'submitted';
    if (filter === 'reviewed') return t.status === 'reviewed';
    return true;
  });

  const counts = {
    all: tasks.length,
    assigned: tasks.filter((t) => t.status === 'assigned' && !t.is_overdue).length,
    overdue: tasks.filter((t) => Boolean(t.is_overdue)).length,
    submitted: tasks.filter((t) => t.status === 'submitted').length,
    reviewed: tasks.filter((t) => t.status === 'reviewed').length,
  };

  return (
    <div className="space-y-6">
      <div className="section-head">
        <div>
          <h1 className="section-title">Tasks</h1>
          <p className="section-subtitle">
            {isTutor
              ? 'Assign practice tasks, Google Forms, and worksheets to your active tutees.'
              : 'Track assigned work, turn in submissions, and read tutor feedback.'}
          </p>
        </div>
        {isTutor && (
          <Button
            onClick={() => setShowCreate((v) => !v)}
            className="min-h-[44px] shrink-0"
          >
            {showCreate ? <X className="mr-2 h-4 w-4" strokeWidth={2.2} /> : <Plus className="mr-2 h-4 w-4" strokeWidth={2.2} />}
            {showCreate ? 'Close form' : 'Assign task'}
          </Button>
        )}
      </div>

      {/* Tutor create task form */}
      {isTutor && showCreate && (
        <form
          onSubmit={handleCreate}
          className="border-2 border-ink bg-paper p-5 shadow-[5px_5px_0_var(--color-ink)] sm:p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b-2 border-ink pb-3">
            <h2 className="font-display text-[18px] font-extrabold uppercase tracking-[-0.02em] text-ink">
              New Task
            </h2>
            <span className="border-2 border-ink bg-gold px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-ink">
              High-priority alert
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="task-title" className="block text-[12px] font-bold uppercase tracking-[0.06em] text-ink">
                Title *
              </label>
              <input
                id="task-title"
                type="text"
                maxLength={200}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Linked Lists Dry-Run Worksheet"
                className="mt-1.5 w-full border-2 border-ink bg-stone/40 px-3 py-2.5 text-[14px] text-ink focus:bg-paper focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="task-desc" className="block text-[12px] font-bold uppercase tracking-[0.06em] text-ink">
                Instructions (plain text)
              </label>
              <textarea
                id="task-desc"
                rows={4}
                maxLength={4000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what the student should work on and turn in."
                className="mt-1.5 w-full border-2 border-ink bg-stone/40 px-3 py-2.5 text-[14px] text-ink focus:bg-paper focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>

            <div>
              <label htmlFor="task-due" className="block text-[12px] font-bold uppercase tracking-[0.06em] text-ink">
                Due date (optional)
              </label>
              <input
                id="task-due"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="mt-1.5 w-full border-2 border-ink bg-stone/40 px-3 py-2.5 text-[14px] text-ink focus:bg-paper focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>

            <div>
              <label htmlFor="task-form" className="block text-[12px] font-bold uppercase tracking-[0.06em] text-ink">
                Google Forms link (optional)
              </label>
              <input
                id="task-form"
                type="url"
                maxLength={500}
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://forms.gle/... or https://docs.google.com/forms/..."
                className="mt-1.5 w-full border-2 border-ink bg-stone/40 px-3 py-2.5 text-[14px] text-ink focus:bg-paper focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
          </div>

          {/* Tutees picker */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink">
                Assign to active tutees * ({selectedLearners.length} selected)
              </label>
              {tutees.length > 1 && (
                <button
                  type="button"
                  onClick={selectAllLearners}
                  className="text-[12px] font-bold text-ink underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink"
                >
                  {selectedLearners.length === tutees.length ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>
            {tutees.length === 0 ? (
              <p className="mt-2 border-2 border-dashed border-ink/40 bg-stone/50 px-3 py-3 text-[13px] text-muted-foreground">
                No active tutees found yet. Once a student has a booking, session, or referral with you, they will appear here.
              </p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tutees.map((t) => {
                  const active = selectedLearners.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleLearner(t.id)}
                      className={cn(
                        'flex items-center justify-between gap-2 border-2 border-ink px-3 py-2.5 text-left transition-colors',
                        active
                          ? 'bg-gold font-bold text-ink shadow-[2px_2px_0_var(--color-ink)]'
                          : 'bg-paper text-ink hover:bg-surface-highlight',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold">{t.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {t.custom_id}{t.program ? ` · ${t.program}` : ''}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'grid h-5 w-5 shrink-0 place-items-center border-2 border-ink text-[11px] font-extrabold',
                          active ? 'bg-ink text-gold' : 'bg-paper',
                        )}
                      >
                        {active ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Image attachments */}
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-[0.06em] text-ink">
              Reference images (optional · max {MAX_IMAGES}, 4 MB each, PNG/JPG/WEBP)
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 border-2 border-ink bg-paper px-3 py-1.5 text-[13px] font-bold text-ink shadow-[2px_2px_0_var(--color-ink)] hover:bg-gold">
                <Upload className="h-4 w-4" strokeWidth={2.2} />
                Add images ({pendingImages.length}/{MAX_IMAGES})
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={handlePickImages}
                  disabled={pendingImages.length >= MAX_IMAGES}
                />
              </label>
              {pendingImages.map((file, idx) => (
                <span
                  key={`${file.name}-${idx}`}
                  className="inline-flex items-center gap-1.5 border-2 border-ink bg-surface-highlight px-2.5 py-1 text-[12px] font-semibold text-ink"
                >
                  <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="max-w-[160px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setPendingImages((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label={`Remove ${file.name}`}
                    className="ml-1 font-bold text-crimson hover:opacity-75"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-ink pt-4">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || tutees.length === 0}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />}
              {submitting ? 'Assigning…' : 'Assign task'}
            </Button>
          </div>
        </form>
      )}

      {/* Student status filter bar */}
      {!isTutor && !loading && (
        <div className="flex flex-wrap gap-2">
          {[
            ['all', 'All'],
            ['assigned', 'Assigned'],
            ['overdue', 'Overdue'],
            ['submitted', 'Submitted'],
            ['reviewed', 'Reviewed'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'inline-flex min-h-[40px] items-center gap-2 border-2 border-ink px-3.5 py-1.5 text-[13px] font-bold transition-colors',
                filter === key
                  ? 'bg-ink text-gold shadow-[3px_3px_0_var(--color-gold)]'
                  : 'bg-paper text-ink hover:bg-gold',
              )}
            >
              <span>{label}</span>
              <span className={cn('num px-1.5 py-0.5 text-[11px] font-extrabold border border-ink', filter === key ? 'bg-gold text-ink' : 'bg-stone text-ink')}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="panel flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-ink" strokeWidth={2.2} />
          <p className="mt-3 font-display text-[15px] font-bold">Loading tasks…</p>
        </div>
      )}

      {!loading && error && (
        <div className="border-2 border-crimson bg-surface-alert p-5 text-ink shadow-[3px_3px_0_var(--color-ink)]">
          <p className="font-bold text-crimson">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadData}>Retry</Button>
        </div>
      )}

      {!loading && !error && (isTutor ? tasks : filteredStudentTasks).length === 0 && (
        <div className="panel flex flex-col items-center px-6 py-14 text-center">
          <ClipboardList className="mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.8} />
          <p className="font-display text-[18px] font-extrabold text-ink">
            {isTutor ? 'No tasks assigned yet' : 'No tasks in this view'}
          </p>
          <p className="mt-1.5 max-w-[420px] text-[13px] text-muted-foreground">
            {isTutor
              ? 'Create your first Classroom-style task to guide your tutees between sessions.'
              : 'When an accredited tutor assigns you a worksheet or form, it will show up here.'}
          </p>
        </div>
      )}

      {/* Task cards */}
      {!loading && !error && (
        <div className="grid gap-4">
          {(isTutor ? tasks : filteredStudentTasks).map((task) => {
            const badge = !isTutor ? studentBadge(task) : null;
            return (
              <div
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/tasks/${task.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/tasks/${task.id}`); } }}
                className="group cursor-pointer border-2 border-ink bg-paper p-5 shadow-[4px_4px_0_var(--color-ink)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--color-ink)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!isTutor && badge && (
                        <span className={cn('border-2 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.05em]', badge.cls)}>
                          {badge.label}
                        </span>
                      )}
                      {task.form_url && (
                        <span className="inline-flex items-center gap-1 border-2 border-ink bg-paper px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] text-ink">
                          <ExternalLink className="h-3 w-3" /> Google Form
                        </span>
                      )}
                      {Number(task.attachment_count) > 0 && (
                        <span className="inline-flex items-center gap-1 border-2 border-ink/40 bg-stone px-2 py-0.5 text-[11px] font-bold text-ink">
                          <ImageIcon className="h-3 w-3" /> {task.attachment_count} image{Number(task.attachment_count) === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 font-display text-[19px] font-extrabold leading-snug text-ink group-hover:underline decoration-gold decoration-2 underline-offset-4">
                      {task.title}
                    </h2>
                    {task.description && (
                      <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] font-semibold text-muted-foreground">
                      {!isTutor && task.tutor_name && (
                        <span className="inline-flex items-center gap-1 text-ink">
                          <Users className="h-3.5 w-3.5" /> Tutor: {task.tutor_name}
                        </span>
                      )}
                      <span className={cn('inline-flex items-center gap-1', task.is_overdue && 'font-bold text-crimson')}>
                        <Calendar className="h-3.5 w-3.5" />
                        {task.due_at ? `Due ${fmtManilaDateTime(task.due_at)}` : 'No due date'}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isTutor && (
                      <div className="flex flex-wrap gap-1.5 text-[11px] font-extrabold uppercase">
                        <span className="border-2 border-ink bg-surface-highlight px-2 py-1 text-ink">
                          {task.submitted_count}/{task.assigned_count} turned in
                        </span>
                        {Number(task.missing_count) > 0 && (
                          <span className="border-2 border-ink bg-paper px-2 py-1 text-muted-foreground">
                            {task.missing_count} missing
                          </span>
                        )}
                        {Number(task.late_count) > 0 && (
                          <span className="border-2 border-ink bg-gold px-2 py-1 text-ink">
                            {task.late_count} late
                          </span>
                        )}
                        {Number(task.reviewed_count) > 0 && (
                          <span className="border-2 border-ink bg-emerald px-2 py-1 text-paper">
                            {task.reviewed_count} reviewed
                          </span>
                        )}
                      </div>
                    )}
                    <ChevronRight className="h-5 w-5 text-ink transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>

                {!isTutor && task.status === 'reviewed' && task.feedback && (
                  <div className="mt-3 border-l-4 border-emerald bg-stone/60 px-3 py-2 text-[12px] text-ink">
                    <span className="font-bold uppercase tracking-[0.04em] text-emerald">Tutor feedback: </span>
                    {task.feedback}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
