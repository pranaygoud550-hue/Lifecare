import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatientScanHistory } from '@/components/patient/PatientScanHistory';

export function ScanHistoryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <Helmet>
        <title>Scan History | LifeCare+</title>
        <meta
          name="description"
          content="Your complete MediScan history — chest X-rays, skin checks, and eye scans saved to your profile."
        />
      </Helmet>

      <div className="container-custom py-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/dashboard/profile"
              className="mb-3 inline-flex items-center gap-2 text-sm text-muted hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to profile
            </Link>
            <h1 className="text-3xl font-bold">AI scan history</h1>
            <p className="mt-1 text-muted max-w-xl">
              Every chest X-ray, skin check, and eye scan is saved here and in your health vault — recall
              results anytime you need them.
            </p>
          </div>
          <Button asChild>
            <Link to="/dashboard/mediscan">
              <Plus className="mr-2 h-4 w-4" />
              New scan
            </Link>
          </Button>
        </div>

        <PatientScanHistory showFilters />
      </div>
    </div>
  );
}
