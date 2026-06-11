import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RapidCare — Emergency Medical Transport Hyderabad',
  description: 'Book an ambulance in 60 seconds. Track it live. Arrive safe.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-100`}>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
