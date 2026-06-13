import { Types } from 'mongoose';
import { Scan, User } from '../models/index.js';
import type { IScan } from '../models/Scan.js';
import { saveScanToLocalStorage } from './localScanStorage.js';
import { analyzeChestXrayImage } from './mlScanAnalyzer.js';

const DEFAULT_DISCLAIMER =
  'This is an AI screening tool, not a medical diagnosis. Always consult a qualified healthcare professional for clinical decisions.';

export interface AnalyzeScanInput {
  patientId: string;
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  imageUrl?: string;
  cloudinaryPublicId?: string;
}

function normalizeConfidence(value: number): number {
  if (value <= 1) return Math.round(value * 10000) / 100;
  return Math.round(Math.min(100, Math.max(0, value)) * 100) / 100;
}

async function persistImage(input: {
  buffer: Buffer;
  mimetype: string;
  imageUrl?: string;
  cloudinaryPublicId?: string;
}): Promise<{ imageUrl: string; cloudinaryPublicId?: string }> {
  if (input.imageUrl) {
    return {
      imageUrl: input.imageUrl,
      cloudinaryPublicId: input.cloudinaryPublicId,
    };
  }

  const local = await saveScanToLocalStorage({ buffer: input.buffer, isDicom: false });
  return { imageUrl: local.url, cloudinaryPublicId: local.publicId };
}

export function scanToJSON(scan: IScan) {
  const obj = scan.toObject();
  const rawPredictions = obj.allPredictions as Record<string, number> | Map<string, number> | undefined;
  let allPredictions: Record<string, number> = {};

  if (rawPredictions instanceof Map) {
    allPredictions = Object.fromEntries(rawPredictions.entries());
  } else if (rawPredictions && typeof rawPredictions === 'object') {
    allPredictions = rawPredictions as Record<string, number>;
  }

  return {
    ...obj,
    allPredictions,
  };
}

export async function analyzeAndStoreScan(input: AnalyzeScanInput) {
  const analyzed = await analyzeChestXrayImage({
    buffer: input.buffer,
    mimetype: input.mimetype,
    originalname: input.originalname,
  });

  const storage = await persistImage(input);
  const allPredictions = analyzed.all_predictions;
  const confidence = normalizeConfidence(analyzed.confidence);

  const scan = await Scan.create({
    patientId: input.patientId,
    imageUrl: storage.imageUrl,
    cloudinaryPublicId: storage.cloudinaryPublicId,
    prediction: analyzed.class_name,
    confidence,
    allPredictions,
    explanation:
      analyzed.explanation?.trim() ||
      `Your scan shows patterns consistent with ${analyzed.class_name} with ${confidence.toFixed(1)}% confidence.`,
    disclaimer: analyzed.disclaimer?.trim() || DEFAULT_DISCLAIMER,
    sharedWithDoctor: false,
    analysisSource: analyzed.source,
    mlEngine: analyzed.engine,
  });

  return scanToJSON(scan);
}

export async function getPatientScans(patientId: string) {
  const scans = await Scan.find({ patientId }).sort({ createdAt: -1 });
  return scans.map(scanToJSON);
}

export async function shareScanWithDoctor(
  scanId: string,
  patientId: string,
  doctorId?: string
) {
  const scan = await Scan.findOne({ _id: scanId, patientId });
  if (!scan) return null;

  scan.sharedWithDoctor = true;
  if (doctorId) {
    scan.doctorId = new Types.ObjectId(doctorId);
  }
  await scan.save();
  return scanToJSON(scan);
}

export async function getSharedScansForPatient(patientId: string, doctorId: string) {
  const scans = await Scan.find({
    patientId,
    sharedWithDoctor: true,
    $or: [{ doctorId: new Types.ObjectId(doctorId) }, { doctorId: { $exists: false } }],
  }).sort({ createdAt: -1 });

  return scans.map(scanToJSON);
}

export async function getDoctorSharedScans(doctorId: string) {
  const scans = await Scan.find({
    sharedWithDoctor: true,
    $or: [{ doctorId: new Types.ObjectId(doctorId) }, { doctorId: { $exists: false } }],
  })
    .sort({ createdAt: -1 })
    .populate('patientId', 'profile.firstName profile.lastName email phone');

  return scans.map((scan) => {
    const json = scanToJSON(scan) as Record<string, unknown>;
    const patient = scan.patientId as unknown as {
      _id: Types.ObjectId;
      profile?: { firstName?: string; lastName?: string };
      email?: string;
      phone?: string;
    };
    if (patient && typeof patient === 'object' && patient._id) {
      json.patient = {
        _id: patient._id.toString(),
        profile: patient.profile,
        email: patient.email,
        phone: patient.phone,
      };
    }
    return json;
  });
}

export async function addDoctorNote(scanId: string, doctorId: string, doctorNote: string) {
  const scan = await Scan.findOne({
    _id: scanId,
    sharedWithDoctor: true,
    $or: [{ doctorId: new Types.ObjectId(doctorId) }, { doctorId: { $exists: false } }],
  });
  if (!scan) return null;

  if (!scan.doctorId) {
    scan.doctorId = new Types.ObjectId(doctorId);
  }

  scan.doctorNote = doctorNote;
  await scan.save();
  return scanToJSON(scan);
}

export async function getPatientDisplayName(patientId: string) {
  const user = await User.findById(patientId).select('profile.firstName profile.lastName');
  const first = user?.profile?.firstName ?? '';
  const last = user?.profile?.lastName ?? '';
  return `${first} ${last}`.trim() || 'Patient';
}
