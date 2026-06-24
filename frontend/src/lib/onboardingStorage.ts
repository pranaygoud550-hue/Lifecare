const COMPLETE_KEY = 'lifecare-onboarding-complete';

export function markOnboardingComplete() {
  localStorage.setItem(COMPLETE_KEY, '1');
}

export function isOnboardingComplete() {
  return localStorage.getItem(COMPLETE_KEY) === '1';
}

/** @deprecated use isOnboardingComplete */
export function isWelcomeSkipped() {
  return isOnboardingComplete();
}

/** @deprecated use markOnboardingComplete */
export function markWelcomeSkipped() {
  markOnboardingComplete();
}
