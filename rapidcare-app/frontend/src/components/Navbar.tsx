'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Home' },
  { href: '/book', label: 'Book' },
  { href: '/about', label: 'About' },
  { href: '/driver', label: 'Driver' },
  { href: '/admin', label: 'Admin' },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-red-900/20 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-lg">🚑</span>
          RapidCare
        </Link>
        <nav className="hidden gap-1 sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === l.href ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/book"
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
        >
          Book Now
        </Link>
      </div>
    </header>
  );
}
