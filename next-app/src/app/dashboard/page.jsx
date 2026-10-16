"use client";
import Dashboard from '@/screens/Dashboard';
import { useAppContext } from '@/lib/AppContext';

export default function Page() {
  const { role, showToast } = useAppContext();
  return <Dashboard role={role} showToast={showToast} />;
}
