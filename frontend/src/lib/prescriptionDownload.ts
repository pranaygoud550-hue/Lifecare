import type { Prescription, User } from '@/types';

export function downloadPrescriptionPdf(rx: Prescription, doctor: User | null) {
  const doctorName = doctor
    ? `Dr. ${doctor.profile.firstName} ${doctor.profile.lastName}`
    : 'Doctor';
  const meds = (rx.medications || [])
    .map(
      (m, i) =>
        `${i + 1}. ${m.medicineName} — ${m.dosage}, ${m.frequency}, ${m.duration}${m.instructions ? ` (${m.instructions})` : ''}`
    )
    .join('\n');

  const content = `
LifeCare+ — Digital Prescription
================================
Date: ${new Date(rx.date).toLocaleDateString('en-IN')}
${doctorName}
Diagnosis: ${rx.diagnosis || '—'}

Medications:
${meds || '—'}

${rx.labTests?.length ? `Lab tests: ${rx.labTests.join(', ')}\n` : ''}${rx.advice ? `Advice: ${rx.advice}\n` : ''}${rx.followUpDate ? `Follow-up: ${new Date(rx.followUpDate).toLocaleDateString('en-IN')}\n` : ''}
`.trim();

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prescription-${rx._id.slice(-6)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
