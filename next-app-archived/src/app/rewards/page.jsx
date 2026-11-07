"use client";
import RewardCatalog from '@/screens/RewardCatalog';
import { useAppContext } from '@/lib/AppContext';

export default function Page() {
  const { showToast } = useAppContext();
  return <RewardCatalog showToast={showToast} />;
}
