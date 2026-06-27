import type { LucideIcon } from 'lucide-react';
import {
  Heart,
  Siren,
  Brain,
  Video,
  Pill,
  Sparkles,
} from 'lucide-react';

export interface OnboardingSlide {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  highlight: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  glow: string;
  accent: string;
}

/** Recruiter-friendly intro — each slide answers what LifeCare+ is and what it does. */
export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'welcome',
    index: '01',
    eyebrow: 'LifeCare+ · Product overview',
    title: 'One platform for',
    highlight: 'complete healthcare.',
    tagline: 'React + Node.js full-stack digital health app.',
    description:
      'Patients book doctors, run AI health scans, order medicines, and trigger emergency ambulance dispatch — all in one PWA. Built for India with real-time video, payments, and GPS routing.',
    icon: Heart,
    gradient: 'from-[#050a12] via-[#0c1f3d] to-[#050a12]',
    glow: 'rgba(29,158,117,0.45)',
    accent: '#1D9E75',
  },
  {
    id: 'sos',
    index: '02',
    eyebrow: 'Emergency SOS · Telangana-wide',
    title: 'Ambulance + hospital',
    highlight: 'in one tap.',
    tagline: 'GPS auto-detect → nearest ER → live map.',
    description:
      'Press SOS: we detect your location, find the closest hospital with ambulance service via Google Places, dispatch a driver, and show a live route — no manual typing in an emergency.',
    icon: Siren,
    gradient: 'from-[#120606] via-[#3a1010] to-[#050a12]',
    glow: 'rgba(255,107,107,0.5)',
    accent: '#ff6b6b',
  },
  {
    id: 'mediscan',
    index: '03',
    eyebrow: 'MediScan AI · Computer vision',
    title: 'AI screens X-rays,',
    highlight: 'skin & retina.',
    tagline: 'Upload → instant risk flags → clinician review.',
    description:
      'Chest X-ray, skin lesion, and retina image analysis with confidence scores. Results sync to the patient health vault — demonstrates ML integration in a real clinical workflow.',
    icon: Brain,
    gradient: 'from-[#050a12] via-[#0a1535] to-[#050a12]',
    glow: 'rgba(0,102,255,0.45)',
    accent: '#3b82f6',
  },
  {
    id: 'consult',
    index: '04',
    eyebrow: 'Telehealth · WebRTC video',
    title: 'Live doctor consults',
    highlight: 'from home.',
    tagline: 'Book → pay with wallet → join HD video room.',
    description:
      'Verified specialists, appointment booking, WebRTC video calls with Socket.io signaling, prescriptions, and care plans — the full telemedicine loop end to end.',
    icon: Video,
    gradient: 'from-[#050a12] via-[#0a2838] to-[#050a12]',
    glow: 'rgba(93,202,165,0.4)',
    accent: '#5DCAA5',
  },
  {
    id: 'pharmacy',
    index: '05',
    eyebrow: 'Pharmacy · Wallet · Records',
    title: 'Meds delivered,',
    highlight: 'history saved.',
    tagline: 'E-commerce + digital health record in sync.',
    description:
      'Browse medicines and skin-care products, checkout with an in-app wallet, track orders, and keep every scan, consult, and prescription in one unified health profile.',
    icon: Pill,
    gradient: 'from-[#050a12] via-[#102820] to-[#050a12]',
    glow: 'rgba(0,196,140,0.35)',
    accent: '#00c48c',
  },
  {
    id: 'start',
    index: '06',
    eyebrow: 'Try it now · No signup needed',
    title: 'Explore the',
    highlight: 'live demo.',
    tagline: 'Patient or Doctor — one tap, full access.',
    description:
      'Tap Try instantly below to walk through appointments, SOS, MediScan, and video consults with seeded demo data. No OTP required for the interview demo.',
    icon: Sparkles,
    gradient: 'from-[#050a12] via-[#152238] to-[#050a12]',
    glow: 'rgba(29,158,117,0.5)',
    accent: '#1D9E75',
  },
];

/** Time each slide stays visible (cinematic pacing). */
export const ONBOARDING_SLIDE_MS = 7500;
