import { Prescription } from '../models/index.js';
import { MedicationReminder } from '../models/MedicationReminder.js';

/** Map common frequency strings to daily reminder times (HH:mm). */
export function frequencyToTimes(frequency: string): string[] {
  const f = frequency.toLowerCase();
  if (/once|od|1\s*x|daily morning|morning only/.test(f)) return ['08:00'];
  if (/twice|bd|2\s*x|morning.*evening|after.*meal/.test(f)) return ['08:00', '20:00'];
  if (/thrice|tds|3\s*x/.test(f)) return ['08:00', '14:00', '21:00'];
  if (/four|qid|4\s*x/.test(f)) return ['08:00', '12:00', '17:00', '22:00'];
  if (/night|bedtime|hs/.test(f)) return ['22:00'];
  if (/noon|lunch|afternoon/.test(f)) return ['13:00'];
  return ['09:00', '21:00'];
}

export async function generateRemindersFromPrescription(
  prescriptionId: string,
  patientId: string
): Promise<InstanceType<typeof MedicationReminder>[]> {
  const prescription = await Prescription.findById(prescriptionId);
  if (!prescription) throw Object.assign(new Error('Prescription not found'), { statusCode: 404 });
  if (String(prescription.patientId) !== patientId) {
    throw Object.assign(new Error('Not your prescription'), { statusCode: 403 });
  }

  const created = [];
  for (const med of prescription.medications) {
    const times = frequencyToTimes(med.frequency || 'twice daily');
    const reminder = await MedicationReminder.findOneAndUpdate(
      {
        patientId,
        prescriptionId: prescription._id,
        medicineName: med.medicineName,
      },
      {
        patientId,
        prescriptionId: prescription._id,
        medicineName: med.medicineName,
        dosage: med.dosage,
        times,
        instructions: med.instructions,
        beforeAfterFood: med.beforeAfterFood,
        isActive: true,
      },
      { upsert: true, new: true }
    );
    created.push(reminder);
  }
  return created;
}
