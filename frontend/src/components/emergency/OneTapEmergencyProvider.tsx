import { useAppSelector } from '@/hooks/redux';
import { usePatientAppShell } from '@/hooks/usePatientAppShell';
import { SOSButton } from './SOSButton';
import { LazyEmergencyActiveView } from './LazyEmergencyActiveView';

/** Global one-tap SOS — available on every page via Layout */
export function OneTapEmergencyProvider() {
  const patientShell = usePatientAppShell();
  const { isActive, requestId, patientLocation } = useAppSelector((s) => s.emergency);

  return (
    <>
      {!patientShell && <SOSButton />}
      {isActive && requestId && patientLocation ? <LazyEmergencyActiveView /> : null}
    </>
  );
}
