import { Link } from 'react-router-dom';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** Recurring dialysis / chemo transport — schedule UI (backend cron hooks in TransportSchedule model future) */
export function RegularRidesPage() {
  return (
    <div className="container-custom py-8 max-w-2xl elder-text">
      <h1 className="text-3xl font-bold mb-2">Regular rides</h1>
      <p className="text-lg text-muted mb-8">
        For dialysis, chemotherapy, or weekly hospital visits — set a repeating schedule.
      </p>

      <Card className="mb-6 border-2 border-dashed border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" /> Upcoming rides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-muted">No recurring schedule yet.</p>
          <p className="text-lg mt-4">
            Example: Every Mon, Wed, Fri at 9:00 AM — Medical cab to your hospital with wheelchair.
          </p>
        </CardContent>
      </Card>

      <Button size="lg" className="w-full h-14 text-lg gap-2" disabled title="Coming soon">
        <Plus className="h-5 w-5" /> Create recurring schedule (coming soon)
      </Button>

      <p className="text-lg text-muted mt-6 text-center">
        Need a one-time ride?{' '}
        <Link to="/transport/book" className="text-primary font-semibold underline">
          Book a ride
        </Link>
      </p>
    </div>
  );
}
