import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KeyRound,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Copy,
  User,
  X,
  Upload,
  Trash2,
  Check,
  BookOpen,
  Award,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Avatar from './ui/Avatar';
import api from '../api';
import { saveSession } from '../authToken';
import { focusFirst, trapTabKey } from '../lib/focusTrap';
import { validateAvatarFile, cropAndResizeToCanvas } from '../lib/avatarUpload';
import { cn } from '../lib/utils';

export default function AccountDialog({
  user,
  onClose,
  onSignOut,
  showToast,
  initialTab = 'profile',
  onUserUpdated,
}) {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const restoreRef = useRef(null);
  const fileInputRef = useRef(null);

  const [tab, setTab] = useState(initialTab);

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const [avatarBase64, setAvatarBase64] = useState(undefined); // undefined: untouched, null: delete, string: new
  const [avatarError, setAvatarError] = useState('');
  const [processingImage, setProcessingImage] = useState(false);

  // Tutor subjects
  const [allSubjects, setAllSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState(
    () => (user?.subjects || []).map((s) => s.id).filter(Boolean)
  );
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Profile saving state
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [securityBusy, setSecurityBusy] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [securityDone, setSecurityDone] = useState('');

  // TOTP 2FA state (for superadmin, tutor, faculty)
  const canUseTotp = ['superadmin', 'tutor', 'faculty'].includes(user?.role);
  const [totpSetup, setTotpSetup] = useState(null); // { secret, otpauthUri }
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [totpRecoveryCodes, setTotpRecoveryCodes] = useState(null);
  const [totpDisablePassword, setTotpDisablePassword] = useState('');
  const [totpDisableCode, setTotpDisableCode] = useState('');
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpError, setTotpError] = useState('');

  useEffect(() => {
    restoreRef.current = document.activeElement;
    focusFirst(panelRef.current, tab === 'profile' ? '#profile-name' : '#security-current');
    return () => restoreRef.current?.focus?.();
  }, [tab]);

  const isSubjectSpecialist = user?.role === 'tutor' || user?.role === 'faculty';

  // Load available subjects and fresh user subjects if user is a tutor or faculty
  useEffect(() => {
    if (isSubjectSpecialist) {
      setLoadingSubjects(true);
      Promise.all([
        api.get('/subjects'),
        api.get('/auth/me').catch(() => ({ user })),
      ])
        .then(([subRes, meRes]) => {
          const list = Array.isArray(subRes.subjects) ? subRes.subjects : [];
          setAllSubjects(list);
          const freshSubjects = meRes?.user?.subjects || user?.subjects || [];
          if (freshSubjects.length) {
            const currentCodes = new Set(freshSubjects.map((s) => s.code));
            const ids = list.filter((s) => s.id && (freshSubjects.some((fs) => fs.id === s.id) || currentCodes.has(s.code))).map((s) => s.id);
            setSelectedSubjectIds(ids);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingSubjects(false));
    }
  }, [isSubjectSpecialist]);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    trapTabKey(event, panelRef.current);
  };

  const handleAvatarFile = async (e) => {
    setAvatarError('');
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingImage(true);
    try {
      // 1. Magic bytes & size check
      const check = await validateAvatarFile(file);
      if (!check.valid) {
        setAvatarError(check.error || 'Invalid file.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // 2. Client-side center crop & resize to 256x256
      const { dataUrl } = await cropAndResizeToCanvas(file, 256);
      setAvatarPreview(dataUrl);
      setAvatarBase64(dataUrl);
    } catch (err) {
      setAvatarError(err.message || 'Failed to process image.');
    } finally {
      setProcessingImage(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarBase64(null); // Explicit deletion signal
    setAvatarError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSubject = (id) => {
    setSelectedSubjectIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        return prev.filter((sId) => sId !== id);
      }
      return [...prev, id];
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSaved(false);

    const cleanName = name.trim();
    if (!cleanName) {
      setProfileError('Display name cannot be empty.');
      return;
    }

    if (cleanName.length > 100) {
      setProfileError('Display name must be 100 characters or fewer.');
      return;
    }

    const cleanBio = bio.trim();
    if (cleanBio.length > 280) {
      setProfileError('Bio must be 280 characters or fewer.');
      return;
    }

    if (isSubjectSpecialist && selectedSubjectIds.length === 0) {
      setProfileError(
        user?.role === 'faculty'
          ? 'Please select at least one specialized subject.'
          : 'Please select at least one subject you teach.'
      );
      return;
    }

    setSavingProfile(true);
    try {
      const payload = {
        name: cleanName,
        bio: cleanBio,
      };

      if (avatarBase64 !== undefined) {
        payload.avatarBase64 = avatarBase64;
      }

      if (isSubjectSpecialist) {
        payload.subjectIds = selectedSubjectIds;
      }

      const res = await api.patch('/auth/profile', payload);
      if (res.user) {
        saveSession(res.user);
        onUserUpdated?.(res.user);
      }

      setProfileSaved(true);
      showToast?.('Profile updated successfully.', 'success');
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      setProfileError(err.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const submitSecurity = async (event) => {
    event.preventDefault();
    setSecurityError('');
    setSecurityDone('');
    if (newPassword !== confirm) {
      setSecurityError('The new passwords do not match.');
      return;
    }
    if (newPassword.length < 10) {
      setSecurityError('Use at least 10 characters.');
      return;
    }
    setSecurityBusy(true);
    try {
      const result = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      saveSession(result.user, result.sessionExpiresAt);
      setSecurityDone('Password changed. Other devices were signed out.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      showToast?.('Password changed.', 'success');
    } catch (e) {
      setSecurityError(e.message || 'Could not change the password.');
    } finally {
      setSecurityBusy(false);
    }
  };

  const signOutEverywhere = async () => {
    setSecurityError('');
    setSecurityDone('');
    setSecurityBusy(true);
    try {
      await api.post('/auth/logout-all');
      showToast?.('Signed out everywhere.', 'success');
      onSignOut?.();
      onClose();
    } catch (e) {
      setSecurityError(e.message || 'Could not sign out everywhere.');
      setSecurityBusy(false);
    }
  };

  const startTotpSetup = async () => {
    setTotpError('');
    setTotpRecoveryCodes(null);
    setTotpBusy(true);
    try {
      const res = await api.post('/auth/totp/setup');
      setTotpSetup(res);
      setTotpVerifyCode('');
    } catch (e) {
      setTotpError(e.message || 'Could not start 2FA setup.');
    } finally {
      setTotpBusy(false);
    }
  };

  const confirmTotpEnable = async () => {
    setTotpError('');
    if (!totpVerifyCode.trim()) {
      setTotpError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setTotpBusy(true);
    try {
      const res = await api.post('/auth/totp/enable', { code: totpVerifyCode.trim() });
      if (res.user) {
        saveSession(res.user, res.sessionExpiresAt);
        onUserUpdated?.(res.user);
      }
      setTotpRecoveryCodes(res.recoveryCodes || []);
      setTotpSetup(null);
      setTotpVerifyCode('');
      showToast?.('Two-factor authentication enabled.', 'success');
    } catch (e) {
      setTotpError(e.message || 'Could not verify code.');
    } finally {
      setTotpBusy(false);
    }
  };

  const confirmTotpDisable = async () => {
    setTotpError('');
    if (!totpDisablePassword || !totpDisableCode.trim()) {
      setTotpError('Enter your current password and a 6-digit or recovery code.');
      return;
    }
    setTotpBusy(true);
    try {
      const res = await api.post('/auth/totp/disable', {
        currentPassword: totpDisablePassword,
        code: totpDisableCode.trim(),
      });
      if (res.user) {
        saveSession(res.user, res.sessionExpiresAt);
        onUserUpdated?.(res.user);
      }
      setTotpDisablePassword('');
      setTotpDisableCode('');
      setTotpRecoveryCodes(null);
      showToast?.('Two-factor authentication disabled.', 'info');
    } catch (e) {
      setTotpError(e.message || 'Could not disable 2FA.');
    } finally {
      setTotpBusy(false);
    }
  };

  const isProfileDirty =
    name.trim() !== (user?.name || '') ||
    bio.trim() !== (user?.bio || '') ||
    avatarBase64 !== undefined ||
    (isSubjectSpecialist &&
      JSON.stringify(selectedSubjectIds.slice().sort()) !==
        JSON.stringify(
          (user?.subjects || [])
            .map((s) => s.id)
            .filter(Boolean)
            .sort()
        ));

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-ink/35 p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close account settings"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-dialog-title"
        onKeyDown={onKeyDown}
        className="relative flex max-h-[92vh] w-full max-w-[540px] flex-col border-2 border-ink bg-paper shadow-[7px_7px_0_var(--color-ink)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-ink px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="meta uppercase tracking-[0.12em]">Account</p>
              {user?.role === 'faculty' && (
                <span className="inline-flex items-center gap-1 border-2 border-ink bg-ink px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-gold shadow-[2px_2px_0_var(--color-gold)]">
                  <Award className="h-3 w-3 text-gold" strokeWidth={2.4} />
                  Faculty Specialist
                </span>
              )}
            </div>
            <h2
              id="account-dialog-title"
              className="mt-1 font-display text-[22px] font-extrabold leading-tight tracking-[-0.02em]"
            >
              Account Settings
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

        {/* Tab Switcher */}
        <div
          role="tablist"
          className="flex border-b-2 border-ink bg-surface-quiet px-5 pt-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'profile'}
            aria-controls="panel-profile"
            id="tab-profile"
            onClick={() => setTab('profile')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.05em] transition-colors',
              tab === 'profile'
                ? '-mb-[2px] border-ink bg-paper text-ink shadow-[2px_-2px_0_var(--color-ink)]'
                : 'border-transparent text-muted-foreground hover:text-ink'
            )}
          >
            <User className="h-4 w-4" strokeWidth={2} />
            Profile
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'security'}
            aria-controls="panel-security"
            id="tab-security"
            onClick={() => setTab('security')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.05em] transition-colors',
              tab === 'security'
                ? '-mb-[2px] border-ink bg-paper text-ink shadow-[2px_-2px_0_var(--color-ink)]'
                : 'border-transparent text-muted-foreground hover:text-ink'
            )}
          >
            <KeyRound className="h-4 w-4" strokeWidth={2} />
            Security
          </button>
        </div>

        {/* Tab 1: Profile */}
        {tab === 'profile' && (
          <form
            id="panel-profile"
            role="tabpanel"
            aria-labelledby="tab-profile"
            onSubmit={handleSaveProfile}
            className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
          >
            {/* Avatar Row */}
            <div>
              <span className="block text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
                Profile Avatar
              </span>
              <div className="mt-2.5 flex flex-wrap items-center gap-4">
                <Avatar
                  name={name || user?.name || ''}
                  avatarUrl={avatarPreview}
                  size="2xl"
                  alt={`${name}'s avatar preview`}
                />

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      id="avatar-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarFile}
                      className="sr-only"
                    />
                    <label
                      htmlFor="avatar-file-input"
                      className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 border-2 border-ink bg-paper px-3 py-2 text-[13px] font-bold text-ink shadow-[2px_2px_0_var(--color-ink)] transition-transform hover:bg-gold active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                      {processingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" strokeWidth={2} />
                      )}
                      Upload photo
                    </label>

                    {(avatarPreview || user?.has_avatar) && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="inline-flex min-h-[44px] items-center gap-1.5 border-2 border-ink bg-surface-quiet px-3 py-2 text-[13px] font-bold text-crimson transition-colors hover:bg-crimson/10"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    JPEG, PNG, or WebP up to 2 MB. Center-cropped to 256×256.
                  </p>
                </div>
              </div>

              {avatarError && (
                <p
                  role="alert"
                  className="mt-2 border-2 border-crimson bg-surface-alert px-3 py-2 text-[12px] font-semibold text-crimson"
                >
                  {avatarError}
                </p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label
                htmlFor="profile-name"
                className="block text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground"
              >
                Display Name <span className="text-crimson">*</span>
              </label>
              <Input
                id="profile-name"
                type="text"
                maxLength={100}
                required
                className="mt-1.5 min-h-[44px]"
                aria-invalid={Boolean(profileError)}
                aria-describedby={profileError ? 'profile-error-msg' : undefined}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full display name"
              />
            </div>

            {/* Bio (max 280, plain text only) */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="profile-bio"
                  className="block text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground"
                >
                  Bio (plain text)
                </label>
                <span
                  className={cn(
                    'text-[11px] font-bold',
                    bio.length > 280 ? 'text-crimson' : 'text-muted-foreground'
                  )}
                >
                  {bio.length}/280
                </span>
              </div>
              <textarea
                id="profile-bio"
                rows={3}
                maxLength={280}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Short bio visible to peers and faculty..."
                className="mt-1.5 w-full resize-none border-2 border-ink bg-paper px-3 py-2 text-[13px] text-ink outline-none transition-colors focus:border-ink focus:ring-2 focus:ring-gold"
              />
            </div>

            {/* Tutors & Faculty: Subjects they teach / specialize in */}
            {isSubjectSpecialist && (
              <div className="border-t-2 border-ink/15 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" strokeWidth={2} />
                    <span className="text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
                      {user?.role === 'faculty' ? 'Specialized Subjects' : 'Subjects You Teach'} <span className="text-crimson">*</span>
                    </span>
                  </div>
                  {user?.role === 'faculty' && (
                    <span className="inline-flex items-center gap-1 border border-ink bg-ink px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gold">
                      <Award className="h-3 w-3 text-gold" /> Faculty Specialist
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {user?.role === 'faculty'
                    ? 'Select the courses you specialize in for academic consultation and fallback tutor matchmaking.'
                    : 'Select the subjects you are accredited and available to teach.'}
                </p>

                {loadingSubjects ? (
                  <div className="mt-2 flex items-center gap-2 text-[13px] text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects…
                  </div>
                ) : allSubjects.length === 0 ? (
                  <p className="mt-2 text-[12px] italic text-muted-foreground">
                    No subjects configured in the catalog.
                  </p>
                ) : (
                  <div className="mt-2.5 grid max-h-[160px] grid-cols-1 gap-1.5 overflow-y-auto border-2 border-ink/20 p-2 sm:grid-cols-2">
                    {allSubjects.map((sub) => {
                      const isSelected = selectedSubjectIds.includes(sub.id);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => toggleSubject(sub.id)}
                          className={cn(
                            'flex min-h-[36px] items-center justify-between border-2 px-2.5 py-1 text-left text-[12px] font-bold transition-colors',
                            isSelected
                              ? 'border-ink bg-gold text-ink'
                              : 'border-ink/25 bg-paper text-muted-foreground hover:border-ink hover:text-ink'
                          )}
                        >
                          <span className="truncate">{sub.code} · {sub.name}</span>
                          {isSelected && <Check className="ml-1 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Error / Status */}
            {profileError && (
              <p
                id="profile-error-msg"
                role="alert"
                className="border-2 border-crimson bg-surface-alert px-3 py-2 text-[13px] font-semibold text-crimson"
              >
                {profileError}
              </p>
            )}

            {profileSaved && (
              <p
                role="status"
                className="inline-flex items-center gap-1.5 border-2 border-ink bg-emerald/15 px-3 py-2 text-[13px] font-bold text-ink"
              >
                <Check className="h-4 w-4 text-emerald" strokeWidth={2.5} />
                Profile updated successfully.
              </p>
            )}

            {/* Save Button */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                type="submit"
                disabled={savingProfile || !isProfileDirty}
                className="min-h-[44px]"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" strokeWidth={2} /> Save changes
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={savingProfile}
                className="min-h-[44px]"
              >
                Cancel
              </Button>
              {isSubjectSpecialist && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    onClose();
                    navigate(`/tutors/${user.custom_id || user.id}`);
                  }}
                  className="ml-auto min-h-[44px] text-[13px] font-bold text-ink underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink"
                >
                  View Public Profile →
                </Button>
              )}
            </div>
          </form>
        )}

        {/* Tab 2: Security */}
        {tab === 'security' && (
          <>
            <form
              id="panel-security"
              role="tabpanel"
              aria-labelledby="tab-security"
              onSubmit={submitSecurity}
              className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
            >
              <div>
                <label
                  htmlFor="security-current"
                  className="block text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground"
                >
                  Current password
                </label>
                <Input
                  id="security-current"
                  type="password"
                  autoComplete="current-password"
                  className="mt-1.5 min-h-[44px]"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="security-new"
                  className="block text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground"
                >
                  New password
                </label>
                <Input
                  id="security-new"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={72}
                  className="mt-1.5 min-h-[44px]"
                  aria-invalid={Boolean(securityError)}
                  aria-describedby={securityError ? 'security-error-msg' : undefined}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="security-confirm"
                  className="block text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground"
                >
                  Confirm new password
                </label>
                <Input
                  id="security-confirm"
                  type="password"
                  autoComplete="new-password"
                  className="mt-1.5 min-h-[44px]"
                  aria-invalid={Boolean(securityError)}
                  aria-describedby={securityError ? 'security-error-msg' : undefined}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>

              {securityError && (
                <p
                  id="security-error-msg"
                  role="alert"
                  className="border-2 border-crimson bg-surface-alert px-3 py-2 text-[13px] font-semibold text-crimson"
                >
                  {securityError}
                </p>
              )}
              {securityDone && (
                <p
                  role="status"
                  className="border-2 border-ink bg-emerald/15 px-3 py-2 text-[13px] font-semibold text-ink"
                >
                  {securityDone}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button type="submit" disabled={securityBusy} className="min-h-[44px]">
                  {securityBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" strokeWidth={1.9} />
                  )}
                  Change password
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={securityBusy}
                  className="min-h-[44px]"
                >
                  Cancel
                </Button>
              </div>

              {canUseTotp && (
                <div className="mt-5 border-t-2 border-ink pt-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
                        Two-Factor Authentication (TOTP)
                      </p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {user?.role === 'superadmin'
                          ? 'Recommended for Dean/Superadmin approvals, audit access, and tutor governance.'
                          : 'Protect your account with Google Authenticator or Authy.'}
                      </p>
                    </div>
                    <span className={cn(
                      'shrink-0 border-2 border-ink px-2 py-0.5 text-[11px] font-bold uppercase',
                      user?.totp_enabled ? 'bg-emerald/15 text-ink' : 'bg-surface-quiet text-muted-foreground'
                    )}>
                      {user?.totp_enabled ? '2FA Active' : 'Off'}
                    </span>
                  </div>

                  {totpError && (
                    <p role="alert" className="mt-3 border-2 border-crimson bg-surface-alert px-3 py-2 text-[12px] font-semibold text-crimson">
                      {totpError}
                    </p>
                  )}

                  {totpRecoveryCodes && totpRecoveryCodes.length > 0 && (
                    <div className="mt-3 border-2 border-ink bg-surface-highlight p-3">
                      <p className="text-[12px] font-bold text-ink">
                        Save these single-use recovery codes now — they will not be shown again:
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-[12px] font-bold text-ink">
                        {totpRecoveryCodes.map((c) => (
                          <span key={c} className="border border-ink/30 bg-paper px-2 py-1 text-center">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!user?.totp_enabled && !totpSetup && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={startTotpSetup}
                      disabled={totpBusy}
                      className="mt-3 min-h-[40px]"
                    >
                      <ShieldCheck className="h-4 w-4" strokeWidth={2} />
                      {totpBusy ? 'Generating…' : 'Set up authenticator 2FA'}
                    </Button>
                  )}

                  {!user?.totp_enabled && totpSetup && (
                    <div className="mt-3 space-y-3 border-2 border-ink bg-surface-quiet p-3">
                      <p className="text-[12px] font-medium text-ink">
                        1. Add this key in Google Authenticator, Authy, or 1Password (Time-based, 6 digits):
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 overflow-x-auto border-2 border-ink bg-paper px-2.5 py-1.5 font-mono text-[12px] font-bold text-ink">
                          {totpSetup.secret}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard?.writeText(totpSetup.secret);
                            showToast?.('2FA secret copied.', 'info');
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-[12px] font-medium text-ink">
                        2. Enter the 6-digit code to activate:
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="123456"
                          maxLength={6}
                          value={totpVerifyCode}
                          onChange={(e) => setTotpVerifyCode(e.target.value)}
                          className="min-h-[40px] max-w-[160px] font-mono"
                        />
                        <Button type="button" size="sm" onClick={confirmTotpEnable} disabled={totpBusy} className="min-h-[40px]">
                          {totpBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & enable'}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setTotpSetup(null)} disabled={totpBusy}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {user?.totp_enabled && (
                    <div className="mt-3 space-y-2 border-2 border-ink/20 bg-surface-quiet p-3">
                      <p className="text-[12px] font-semibold text-muted-foreground">
                        Disable 2FA (requires current password + authenticator or recovery code):
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          type="password"
                          placeholder="Current password"
                          value={totpDisablePassword}
                          onChange={(e) => setTotpDisablePassword(e.target.value)}
                          className="min-h-[40px]"
                        />
                        <Input
                          type="text"
                          placeholder="6-digit or recovery code"
                          value={totpDisableCode}
                          onChange={(e) => setTotpDisableCode(e.target.value)}
                          className="min-h-[40px] font-mono"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={confirmTotpDisable}
                        disabled={totpBusy}
                        className="min-h-[38px]"
                      >
                        Disable 2FA
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </form>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink bg-surface-quiet px-5 py-3.5">
              <p className="max-w-[250px] text-[12px] leading-snug text-muted-foreground">
                Signing out everywhere revokes every token issued to this account.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={signOutEverywhere}
                disabled={securityBusy}
                className="min-h-[44px]"
              >
                <ShieldOff className="h-4 w-4" strokeWidth={1.9} /> Sign out everywhere
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

