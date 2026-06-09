import { Search, CalendarCheck, Stethoscope, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const steps = [
  {
    step: 1,
    icon: Search,
    title: 'Search doctor',
    description: 'Find specialists by city, specialization, ratings, and consultation type.',
    color: 'bg-blue-500',
  },
  {
    step: 2,
    icon: CalendarCheck,
    title: 'Book appointment',
    description: 'Pick a slot, pay securely online, and get instant confirmation.',
    color: 'bg-secondary',
  },
  {
    step: 3,
    icon: Stethoscope,
    title: 'Get care',
    description: 'Consult via video, audio, or chat. Receive digital prescriptions instantly.',
    color: 'bg-primary',
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container-custom">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">Simple process</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How LifeCare+ works</h2>
          <p className="text-muted text-lg">
            Get quality healthcare in three easy steps — like booking on Practo, from the comfort of home.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative max-w-5xl mx-auto">
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/20 via-secondary/40 to-primary/20" />

          {steps.map(({ step, icon: Icon, title, description, color }) => (
            <div key={step} className="relative text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${color} text-white shadow-lg mb-6 relative z-10`}>
                <Icon className="h-8 w-8" />
              </div>
              <span className="absolute top-0 right-1/2 translate-x-8 md:translate-x-12 text-6xl font-black text-border/60 select-none -z-0">
                {step}
              </span>
              <h3 className="font-bold text-xl mb-2">{title}</h3>
              <p className="text-muted text-sm leading-relaxed max-w-xs mx-auto">{description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/doctors">
            <Button size="lg" className="gap-2 rounded-full px-8">
              Find a doctor now <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
