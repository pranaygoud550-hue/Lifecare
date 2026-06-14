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
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  glow: string;
  accent: string;
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'welcome',
    eyebrow: 'Slide 1 · Welcome',
    title: 'Your health,',
    highlight: 'reimagined.',
    description:
      'LifeCare+ brings doctors, emergency care, AI scans, pharmacy, and wellness into one trusted app — built for India, ready anywhere.',
    icon: Heart,
    gradient: 'from-[#0a1628] via-[#0f2847] to-[#0a1628]',
    glow: 'rgba(29,158,117,0.35)',
    accent: '#1D9E75',
  },
  {
    id: 'sos',
    eyebrow: 'Slide 2 · Emergency',
    title: 'Help in',
    highlight: 'seconds.',
    description:
      'One-tap SOS dispatches ambulance, finds the nearest hospital on the map, and shares your live location with responders.',
    icon: Siren,
    gradient: 'from-[#1a0a0a] via-[#2d1212] to-[#0a1628]',
    glow: 'rgba(255,107,107,0.4)',
    accent: '#ff6b6b',
  },
  {
    id: 'mediscan',
    eyebrow: 'Slide 3 · MediScan AI',
    title: 'See what',
    highlight: 'matters early.',
    description:
      'Upload chest X-rays or skin photos for AI-assisted screening. Share results with your doctor in one tap.',
    icon: Brain,
    gradient: 'from-[#0a1628] via-[#121a3a] to-[#0a1628]',
    glow: 'rgba(0,102,255,0.35)',
    accent: '#0066ff',
  },
  {
    id: 'consult',
    eyebrow: 'Slide 4 · Telehealth',
    title: 'Real doctors,',
    highlight: 'real video.',
    description:
      'Book verified specialists, join HD video consults, and receive personalized diet plans and dos & don’ts on your Wellness tab.',
    icon: Video,
    gradient: 'from-[#0a1628] via-[#0f2a3d] to-[#0a1628]',
    glow: 'rgba(93,202,165,0.35)',
    accent: '#5DCAA5',
  },
  {
    id: 'pharmacy',
    eyebrow: 'Slide 5 · Pharmacy',
    title: 'Meds & wellness,',
    highlight: 'delivered.',
    description:
      'Order medicines, track deliveries, log vitals, and follow doctor-approved diet guidance — all synced to your health profile.',
    icon: Pill,
    gradient: 'from-[#0a1628] via-[#1a2838] to-[#0a1628]',
    glow: 'rgba(0,196,140,0.3)',
    accent: '#00c48c',
  },
  {
    id: 'start',
    eyebrow: 'Slide 6 · Begin',
    title: 'Ready when',
    highlight: 'you are.',
    description:
      'Join thousands who trust LifeCare+ for everyday care and emergencies. Sign in, try a demo, or explore freely.',
    icon: Sparkles,
    gradient: 'from-[#0a1628] via-[#152238] to-[#0a1628]',
    glow: 'rgba(29,158,117,0.45)',
    accent: '#1D9E75',
  },
];

export const ONBOARDING_SLIDE_MS = 5500;
