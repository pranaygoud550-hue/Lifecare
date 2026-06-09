import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

const testimonials = [
  {
    name: 'Priya Sharma',
    city: 'Mumbai',
    content: 'Booked a cardiologist in 2 minutes. Video consult was smooth and I got my prescription on the app instantly.',
    rating: 5,
  },
  {
    name: 'Rahul Mehta',
    city: 'Delhi',
    content: 'LifeCare+ ambulance reached in under 10 minutes during my father\'s emergency. Truly life-saving service.',
    rating: 5,
  },
  {
    name: 'Ananya Reddy',
    city: 'Hyderabad',
    content: 'Ordered medicines at midnight, delivered by morning. Prices were better than my local pharmacy.',
    rating: 5,
  },
  {
    name: 'James Wilson',
    city: 'Bangalore',
    content: 'Finding a pediatrician near me was so easy. The doctor was verified and very professional with my child.',
    rating: 5,
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(count)].map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="py-16 md:py-20 bg-[#f0f7ff]">
      <div className="container-custom">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">Testimonials</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by millions of patients</h2>
          <div className="flex items-center justify-center gap-2 text-muted">
            <StarRating count={5} />
            <span className="font-semibold text-foreground">4.8/5</span>
            <span>from 50,000+ reviews</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((t) => (
            <Card key={t.name} className="border-0 shadow-md hover:shadow-lg transition-shadow bg-white">
              <CardContent className="p-6">
                <Quote className="h-8 w-8 text-primary/15 mb-3" />
                <StarRating count={t.rating} />
                <p className="text-sm text-muted mt-4 mb-6 leading-relaxed min-h-[4.5rem]">
                  &ldquo;{t.content}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(t.name.split(' ')[0], t.name.split(' ')[1])}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted">{t.city}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
