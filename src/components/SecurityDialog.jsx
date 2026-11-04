import React, { useEffect, useRef, useState } from 'react';
import { KeyRound, Loader2, ShieldOff, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import api from '../api';
import { saveSession } from '../authToken';
import { focusFirst, trapTabKey } from '../lib/focusTrap';

/**
 * Password change and "sign out everywhere". Both endpoints bump
 * token_version server-side; change-password also returns a fresh token so the
 * current device stays signed in.
 */
export default function SecurityDialog({ onClose, onSignOut, showToast }) {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    restoreRef.current = document.activeElement;
    focusFirst(panelRef.current, '#security-current');
    return () => restoreRef.current?.focus?.();
  }, []);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    trapTabKey(event, panelRef.current);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setDone('');
    if (newPassword !== confirm) {
      setError('The new passwords do not match.');
      return;
    }
    if (newPassword.length < 10) {
      setError('Use at least 10 characters.');
      return;
    }
    setBusy(true);
    try {
      const result = await api.post('/auth/change-password', { currentPassword, newPassword });
      saveSession(result.user);
      setDone('Password changed. Other devices were signed out.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      showToast?.('Password changed.', 'success');
    } catch (e) {
      setError(e.message || 'Could not change the password.');
    } finally {
      setBusy(false);
    }
  };

  const signOutEverywhere = async () => {
    setError('');
    setDone('');
    setBusy(true);
    try {
      await api.post('/auth/logout-all');
      showToast?.('Signed out everywhere.', 'success');
      onSignOut?.();
      onClose();
    } catch (e) {
      setError(e.message || 'Could not sign out everywhere.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/35 p-4" role="presentation">
      <button type="button" aria-label="Close security settings" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-title"
        onKeyDown={onKeyDown}
        className="relative w-full max-w-[470px] border-2 border-ink bg-paper shadow-[7px_7px_0_#0f2942]"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-ink px-5 py-4">
          <div>
            <p className="meta uppercase tracking-[0.12em]">Account</p>
            <h2 id="security-title" className="mt-1 font-display text-[24px] font-extrabold leading-tight tracking-[-0.02em]">
              Security
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center border-2 border-ink bg-paper hover:bg-gold"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-5 py-5">
          <div>
            <label htmlFor="security-current" className="text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
              Current password
            </label>
            <Input
              id="security-current"
              type="password"
              autoComplete="current-password"
              className="mt-1.5"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="security-new" className="text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
              New password
            </label>
            <Input
              id="security-new"
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={72}
              className="mt-1.5"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="security-confirm" className="text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
              Confirm new password
            </label>
            <Input
              id="security-confirm"
              type="password"
              autoComplete="new-password"
              className="mt-1.5"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          {error && <p role="alert" className="border-2 border-crimson bg-[#fff1ef] px-3 py-2 text-[13px] font-semibold text-crimson">{error}</p>}
          {done && <p role="status" className="border-2 border-ink bg-[#eef7e6] px-3 py-2 text-[13px] font-semibold text-ink">{done}</p>}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" strokeWidth={1.9} />}
              Change password
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink bg-[#f7f0e2] px-5 py-3.5">
          <p className="max-w-[250px] text-[12px] leading-snug text-muted-foreground">
            Signing out everywhere revokes every token issued to this account.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={signOutEverywhere} disabled={busy}>
            <ShieldOff className="h-4 w-4" strokeWidth={1.9} /> Sign out everywhere
          </Button>
        </div>
      </section>
    </div>
  );
}
