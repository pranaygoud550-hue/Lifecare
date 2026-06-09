import { createSlice } from '@reduxjs/toolkit';

interface AccessibilityState {
  largeText: boolean;
  simplifiedHome: boolean;
}

const initialState: AccessibilityState = {
  largeText: localStorage.getItem('largeText') === 'true',
  simplifiedHome: localStorage.getItem('simplifiedHome') === 'true',
};

const accessibilitySlice = createSlice({
  name: 'accessibility',
  initialState,
  reducers: {
    toggleLargeText: (state) => {
      state.largeText = !state.largeText;
      localStorage.setItem('largeText', String(state.largeText));
      document.documentElement.classList.toggle('elder-large-text', state.largeText);
    },
    toggleSimplifiedHome: (state) => {
      state.simplifiedHome = !state.simplifiedHome;
      localStorage.setItem('simplifiedHome', String(state.simplifiedHome));
    },
    initAccessibility: (state) => {
      document.documentElement.classList.toggle('elder-large-text', state.largeText);
    },
  },
});

export const { toggleLargeText, toggleSimplifiedHome, initAccessibility } = accessibilitySlice.actions;
export default accessibilitySlice.reducer;
