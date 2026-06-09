const INTRO_KEY = 'lifecare_intro_seen';

export function isIntroSeen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return true;
  }
}

export function markIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_KEY, '1');
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearIntroSeen(): void {
  try {
    localStorage.removeItem(INTRO_KEY);
  } catch {
    /* ignore */
  }
}
