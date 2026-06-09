import { EmergencyFlowModal } from './EmergencyFlowModal';
import { NeedHelpButton } from './NeedHelpButton';

/** Global emergency UI — modal + floating help button */
export function NeedHelpProvider({ patientShell = false }: { patientShell?: boolean }) {
  return (
    <>
      <EmergencyFlowModal />
      <NeedHelpButton variant={patientShell ? 'fab-patient' : 'fab'} />
    </>
  );
}
