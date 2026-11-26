import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Loader2, Check, Ban } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import api from '../api';

/**
 * Approved Campus Venues manager shared by Faculty and Superadmin.
 * Soft-disables venues (is_active = false) so historical sessions keep their reference.
 */
export default function CampusVenuesManager({ showToast }) {
  const [venues, setVenues] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [form, setForm] = useState({ name: '', building: '', room: '', capacity: 6 });

  const load = () => {
    api.get('/venues', { includeInactive: 1 })
      .then(({ venues: rows }) => setVenues(rows ?? []))
      .catch(() => setVenues([]));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post('/venues', {
        name: form.name.trim(),
        building: form.building.trim(),
        room: form.room.trim(),
        capacity: Number(form.capacity) || 6,
      });
      setForm({ name: '', building: '', room: '', capacity: 6 });
      setAdding(false);
      showToast?.('Approved campus venue added.', 'success');
      load();
    } catch (err) {
      showToast?.(err.message || 'Could not add venue', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (venue) => {
    setTogglingId(venue.id);
    try {
      await api.patch(`/venues/${venue.id}`, { is_active: !venue.is_active });
      showToast?.(
        venue.is_active ? `${venue.name} disabled for new bookings.` : `${venue.name} re-enabled.`,
        'info',
      );
      load();
    } catch (err) {
      showToast?.(err.message || 'Could not update venue', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const activeCount = (venues ?? []).filter((v) => v.is_active).length;

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-3">
        <div>
          <h2 className="font-display text-[17px] font-bold leading-tight tracking-[-0.02em] flex items-center gap-2 text-ink">
            <MapPin className="h-4 w-4 text-ink" strokeWidth={2.2} aria-hidden="true" />
            Approved campus venues
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Students can only pick from active spaces listed here for Face to Face sessions ({activeCount} active).
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={adding ? 'outline' : 'default'}
          onClick={() => setAdding((v) => !v)}
          className="min-h-[38px]"
        >
          <Plus className="mr-1 h-4 w-4" strokeWidth={2.2} />
          {adding ? 'Close form' : 'Add venue'}
        </Button>
      </div>

      {adding && (
        <form onSubmit={handleCreate} className="mt-4 grid gap-3 border-2 border-ink bg-surface-quiet p-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor="venue-name" className="field-label">Venue name *</label>
            <input
              id="venue-name"
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Learning Commons Pod 2"
              className="input-field mt-1 min-h-[42px]"
            />
          </div>
          <div>
            <label htmlFor="venue-building" className="field-label">Building</label>
            <input
              id="venue-building"
              type="text"
              maxLength={80}
              value={form.building}
              onChange={(e) => setForm((p) => ({ ...p, building: e.target.value }))}
              placeholder="Main Library"
              className="input-field mt-1 min-h-[42px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="venue-room" className="field-label">Room</label>
              <input
                id="venue-room"
                type="text"
                maxLength={40}
                value={form.room}
                onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))}
                placeholder="Rm 105"
                className="input-field mt-1 min-h-[42px]"
              />
            </div>
            <div>
              <label htmlFor="venue-cap" className="field-label">Capacity</label>
              <input
                id="venue-cap"
                type="number"
                min={1}
                max={200}
                value={form.capacity}
                onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                className="input-field mt-1 min-h-[42px]"
              />
            </div>
          </div>
          <div className="sm:col-span-4 flex justify-end">
            <Button type="submit" size="sm" disabled={saving || !form.name.trim()} className="min-h-[40px]">
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Save approved venue
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4">
        {venues === null && <p className="text-[13px] text-muted-foreground">Loading campus venues…</p>}
        {venues !== null && venues.length === 0 && (
          <p className="text-[13px] text-muted-foreground">No campus venues configured yet.</p>
        )}
        {venues && venues.length > 0 && (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((v) => (
              <div
                key={v.id}
                className={cn(
                  'flex items-start justify-between gap-2 border-2 border-ink p-3',
                  v.is_active ? 'bg-paper' : 'bg-surface-quiet opacity-75',
                )}
              >
                <div className="min-w-0">
                  <p className="font-display text-[14px] font-bold leading-tight text-ink truncate">{v.name}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground truncate">
                    {[v.building, v.room, `Cap ${v.capacity}`].filter(Boolean).join(' · ')}
                  </p>
                  <span className={cn(
                    'mt-1.5 inline-flex items-center gap-1 border border-ink px-1.5 py-0.5 text-[10px] font-extrabold uppercase',
                    v.is_active ? 'bg-gold text-ink' : 'bg-paper text-muted-foreground',
                  )}>
                    {v.is_active ? <Check className="h-2.5 w-2.5" /> : <Ban className="h-2.5 w-2.5" />}
                    {v.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={togglingId === v.id}
                  onClick={() => handleToggle(v)}
                  className="min-h-[34px] shrink-0 text-[11px]"
                >
                  {togglingId === v.id ? '…' : v.is_active ? 'Disable' : 'Enable'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
