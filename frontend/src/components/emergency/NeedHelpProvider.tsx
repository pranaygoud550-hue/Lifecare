import { useAppSelector } from '@/hooks/redux';
import { LazyEmergencyFlowModal } from './LazyEmergencyFlowModal';
import { NeedHelpButton } from './NeedHelpButton';

interface NeedHelpProviderProps {
  patientShell?: boolean;
  /** Show floating / header help button (modal always mounts when open). */
  showFab?: boolean;
}

/** LifeCare emergency modal + optional floating help button */
export function NeedHelpProvider({ patientShell = false, showFab = true }: NeedHelpProviderProps) {
  const isOpen = useAppSelector((s) => s.emergency.isOpen);

  return (
    <>
      {isOpen ? <LazyEmergencyFlowModal /> : null}
      {showFab ? <NeedHelpButton variant={patientShell ? 'fab-patient' : 'fab'} /> : null}
    </>
  );
}
