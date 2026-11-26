import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'academix-booking-draft-v1';

const BookingDraftContext = createContext(null);

function readStoredDraft() {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredDraft(draft) {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (!draft) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  } catch {
    // ignore quota / private-mode errors
  }
}

export function BookingDraftProvider({ children }) {
  const [draft, setDraftState] = useState(() => readStoredDraft());

  useEffect(() => {
    writeStoredDraft(draft);
  }, [draft]);

  const setDraft = useCallback((nextOrUpdater) => {
    setDraftState((prev) => {
      const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(prev) : nextOrUpdater;
      return next ?? null;
    });
  }, []);

  const updateDraft = useCallback((patch) => {
    setDraftState((prev) => ({ ...(prev || {}), ...patch }));
  }, []);

  const clearDraft = useCallback(() => {
    setDraftState(null);
    writeStoredDraft(null);
  }, []);

  return (
    <BookingDraftContext.Provider value={{ draft, setDraft, updateDraft, clearDraft }}>
      {children}
    </BookingDraftContext.Provider>
  );
}

export function useBookingDraft() {
  const ctx = useContext(BookingDraftContext);
  if (ctx) return ctx;
  // Graceful fallback if rendered standalone in a test without provider
  return {
    draft: null,
    setDraft: () => {},
    updateDraft: () => {},
    clearDraft: () => {},
  };
}

export default BookingDraftContext;
