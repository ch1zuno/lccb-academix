"use client";
import FacultyReferral from '@/screens/FacultyReferral';
import { useAppContext } from '@/lib/AppContext';

export default function Page() {
  const { showToast } = useAppContext();
  return <FacultyReferral showToast={showToast} />;
}
