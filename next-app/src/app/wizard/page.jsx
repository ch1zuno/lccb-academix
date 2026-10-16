"use client";
import TuteeWizard from '@/screens/TuteeWizard';
import { useAppContext } from '@/lib/AppContext';

export default function Page() {
  const { showToast } = useAppContext();
  return <TuteeWizard showToast={showToast} />;
}
