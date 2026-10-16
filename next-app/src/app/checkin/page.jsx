"use client";
import SessionCheckIn from '@/screens/SessionCheckIn';
import { useAppContext } from '@/lib/AppContext';

export default function Page() {
  const { role, showToast } = useAppContext();
  return <SessionCheckIn role={role} showToast={showToast} />;
}
