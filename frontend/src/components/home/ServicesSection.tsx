import { Stethoscope, Home, Pill, Ambulance, Video, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const services = [
  {
    icon: Stethoscope,
    title: 'Doctor Consultations',
    description: 'Video, audio, and chat consultations with verified specialists.',
    link: '/doctors',
    color: 'text-primary bg-primary/10',
  },
  {
    icon: Home,
    title: 'Home Doctor Visits',
    description: 'Get a doctor at your doorstep for in-person care.',
    link: '/doctors?type=homeVisit',
    color: 'text-secondary bg-secondary/10',
  },
  {
    icon: Pill,
    title: 'Online Pharmacy',
    description: 'Order medicines with fast delivery and prescription upload.',
    link: '/pharmacy',
    color: 'text-purple-600 bg-purple-100',
  },
  {
    icon: Ambulance,
    title: 'Emergency Ambulance',
    description: 'One-click SOS with real-time GPS tracking.',
    link: '/ambulance',
    color: 'text-accent bg-red-100',
  },
];

const steps = [
  { step: 1, title: 'Search & Select', description: 'Find the right doctor or service' },
  { step: 2, title: 'Book & Pay', description: 'Choose slot and secure payment' },
  { step: 3, title: 'Get Care', description: 'Consult, receive medicines, or get help' },
];

export function ServicesSection() {
  return (
    <>
      <section className="py-16 bg-card">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Healthcare Services</h2>
            <p className="text-muted max-w-2xl mx-auto">
              Comprehensive healthcare solutions designed to save lives and improve accessibility
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => (
              <Link key={service.title} to={service.link}>
                <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className={`inline-flex p-4 rounded-xl ${service.color} mb-4`}>
                      <service.icon className="h-8 w-8" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{service.title}</h3>
                    <p className="text-sm text-muted">{service.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted">Simple steps to get the care you need</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white font-bold text-lg mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-8 mt-12 text-sm text-muted">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Avg. wait: 5 min
            </div>
            <div className="flex items-center gap-2">
              <Ambulance className="h-5 w-5 text-accent" />
              Avg. response: 8 min
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-secondary" />
              24/7 support
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
