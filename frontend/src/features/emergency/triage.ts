export type LifeThreateningAnswer = 'yes' | 'unsure' | 'no';
export type CanWalkAnswer = 'yes' | 'difficulty' | 'no';
export type RemoteDoctorAnswer = 'yes' | 'no';

export interface TriageAnswers {
  lifeThreatening: LifeThreateningAnswer | null;
  canWalk: CanWalkAnswer | null;
  remoteDoctor: RemoteDoctorAnswer | null;
}

export type TriageRoute = 'sos' | 'escort' | 'teleconsult';

export function resolveTriageRoute(answers: TriageAnswers): TriageRoute | null {
  if (!answers.lifeThreatening || !answers.canWalk || !answers.remoteDoctor) return null;

  if (answers.lifeThreatening === 'yes' || answers.lifeThreatening === 'unsure') {
    return 'sos';
  }
  if (answers.canWalk === 'no' && answers.remoteDoctor === 'no') {
    return 'sos';
  }
  if (answers.remoteDoctor === 'yes') {
    return 'teleconsult';
  }
  return 'escort';
}

export const TRIAGE_QUESTIONS = [
  {
    id: 'lifeThreatening' as const,
    question: 'Is this a life-threatening emergency?',
    options: [
      { value: 'yes' as const, label: 'Yes' },
      { value: 'unsure' as const, label: 'Not Sure' },
      { value: 'no' as const, label: 'No' },
    ],
  },
  {
    id: 'canWalk' as const,
    question: 'Can the patient walk on their own?',
    options: [
      { value: 'yes' as const, label: 'Yes' },
      { value: 'difficulty' as const, label: 'With Difficulty' },
      { value: 'no' as const, label: 'No' },
    ],
  },
  {
    id: 'remoteDoctor' as const,
    question: 'Do you want a doctor to check remotely before sending help?',
    options: [
      { value: 'yes' as const, label: 'Yes' },
      { value: 'no' as const, label: 'Just Send Help' },
    ],
  },
];
