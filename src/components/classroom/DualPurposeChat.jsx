import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  User,
  Loader2,
  StickyNote,
  Download,
  Check,
  Trash2,
  FileText,
  X,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import api from '../../api';
import { useRealtime } from '../../services/realtime';
import {
  downloadNotesPdf,
  formatAutoSaveFilename,
  sanitizePdfFilename,
} from '../../lib/pdfNotes';

const ROLE_BADGES = {
  student: { label: 'Learner', bg: 'bg-surface-highlight', border: 'border-ink', text: 'text-ink' },
  tutor: { label: 'Tutor', bg: 'bg-gold', border: 'border-ink', text: 'text-ink' },
};

export default function DualPurposeChat({
  sessionId,
  session,
  user,
  role,
  showToast,
  onRegisterNoteFlush,
}) {
  const subjectName = session?.subject || 'Session';
  const storageKey = `academix_session_notes_${sessionId || 'default'}`;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState('classroom'); // 'classroom' | 'notepad'
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  // Google Keep-style Notepad state (persisted in localStorage per session)
  const [noteTitle, setNoteTitle] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.title) return parsed.title;
      }
    } catch { /* ignore */ }
    return `${subjectName} Notes`;
  });

  const [noteContent, setNoteContent] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.content === 'string') return parsed.content;
      }
    } catch { /* ignore */ }
    return '';
  });

  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.lastSavedSnapshot === 'string') return parsed.lastSavedSnapshot;
      }
    } catch { /* ignore */ }
    return '';
  });

  const [isNamingPdf, setIsNamingPdf] = useState(false);
  const [customFileName, setCustomFileName] = useState('');

  // Refs for unmount / session-end auto-save check
  const noteTitleRef = useRef(noteTitle);
  const noteContentRef = useRef(noteContent);
  const lastSavedSnapshotRef = useRef(lastSavedSnapshot);
  const autoSaveTriggeredRef = useRef(false);

  useEffect(() => {
    noteTitleRef.current = noteTitle;
    noteContentRef.current = noteContent;
    lastSavedSnapshotRef.current = lastSavedSnapshot;
    // Reset autoSaveTriggeredRef if user types new content after a save
    const currentSnapshot = `${noteTitle.trim()}\n${noteContent.trim()}`;
    if (noteContent.trim().length > 0 && currentSnapshot !== lastSavedSnapshot) {
      autoSaveTriggeredRef.current = false;
    }
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          title: noteTitle,
          content: noteContent,
          lastSavedSnapshot,
        })
      );
    } catch { /* ignore storage quota errors */ }
  }, [noteTitle, noteContent, lastSavedSnapshot, storageKey]);

  const hasNoteContent = noteContent.trim().length > 0;
  const currentSnapshot = `${noteTitle.trim()}\n${noteContent.trim()}`;
  const isSaved = hasNoteContent && currentSnapshot === lastSavedSnapshot;

  // Automatic save function when student forgets to save before ending/leaving session
  const flushUnsavedNotes = useCallback(() => {
    const content = noteContentRef.current.trim();
    if (!content) return false;

    const title = noteTitleRef.current.trim() || `${subjectName} Notes`;
    const snapshot = `${title}\n${content}`;
    if (snapshot === lastSavedSnapshotRef.current || autoSaveTriggeredRef.current) {
      return false;
    }

    autoSaveTriggeredRef.current = true;
    const autoFileName = formatAutoSaveFilename(subjectName);

    downloadNotesPdf(
      {
        title,
        subject: subjectName,
        topic: session?.topic || '',
        sessionCode: session?.session_code || '',
        studentName: user?.name || 'Student',
        content,
      },
      autoFileName
    );

    lastSavedSnapshotRef.current = snapshot;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          title,
          content: noteContentRef.current,
          lastSavedSnapshot: snapshot,
        })
      );
    } catch { /* ignore */ }

    showToast?.(`Unsaved notes automatically saved as "${autoFileName}".`, 'info');
    return true;
  }, [subjectName, session?.topic, session?.session_code, user?.name, storageKey, showToast]);

  // Register flush callback with parent LiveClassroom & handle unmount / tab close
  useEffect(() => {
    onRegisterNoteFlush?.(flushUnsavedNotes);
  }, [onRegisterNoteFlush, flushUnsavedNotes]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      flushUnsavedNotes();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushUnsavedNotes();
    };
  }, [flushUnsavedNotes]);

  // Manual Save as PDF with custom student-chosen name
  const openSaveDialog = () => {
    if (!hasNoteContent) {
      showToast?.('Type some notes first before saving as PDF.', 'warning');
      return;
    }
    const defaultBase = (noteTitle.trim() || `${subjectName}_Notes`).replace(/\.pdf$/i, '');
    setCustomFileName(defaultBase);
    setIsNamingPdf(true);
  };

  const handleConfirmSavePdf = (e) => {
    e?.preventDefault?.();
    const content = noteContent.trim();
    if (!content) return;

    const title = noteTitle.trim() || `${subjectName} Notes`;
    const finalFileName = sanitizePdfFilename(customFileName || title, subjectName);

    downloadNotesPdf(
      {
        title,
        subject: subjectName,
        topic: session?.topic || '',
        sessionCode: session?.session_code || '',
        studentName: user?.name || 'Student',
        content,
      },
      finalFileName
    );

    const snapshot = `${title}\n${content}`;
    setLastSavedSnapshot(snapshot);
    lastSavedSnapshotRef.current = snapshot;
    autoSaveTriggeredRef.current = true;
    setIsNamingPdf(false);
    showToast?.(`Notes saved as "${finalFileName}".`, 'success');
  };

  const handleClearNotes = () => {
    setNoteContent('');
    setLastSavedSnapshot('');
    lastSavedSnapshotRef.current = '';
    setIsNamingPdf(false);
    try {
      localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  };

  // Real-time collaborative service hook for Classroom Chat
  const { sendMessage: broadcastRealtimeMessage, onMessage } = useRealtime(sessionId);

  // 1. Initial message load and periodic ledger sync
  useEffect(() => {
    let alive = true;
    const fetchMessages = () => {
      api.get(`/sessions/${sessionId}/messages`)
        .then(({ messages: rows }) => {
          if (alive && rows) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => String(m.id)));
              const newRows = rows.filter((r) => !existingIds.has(String(r.id)));
              if (newRows.length === 0) return prev;
              return [...prev, ...newRows];
            });
          }
        })
        .catch((e) => {
          console.warn('Could not sync chat messages:', e.message);
        });
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [sessionId]);

  // 2. Listen for instant messages from the real-time layer
  useEffect(() => {
    const unsubscribe = onMessage((rtMsg) => {
      if (rtMsg.senderId === 'ai' || rtMsg.senderRole === 'ai') return;
      setMessages((prev) => {
        if (prev.some((m) => String(m.id) === String(rtMsg.id))) return prev;
        return [
          ...prev,
          {
            id: rtMsg.id,
            session_id: sessionId,
            sender_id: rtMsg.senderId,
            sender_name: rtMsg.senderName,
            sender_role: rtMsg.senderRole || (role === 'tutor' ? 'tutor' : 'student'),
            recipient_role: 'all',
            content: rtMsg.text,
            created_at: rtMsg.timestamp,
          },
        ];
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, [onMessage, sessionId, role]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'classroom' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  // Send message handler
  const handleSend = async (e) => {
    e?.preventDefault?.();
    const content = inputText.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      const res = await api.post(`/sessions/${sessionId}/messages`, {
        content,
        recipientRole: 'all',
      });
      const savedMsg = res.message;
      setMessages((prev) => [...prev, savedMsg]);
      setInputText('');

      broadcastRealtimeMessage(
        { text: content, id: String(savedMsg.id) },
        { id: user.id, name: user.name }
      );
    } catch (err) {
      showToast?.(err.message || 'Could not send message', 'error');
    } finally {
      setSending(false);
    }
  };

  // Filter out any legacy AI messages so only peer & tutor messages appear
  const visibleMessages = messages.filter(
    (m) => m.sender_role !== 'ai' && m.recipient_role !== 'ai'
  );

  const wordCount = hasNoteContent ? noteContent.trim().split(/\s+/).length : 0;
  const charCount = noteContent.length;
  const autoSaveDefaultName = formatAutoSaveFilename(subjectName);

  return (
    <div className="flex h-full flex-col border-2 border-ink bg-paper shadow-[3px_3px_0_var(--color-ink)] min-w-0 min-h-0 overflow-hidden">
      {/* Header with Classroom & Notepad Tabs right beside each other */}
      <div className="border-b-2 border-ink bg-surface-quiet p-2 sm:p-2.5 shrink-0">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex rounded-none border-2 border-ink bg-paper p-0.5 shrink-0" role="tablist" aria-label="Classroom tools">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'classroom'}
              onClick={() => setActiveTab('classroom')}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 text-[11px] sm:text-[12px] font-bold transition-colors',
                activeTab === 'classroom'
                  ? 'bg-gold text-ink'
                  : 'text-muted-foreground hover:bg-surface-highlight hover:text-ink'
              )}
            >
              <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Classroom
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'notepad'}
              onClick={() => setActiveTab('notepad')}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 text-[11px] sm:text-[12px] font-bold transition-colors',
                activeTab === 'notepad'
                  ? 'bg-gold text-ink'
                  : 'text-muted-foreground hover:bg-surface-highlight hover:text-ink'
              )}
            >
              <StickyNote className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Notepad
              {hasNoteContent && !isSaved && (
                <span
                  title="Unsaved notes (will auto-download if you leave)"
                  className="ml-0.5 h-2 w-2 rounded-full border border-ink bg-amber-500"
                />
              )}
              {hasNoteContent && isSaved && (
                <span
                  title="Notes saved as PDF"
                  className="ml-0.5 h-2 w-2 rounded-full border border-ink bg-emerald"
                />
              )}
            </button>
          </div>

          <span className="truncate text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {activeTab === 'classroom' ? 'Peer & Tutor' : 'Keep Notes'}
          </span>
        </div>
      </div>

      {/* ─── Tab 1: Classroom Chatbox ───────────────────────────── */}
      {activeTab === 'classroom' && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-2 min-h-0 min-w-0">
            {visibleMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-4 text-center text-muted-foreground">
                <User className="h-7 w-7 text-ink/30 mb-1.5" />
                <p className="text-[12px] sm:text-[13px] font-semibold text-ink">Classroom chat is ready.</p>
                <p className="text-[11px]">Messages sent here are visible to both tutor and student.</p>
              </div>
            ) : (
              visibleMessages.map((msg) => {
                const isMe = msg.sender_id === user.id;
                const badge = ROLE_BADGES[msg.sender_role] || ROLE_BADGES.student;

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex flex-col min-w-0 max-w-full',
                      isMe ? 'items-end' : 'items-start'
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5 text-[10px] sm:text-[11px] max-w-full">
                      <span className={cn('px-1 py-0.2 border text-[9px] sm:text-[10px] font-bold shrink-0', badge.bg, badge.border, badge.text)}>
                        {badge.label}
                      </span>
                      <span className="font-semibold text-ink truncate max-w-[120px] sm:max-w-[160px]">{msg.sender_name}</span>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground shrink-0">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className={cn(
                        'max-w-[92%] border-2 border-ink p-2 sm:p-2.5 text-[12px] sm:text-[13px] leading-snug shadow-[2px_2px_0_var(--color-ink)] break-words [overflow-wrap:anywhere]',
                        isMe ? 'bg-gold text-ink' : 'bg-paper text-ink'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSend} className="border-t-2 border-ink bg-surface-quiet p-2 sm:p-2.5 flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Message the classroom..."
              className="h-9 sm:h-10 text-[12px] sm:text-[13px] border-2 border-ink bg-paper min-w-0 flex-1"
              disabled={sending}
            />
            <Button
              type="submit"
              size="sm"
              disabled={sending || !inputText.trim()}
              className="h-9 sm:h-10 px-2.5 sm:px-3 shrink-0"
              aria-label="Send message"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </>
      )}

      {/* ─── Tab 2: Google Keep-Style Session Notepad ───────────── */}
      {activeTab === 'notepad' && (
        <div className="flex flex-1 flex-col min-h-0 min-w-0 bg-[#FFFDF5]">
          {/* Keep-Style Note Title Bar */}
          <div className="border-b-2 border-ink/20 bg-[#FFF9DB] px-3 py-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title..."
                aria-label="Note title"
                className="w-full bg-transparent font-display text-[14px] sm:text-[15px] font-extrabold text-ink placeholder:text-ink/45 focus:outline-none"
              />
              {hasNoteContent ? (
                isSaved ? (
                  <span className="inline-flex shrink-0 items-center gap-1 border border-emerald-800 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                ) : (
                  <span
                    title={`Will auto-download as ${autoSaveDefaultName} if you leave without saving`}
                    className="inline-flex shrink-0 items-center gap-1 border border-ink bg-gold px-1.5 py-0.5 text-[10px] font-bold text-ink"
                  >
                    Unsaved
                  </span>
                )
              ) : (
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-ink/50">
                  {subjectName}
                </span>
              )}
            </div>
          </div>

          {/* Keep-Style Memo Body */}
          <div className="flex-1 flex flex-col min-h-0 p-2.5 sm:p-3">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder={`Take notes during your ${subjectName} session…\n\n• Type key concepts, steps, or examples here.\n• Click "Save as PDF" below to name and download your notes.\n• If you forget to save, your notes automatically download as "${autoSaveDefaultName}" when the session ends.`}
              aria-label="Session notepad content"
              className="w-full flex-1 resize-none bg-transparent font-sans text-[13px] leading-relaxed text-ink placeholder:text-ink/45 focus:outline-none"
            />
          </div>

          {/* Inline Custom PDF Filename Prompt (when saving) */}
          {isNamingPdf && (
            <form
              onSubmit={handleConfirmSavePdf}
              className="border-t-2 border-ink bg-surface-highlight p-2.5 shrink-0 space-y-2"
            >
              <div className="flex items-center justify-between">
                <label htmlFor="pdf-custom-filename" className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-ink">
                  <FileText className="h-3.5 w-3.5" />
                  Name your PDF file
                </label>
                <button
                  type="button"
                  onClick={() => setIsNamingPdf(false)}
                  className="text-ink/60 hover:text-ink"
                  aria-label="Cancel save as PDF"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1 min-w-0">
                  <Input
                    id="pdf-custom-filename"
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                    placeholder={`${subjectName}_Notes`}
                    autoFocus
                    className="h-8 pr-11 text-[12px] font-semibold border-2 border-ink bg-paper"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground">
                    .pdf
                  </span>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 px-3 text-[11px] font-extrabold shrink-0"
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Download
                </Button>
              </div>
            </form>
          )}

          {/* Notepad Footer Toolbar */}
          <div className="border-t-2 border-ink bg-surface-quiet px-2.5 py-2 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-[10px] sm:text-[11px] font-semibold text-muted-foreground">
                {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} chars
              </span>
              {hasNoteContent && (
                <button
                  type="button"
                  onClick={handleClearNotes}
                  title="Clear notepad"
                  className="inline-flex items-center gap-0.5 text-[11px] font-bold text-crimson hover:underline shrink-0"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              disabled={!hasNoteContent}
              onClick={openSaveDialog}
              className="h-8 px-3 text-[11px] sm:text-[12px] font-extrabold shrink-0"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Save as PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
