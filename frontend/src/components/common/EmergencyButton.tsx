import { Link } from 'react-router-dom';
import { Ambulance } from 'lucide-react';

export function EmergencyButton() {
  return (
    <Link
      to="/ambulance"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-accent text-white px-5 py-3 rounded-full shadow-lg hover:scale-105 transition-transform animate-pulse hover:animate-none"
    >
      <Ambulance className="h-5 w-5" />
      <span className="font-semibold text-sm hidden sm:inline">Emergency SOS</span>
    </Link>
  );
}
