import { PatientScanHistory } from '@/components/patient/PatientScanHistory';

/** MediScan studio scan history — unified chest, skin, retina. */
export function ScanHistoryList({ immersive = false }: { immersive?: boolean }) {
  return <PatientScanHistory immersive={immersive} showFilters={false} />;
}
