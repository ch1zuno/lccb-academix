"use client";
import TutorExam from '@/screens/TutorExam';
import { useAppContext } from '@/lib/AppContext';

export default function Page() {
  const { showToast } = useAppContext();
  return <TutorExam showToast={showToast} />;
}
