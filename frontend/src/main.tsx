import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n/config';
import { store } from './store';
import { initAccessibility } from './features/accessibility/accessibilitySlice';

store.dispatch(initAccessibility());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
