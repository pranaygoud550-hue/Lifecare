import { asyncHandler } from '../middleware/validate.js';
import { MedicationReminder } from '../models/MedicationReminder.js';
import { generateRemindersFromPrescription } from '../services/medicationReminderService.js';

export const getMyReminders = asyncHandler(async (req, res) => {
  const reminders = await MedicationReminder.find({
    patientId: req.user!.userId,
    isActive: true,
  }).sort({ medicineName: 1 });

  res.json({ success: true, data: reminders });
});

export const createRemindersFromPrescription = asyncHandler(async (req, res) => {
  const reminders = await generateRemindersFromPrescription(
    String(req.params.prescriptionId),
    req.user!.userId
  );
  res.status(201).json({ success: true, data: reminders });
});

export const patchReminder = asyncHandler(async (req, res) => {
  const { isActive, times } = req.body as { isActive?: boolean; times?: string[] };
  const reminder = await MedicationReminder.findOne({
    _id: req.params.id,
    patientId: req.user!.userId,
  });
  if (!reminder) {
    res.status(404).json({ success: false, message: 'Reminder not found' });
    return;
  }
  if (typeof isActive === 'boolean') reminder.isActive = isActive;
  if (times?.length) reminder.times = times;
  await reminder.save();
  res.json({ success: true, data: reminder });
});

export const deleteReminder = asyncHandler(async (req, res) => {
  const result = await MedicationReminder.findOneAndDelete({
    _id: req.params.id,
    patientId: req.user!.userId,
  });
  if (!result) {
    res.status(404).json({ success: false, message: 'Reminder not found' });
    return;
  }
  res.json({ success: true, data: { deleted: true } });
});
