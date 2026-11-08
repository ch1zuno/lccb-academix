import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { Button } from '../components/ui/button';
import Avatar from '../components/ui/Avatar';
import { cn } from '../lib/utils';
import api from '../api';

const MAX_BODY = 1000;

const initialsOf = (name = '') =>
  name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();

const fmtTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const fmtInboxTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const sameDay = date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
  return sameDay
    ? fmtTime(value)
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function Messages({ user, showToast, onRead }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [conversations, setConversations] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const autoSelectedRef = useRef(false);
  const onReadRef = useRef(onRead);
  const showToastRef = useRef(showToast);
  useEffect(() => { onReadRef.current = onRead; showToastRef.current = showToast; });

  const withId = params.get('with');

  const loadConversations = useCallback(() => api.get('/conversations')
    .then(({ conversations: rows }) => setConversations(rows ?? []))
    .catch(() => setConversations([])), []);

  useEffect(() => {
    if (!user) return undefined;
    loadConversations();
    const timer = setInterval(() => {
      if (!document.hidden) loadConversations();
    }, 5000);
    const onFocus = () => loadConversations();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [user?.id, loadConversations]);

  // A ?with=<userId> link (e.g. "Message" on a request card) opens that thread.
  useEffect(() => {
    if (!withId) return;
    autoSelectedRef.current = true;
    setSelectedId(withId);
  }, [withId]);

  // On desktop, open the newest conversation so the pane is never blank.
  useEffect(() => {
    if (autoSelectedRef.current || selectedId || !conversations?.length) return;
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    autoSelectedRef.current = true;
    setSelectedId(conversations[0].other_id);
  }, [conversations, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setMessages(null);
      setPeer(null);
      return undefined;
    }
    let cancelled = false;
    const load = () => api.get(`/conversations/${selectedId}/messages`)
      .then(({ user: row, messages: thread }) => {
        if (cancelled) return;
        setPeer(row ?? null);
        setMessages(thread ?? []);
        if ((thread ?? []).some(m => m.recipient_id === user.id && !m.read_at)) {
          api.post(`/conversations/${selectedId}/read`).then(() => {
            if (cancelled) return;
            setConversations(prev => prev?.map(c => (
              c.other_id === selectedId ? { ...c, unread: 0 } : c
            )));
            onReadRef.current?.();
          }).catch(() => {});
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setMessages([]);
        showToastRef.current?.(e.message || 'Could not load messages', 'error');
      });
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [selectedId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages?.length, selectedId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    try {
      const { message } = await api.post(`/conversations/${selectedId}/messages`, { body });
      setDraft('');
      setMessages(prev => [...(prev ?? []), message]);
      loadConversations();
    } catch (e) {
      showToastRef.current?.(e.message || 'Could not send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const selected = conversations?.find(c => c.other_id === selectedId) ?? null;
  const peerView = peer ?? selected;
  const peerRole = peerView?.role === 'tutor' ? 'Tutor' : 'Student';

  return (
    <div className="space-y-5">
      <div className="section-head">
        <div>
          <h1 className="section-title">Messages</h1>
          <p className="section-subtitle">Chat with the learners and tutors you have a booking with.</p>
        </div>
      </div>

      <div className="panel grid min-h-[540px] overflow-hidden lg:grid-cols-[320px_1fr]">
        {/* Inbox */}
        <aside className={cn('min-w-0 border-b-2 border-ink lg:border-b-0 lg:border-r-2', selectedId && 'hidden lg:block')}>
          <div className="flex items-center justify-between gap-3 border-b-2 border-ink bg-surface-quiet px-4 py-3">
            <h2 className="font-display text-[16px] font-bold leading-tight tracking-[-0.02em]">Conversations</h2>
            <span className="num border-2 border-ink bg-paper px-1.5 text-[13px]">{conversations?.length ?? 0}</span>
          </div>

          {conversations === null && <div className="empty">Reading your conversations…</div>}
          {conversations !== null && conversations.length === 0 && (
            <div className="empty">
              No conversations yet. Book a session with a tutor to start messaging.
            </div>
          )}
          {conversations?.map((conversation) => (
            <button
              key={conversation.other_id}
              type="button"
              onClick={() => { setSelectedId(conversation.other_id); setPeer(null); setMessages(null); }}
              className={cn(
                'flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition-colors hover:bg-surface-highlight',
                selectedId === conversation.other_id && 'bg-surface-highlight',
              )}
            >
              <Avatar
                name={conversation.name}
                avatarUrl={conversation.avatar}
                size="md"
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[14px] font-bold leading-tight text-ink">{conversation.name}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{fmtInboxTime(conversation.last_at)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-[12px] text-muted-foreground">
                    {conversation.last_body
                      ? `${conversation.last_from_me ? 'You: ' : ''}${conversation.last_body}`
                      : `Start the conversation · ${conversation.role === 'tutor' ? 'Tutor' : 'Student'}`}
                  </p>
                  {conversation.unread > 0 && (
                    <span className="num grid h-5 min-w-5 shrink-0 place-items-center border-2 border-ink bg-gold px-1 text-[12px] font-bold leading-none text-ink">
                      {conversation.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </aside>

        {/* Thread */}
        <section className={cn('flex min-h-[420px] min-w-0 flex-col', !selectedId && 'hidden lg:flex')}>
          {!selectedId && (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <span className="grid h-14 w-14 place-items-center border-2 border-ink bg-gold text-ink shadow-[3px_3px_0_var(--color-ink)]">
                <MessageSquare className="h-6 w-6" strokeWidth={2} />
              </span>
              <p className="mt-4 font-display text-[18px] font-bold tracking-[-0.02em]">Pick a conversation</p>
              <p className="mt-1 max-w-[36ch] text-[13px] text-muted-foreground">
                Your messages with learners and tutors appear here. Chats are only available once a booking exists.
              </p>
            </div>
          )}

          {selectedId && (
            <>
              <div className="flex items-center gap-3 border-b-2 border-ink bg-surface-quiet px-4 py-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center border-2 border-ink bg-paper text-ink shadow-[2px_2px_0_var(--color-ink)] lg:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${peerView?.custom_id || peerView?.other_id || peerView?.id || selectedId}`)}
                  className="shrink-0 transition-transform hover:scale-105"
                  title={`View ${peerView?.name || 'user'}'s public profile`}
                >
                  <Avatar name={peerView?.name || ''} avatarUrl={peerView?.avatar} size="sm" />
                </button>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${peerView?.custom_id || peerView?.other_id || peerView?.id || selectedId}`)}
                    className="truncate text-left text-[14px] font-bold leading-tight text-ink underline decoration-gold decoration-2 underline-offset-2 hover:decoration-ink"
                  >
                    {peerView?.name ?? 'Conversation'}
                  </button>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {peerRole}{peerView?.program ? ` · ${peerView.program}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-card px-4 py-4" style={{ maxHeight: '430px' }}>
                {messages === null && <div className="empty">Reading messages…</div>}
                {messages !== null && messages.length === 0 && (
                  <div className="empty">No messages yet — say hello.</div>
                )}
                {messages?.map((message) => {
                  const mine = message.sender_id === user.id;
                  return (
                    <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[78%] border-2 border-ink px-3 py-2 shadow-[2px_2px_0_var(--color-ink)]',
                        mine ? 'bg-gold text-ink' : 'bg-paper text-ink',
                      )}>
                        <p className="whitespace-pre-wrap break-words text-[14px] leading-snug">{message.body}</p>
                        <p className="mt-1 text-right text-[11px] text-ink/60">{fmtTime(message.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form
                onSubmit={(event) => { event.preventDefault(); send(); }}
                className="flex items-end gap-2 border-t-2 border-ink bg-paper p-3"
              >
                <div className="min-w-0 flex-1">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value.slice(0, MAX_BODY))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        send();
                      }
                    }}
                    rows={2}
                    maxLength={MAX_BODY}
                    placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
                    className="w-full resize-none border-2 border-ink bg-paper px-3 py-2 text-[14px] text-ink shadow-[2px_2px_0_rgba(0,0,0,0.16)] outline-none focus-visible:shadow-[3px_3px_0_var(--color-gold)]"
                  />
                  <p className="mt-1 text-right text-[11px] text-muted-foreground">{draft.length}/{MAX_BODY}</p>
                </div>
                <Button type="submit" disabled={!draft.trim() || sending} className="mb-5">
                  <Send className="mr-1.5 h-4 w-4" strokeWidth={2} />
                  {sending ? 'Sending…' : 'Send'}
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
