import {
  Heart, Baby, Sparkles, Bone, Brain, Flower2, BrainCircuit,
  Stethoscope, Ear, Eye, Droplets, Activity, type LucideIcon,
} from 'lucide-react';

export const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  Cardiology: Heart,
  Pediatrics: Baby,
  Dermatology: Sparkles,
  Orthopedics: Bone,
  Neurology: Brain,
  Gynecology: Flower2,
  Psychiatry: BrainCircuit,
  'General Physician': Stethoscope,
  ENT: Ear,
  Ophthalmology: Eye,
  Urology: Droplets,
  Oncology: Activity,
};

export const SPECIALTY_COLORS: Record<string, string> = {
  Cardiology: 'bg-red-50 text-red-600 border-red-100',
  Pediatrics: 'bg-sky-50 text-sky-600 border-sky-100',
  Dermatology: 'bg-amber-50 text-amber-600 border-amber-100',
  Orthopedics: 'bg-slate-50 text-slate-600 border-slate-100',
  Neurology: 'bg-violet-50 text-violet-600 border-violet-100',
  Gynecology: 'bg-pink-50 text-pink-600 border-pink-100',
  Psychiatry: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'General Physician': 'bg-blue-50 text-blue-600 border-blue-100',
  ENT: 'bg-teal-50 text-teal-600 border-teal-100',
  Ophthalmology: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  Urology: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  Oncology: 'bg-orange-50 text-orange-600 border-orange-100',
};

export function getSpecialtyIcon(name: string): LucideIcon {
  return SPECIALTY_ICONS[name] || Stethoscope;
}

export function getSpecialtyColor(name: string): string {
  return SPECIALTY_COLORS[name] || 'bg-primary/5 text-primary border-primary/10';
}
