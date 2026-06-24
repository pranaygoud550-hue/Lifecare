export const NOTIFICATION_FILTER_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'appointment', label: 'Appointments' },
  { id: 'appointment_booked', label: 'Booked' },
  { id: 'appointment_reminder', label: 'Reminders' },
  { id: 'prescription', label: 'Prescriptions' },
  { id: 'ambulance', label: 'Ambulance' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'order', label: 'Orders' },
  { id: 'system', label: 'System' },
  { id: 'scan', label: 'MediScan' },
  { id: 'scan_urgent', label: 'Urgent scans' },
  { id: 'blood_emergency', label: 'Blood alerts' },
] as const;
