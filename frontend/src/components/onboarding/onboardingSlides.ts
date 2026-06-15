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

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'welcome',
    index: '01',
    eyebrow: 'Chapter I — Why LifeCare+',
    title: 'When health matters,',
    highlight: 'everything matters.',
    tagline: 'One app for your whole family’s care journey.',
    description:
      'LifeCare+ unites verified doctors, emergency response, AI health screening, pharmacy, and your personal health record — designed for real life in India.',
    icon: Heart,
    gradient: 'from-[#050a12] via-[#0c1f3d] to-[#050a12]',
    glow: 'rgba(29,158,117,0.45)',
    accent: '#1D9E75',
  },
  {
    id: 'sos',
    index: '02',
    eyebrow: 'Chapter II — Emergency',
    title: 'Every second',
    highlight: 'counts.',
    tagline: 'Ambulance + nearest hospital — one tap.',
    description:
      'Press SOS and we connect you to the closest emergency hospital, dispatch an ambulance to your GPS, and show a live route map until help arrives.',
    icon: Siren,
    gradient: 'from-[#120606] via-[#3a1010] to-[#050a12]',
    glow: 'rgba(255,107,107,0.5)',
    accent: '#ff6b6b',
  },
  {
    id: 'mediscan',
    index: '03',
    eyebrow: 'Chapter III — MediScan AI',
    title: 'Catch risks',
    highlight: 'earlier.',
    tagline: 'AI screening — your doctor makes the call.',
    description:
      'Upload chest X-rays, skin photos, or retina scans for instant AI-assisted screening. Results sync to your profile and health vault for clinician review.',
    icon: Brain,
    gradient: 'from-[#050a12] via-[#0a1535] to-[#050a12]',
    glow: 'rgba(0,102,255,0.45)',
    accent: '#3b82f6',
  },
  {
    id: 'consult',
    index: '04',
    eyebrow: 'Chapter IV — Telehealth',
    title: 'Real doctors.',
    highlight: 'Real video.',
    tagline: 'Consult from home — HD and secure.',
    description:
      'Book verified specialists, join live WebRTC video consults with your doctor, and follow personalized wellness plans — prescriptions included.',
    icon: Video,
    gradient: 'from-[#050a12] via-[#0a2838] to-[#050a12]',
    glow: 'rgba(93,202,165,0.4)',
    accent: '#5DCAA5',
  },
  {
    id: 'pharmacy',
    index: '05',
    eyebrow: 'Chapter V — Complete care',
    title: 'Meds, skin care,',
    highlight: 'delivered.',
    tagline: 'Pharmacy + wallet + health history in sync.',
    description:
      'Order medicines and skin-care products, pay with wallet, track deliveries, and keep every scan and consult in one trusted health profile.',
    icon: Pill,
    gradient: 'from-[#050a12] via-[#102820] to-[#050a12]',
    glow: 'rgba(0,196,140,0.35)',
    accent: '#00c48c',
  },
  {
    id: 'start',
    index: '06',
    eyebrow: 'Chapter VI — Your turn',
    title: 'Your health story',
    highlight: 'starts now.',
    tagline: 'Try the live demo in one tap.',
    description:
      'Explore as a patient or doctor — full app access, no signup. Or create your account and experience the future of digital healthcare.',
    icon: Sparkles,
    gradient: 'from-[#050a12] via-[#152238] to-[#050a12]',
    glow: 'rgba(29,158,117,0.5)',
    accent: '#1D9E75',
  },
];

/** Time each slide stays visible (cinematic pacing). */
export const ONBOARDING_SLIDE_MS = 7500;
