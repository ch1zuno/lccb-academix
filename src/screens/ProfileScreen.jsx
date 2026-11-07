import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ProfileAvatar } from '../components/ui/ProfileAvatar';
import { BadgeList } from '../components/ui/BadgeDisplay';
import { Save, Loader2, Image, User, Edit2, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../api';

export default function ProfileScreen({ user, showToast }) {
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [profile_picture_url, setProfilePictureUrl] = useState(user?.profile_picture_url || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch('/auth/profile', { avatar, profile_picture_url, bio });
      showToast('Profile updated', 'success');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      showToast(e.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const validateUrl = (url) => {
    if (!url) return true;
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  const hasChanges = avatar !== (user?.avatar || '') ||
    profile_picture_url !== (user?.profile_picture_url || '') ||
    bio !== (user?.bio || '');

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6">
      <div className="section-head">
        <div>
          <h1 className="section-title">Profile</h1>
          <p className="section-subtitle">Customize how you appear across the platform.</p>
        </div>
      </div>

      <div className="panel p-6 space-y-6">
        {/* Avatar Preview */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <ProfileAvatar
              name={user?.name || ''}
              avatar={avatar}
              profile_picture_url={profile_picture_url}
              size="xl"
              showBadge={user?.role === 'tutor' || user?.role === 'faculty'}
              badges={user?.badges}
            />
            <div className="min-w-0">
              <p className="font-display text-[20px] font-bold text-ink">{user?.name || 'Your Name'}</p>
              <p className="text-[13px] text-muted-foreground">
                {user?.custom_id} · {user?.role === 'tutor' ? 'Tutor' : user?.role === 'faculty' ? 'Faculty' : 'Student'}
                {user?.program ? ` · ${user?.program}` : ''}
              </p>
            </div>
          </div>
          {saved && (
            <span className="inline-flex items-center gap-1.5 rounded-none border-2 border-emerald bg-emerald/10 px-3 py-1.5 text-[13px] font-semibold text-emerald">
              <Check className="h-4 w-4" strokeWidth={2} />
              Saved
            </span>
          )}
        </div>

        <div className="border-t border-border pt-6 space-y-6">
          {/* Profile Picture URL */}
          <div>
            <label className="field-label" htmlFor="profile_picture_url">
              <span className="flex items-center gap-1.5">
                <Image className="h-4 w-4" strokeWidth={1.8} />
                Profile picture URL
              </span>
            </label>
            <Input
              id="profile_picture_url"
              type="url"
              placeholder="https://example.com/your-photo.jpg"
              value={profile_picture_url}
              onChange={(e) => setProfilePictureUrl(e.target.value)}
              className="mt-1.5"
              aria-describedby="avatar-help"
            />
            <p id="avatar-help" className="mt-1.5 text-[12px] text-muted-foreground">
              Paste a direct link to an image (JPG, PNG, WebP). Must be a valid HTTP/HTTPS URL.
              We recommend using a reliable host like Imgur, GitHub, or your own domain.
            </p>
            {profile_picture_url && !validateUrl(profile_picture_url) && (
              <p className="mt-1.5 text-[12px] text-crimson">Please enter a valid URL starting with http:// or https://</p>
            )}
            {profile_picture_url && validateUrl(profile_picture_url) && (
              <div className="mt-3 flex items-center gap-3">
                <ProfileAvatar
                  name={user?.name || ''}
                  avatar={avatar}
                  profile_picture_url={profile_picture_url}
                  size="md"
                />
                <span className="text-[13px] text-muted-foreground">Preview</span>
              </div>
            )}
          </div>

          {/* Legacy Emoji Avatar */}
          <div>
            <label className="field-label" htmlFor="avatar">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" strokeWidth={1.8} />
                Emoji avatar (legacy)
              </span>
            </label>
            <Input
              id="avatar"
              type="text"
              placeholder="👨‍🎓"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value.slice(0, 10))}
              className="mt-1.5 text-center text-[20px]"
              maxLength={10}
              aria-describedby="emoji-help"
            />
            <p id="emoji-help" className="mt-1.5 text-[12px] text-muted-foreground">
              Fallback emoji shown when no profile picture is set. One emoji recommended.
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="field-label" htmlFor="bio">
              <span className="flex items-center gap-1.5">
                <Edit2 className="h-4 w-4" strokeWidth={1.8} />
                Bio
              </span>
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 2000))}
              rows={4}
              maxLength={2000}
              placeholder="Tell others about yourself — your expertise, teaching style, or what you're learning."
              className="mt-1.5 w-full resize-none border-2 border-ink bg-paper px-3 py-2 text-[14px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <p className="mt-1.5 text-right text-[12px] text-muted-foreground">
              {bio.length}/2000
            </p>
          </div>

          {/* Badges (read-only) */}
          {(user?.role === 'tutor' || user?.role === 'faculty') && (
            <div className="border-t border-border pt-6">
              <h3 className="font-display text-[16px] font-bold text-ink mb-3">
                Your badges
              </h3>
              <BadgeList badges={user?.badges} />
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-8"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.8} />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-4 w-4" strokeWidth={2} />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}