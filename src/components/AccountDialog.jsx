import React, { useEffect, useRef, useState } from 'react';
import {
  KeyRound,
  Loader2,
  ShieldOff,
  User,
  X,
  Upload,
  Trash2,
  Check,
  BookOpen,
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

  useEffect(() => {
    restoreRef.current = document.activeElement;
    focusFirst(panelRef.current, tab === 'profile' ? '#profile-name' : '#security-current');
    return () => restoreRef.current?.focus?.();
  }, [tab]);

  // Load available subjects if user is a tutor
  useEffect(() => {
    if (user?.role === 'tutor') {
      setLoadingSubjects(true);
      api
        .get('/subjects')
        .then((res) => {
          const list = Array.isArray(res.subjects) ? res.subjects : [];
          setAllSubjects(list);
          // If user.subjects only had codes, map them to IDs
          if (user.subjects?.length && (!selectedSubjectIds || selectedSubjectIds.length === 0)) {
            const currentCodes = new Set(user.subjects.map((s) => s.code));
            const ids = list.filter((s) => currentCodes.has(s.code)).map((s) => s.id);
            setSelectedSubjectIds(ids);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingSubjects(false));
    }
  }, [user?.role]);

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

    if (user?.role === 'tutor' && selectedSubjectIds.length === 0) {
      setProfileError('Please select at least one subject you teach.');
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

      if (user?.role === 'tutor') {
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
      saveSession(result.user);
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

  const isProfileDirty =
    name.trim() !== (user?.name || '') ||
    bio.trim() !== (user?.bio || '') ||
    avatarBase64 !== undefined ||
    (user?.role === 'tutor' &&
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
            <p className="meta uppercase tracking-[0.12em]">Account</p>
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

            {/* Tutors: Subjects they teach */}
            {user?.role === 'tutor' && (
              <div className="border-t-2 border-ink/15 pt-3">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" strokeWidth={2} />
                  <span className="text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
                    Subjects You Teach <span className="text-crimson">*</span>
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Select the subjects you are accredited and available to teach.
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
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>

              {securityError && (
                <p
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
