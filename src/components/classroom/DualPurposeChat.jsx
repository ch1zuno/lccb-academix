import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Bot, User, HelpCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import api from '../../api';
import { useRealtime } from '../../services/realtime';

const ROLE_BADGES = {
  student: { label: 'Learner', bg: 'bg-[#fff7d6]', border: 'border-ink', text: 'text-ink' },
  tutor: { label: 'Tutor', bg: 'bg-gold', border: 'border-ink', text: 'text-ink' },
  ai: { label: 'Antigravity AI', bg: 'bg-ink', border: 'border-ink', text: 'text-paper' },
};

export default function DualPurposeChat({ sessionId, user, role, showToast }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState('classroom'); // 'classroom' | 'ai'
  const [askingAi, setAskingAi] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  // Real-time collaborative service hook
  const { sendMessage: broadcastRealtimeMessage, onMessage } = useRealtime(sessionId);

  // 1. Initial message load from database ledger
  useEffect(() => {
    let alive = true;
    api.get(`/sessions/${sessionId}/messages`)
      .then(({ messages: rows }) => {
        if (alive) setMessages(rows || []);
      })
      .catch((e) => {
        console.warn('Could not load chat messages:', e.message);
      });
    return () => { alive = false; };
  }, [sessionId]);

  // 2. Listen for instant messages from the mock real-time layer
  useEffect(() => {
    const unsubscribe = onMessage((rtMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === rtMsg.id)) return prev;
        return [
          ...prev,
          {
            id: rtMsg.id,
            session_id: sessionId,
            sender_id: rtMsg.senderId,
            sender_name: rtMsg.senderName,
            sender_role: rtMsg.senderId === 'ai' ? 'ai' : role === 'tutor' ? 'tutor' : 'student',
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  // Send message handler
  const handleSend = async (e) => {
    e?.preventDefault?.();
    const content = inputText.trim();
    if (!content || sending) return;

    setSending(true);
    const recipientRole = activeTab === 'ai' ? 'ai' : 'all';

    try {
      const res = await api.post(`/sessions/${sessionId}/messages`, {
        content,
        recipientRole,
      });
      const savedMsg = res.message;
      setMessages((prev) => [...prev, savedMsg]);
      setInputText('');

      // Broadcast through mock realtime layer
      broadcastRealtimeMessage(content, { id: user.id, name: user.name });

      // If user directed question to AI, trigger automatic AI hint response
      if (activeTab === 'ai') {
        handleTriggerAiHint(content);
      }
    } catch (err) {
      showToast?.(err.message || 'Could not send message', 'error');
    } finally {
      setSending(false);
    }
  };

  // Trigger Antigravity AI Hint
  const handleTriggerAiHint = async (customPrompt) => {
    if (askingAi) return;
    setAskingAi(true);
    try {
      const res = await api.post(`/sessions/${sessionId}/ai/hint`, {
        queryText: customPrompt || 'Can you give me a conceptual hint on what we are working on?',
      });
      const aiMsg = res.message;
      setMessages((prev) => [...prev, aiMsg]);
      broadcastRealtimeMessage(aiMsg.content, { id: 'ai', name: 'Antigravity AI' });
      showToast?.('Antigravity AI hint posted.', 'success');
    } catch (err) {
      showToast?.(err.message || 'AI assistant request failed', 'error');
    } finally {
      setAskingAi(false);
    }
  };

  // Filter messages by active view
  const visibleMessages = messages.filter((m) => {
    if (activeTab === 'ai') {
      return m.recipient_role === 'ai' || m.sender_role === 'ai';
    }
    return m.recipient_role === 'all' || m.recipient_role === 'tutor' || m.recipient_role === 'student';
  });

  return (
    <div className="flex h-full flex-col border-2 border-ink bg-paper shadow-[4px_4px_0_#0f2942]">
      {/* Header with Mode Tabs */}
      <div className="border-b-2 border-ink bg-[#f8f1e2] p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex rounded-none border-2 border-ink bg-paper p-0.5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'classroom'}
              onClick={() => setActiveTab('classroom')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 text-[12px] font-bold transition-colors',
                activeTab === 'classroom' ? 'bg-gold text-ink' : 'text-muted-foreground hover:bg-[#fff7d6]'
              )}
            >
              <User className="h-3.5 w-3.5" />
              Classroom
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ai'}
              onClick={() => setActiveTab('ai')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 text-[12px] font-bold transition-colors',
                activeTab === 'ai' ? 'bg-ink text-paper' : 'text-muted-foreground hover:bg-[#fff7d6]'
              )}
            >
              <Bot className="h-3.5 w-3.5" />
              AI Assistant
            </button>
          </div>

          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {activeTab === 'classroom' ? 'Peer & Tutor' : 'Antigravity AI'}
          </span>
        </div>

        {/* Quick Socratic Prompt Buttons */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={askingAi}
            onClick={() => handleTriggerAiHint('Give me a conceptual hint on this problem.')}
            className="h-7 border border-ink bg-paper px-2 text-[11px] font-semibold shadow-none hover:bg-gold"
          >
            {askingAi ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-gold-ink" />}
            Ask AI for Hint
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={askingAi}
            onClick={() => handleTriggerAiHint('Can you explain this with a simple real-world analogy?')}
            className="h-7 border border-ink bg-paper px-2 text-[11px] font-semibold shadow-none hover:bg-gold"
          >
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
            Simple Analogy
          </Button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {visibleMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
            {activeTab === 'classroom' ? (
              <>
                <User className="h-8 w-8 text-ink/30 mb-2" />
                <p className="text-[13px] font-semibold text-ink">Classroom chat is ready.</p>
                <p className="text-[12px]">Messages sent here are visible to both tutor and student.</p>
              </>
            ) : (
              <>
                <Bot className="h-8 w-8 text-ink/30 mb-2" />
                <p className="text-[13px] font-semibold text-ink">Antigravity AI is standing by.</p>
                <p className="text-[12px]">Tap &quot;Ask AI for Hint&quot; or type below to receive real-time peer-tutoring cues.</p>
              </>
            )}
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            const badge = ROLE_BADGES[msg.sender_role] || ROLE_BADGES.student;
            const isAi = msg.sender_role === 'ai';

            return (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col',
                  isAi ? 'items-start' : isMe ? 'items-end' : 'items-start'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px]">
                  <span className={cn('px-1.5 py-0.2 border text-[10px] font-bold', badge.bg, badge.border, badge.text)}>
                    {badge.label}
                  </span>
                  <span className="font-semibold text-ink">{msg.sender_name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={cn(
                    'max-w-[88%] border-2 border-ink p-2.5 text-[13px] leading-snug shadow-[2px_2px_0_#0f2942]',
                    isAi
                      ? 'bg-[#fdfaf2] border-ink font-sans text-ink'
                      : isMe
                      ? 'bg-gold text-ink'
                      : 'bg-paper text-ink'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Composer */}
      <form onSubmit={handleSend} className="border-t-2 border-ink bg-[#f8f1e2] p-2.5 flex items-center gap-2">
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={activeTab === 'ai' ? 'Ask Antigravity AI a question...' : 'Message the classroom...'}
          className="h-10 text-[13px] border-2 border-ink bg-paper"
          disabled={sending}
        />
        <Button
          type="submit"
          size="sm"
          disabled={sending || !inputText.trim()}
          className="h-10 px-3 shrink-0"
          aria-label="Send message"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
