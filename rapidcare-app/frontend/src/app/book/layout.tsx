import { Suspense } from 'react';

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading booking form…</div>}>{children}</Suspense>;
}
