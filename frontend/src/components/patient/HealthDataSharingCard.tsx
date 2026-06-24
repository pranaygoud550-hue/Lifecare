import { useState } from 'react';
import { Shield, Activity, Apple } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useGetHealthSharingQuery,
  useUpdateHealthSharingMutation,
} from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/apiError';

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: typeof Shield;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="flex gap-3">
        <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted mt-0.5">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-primary' : 'bg-border'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export function HealthDataSharingCard() {
  const { data, isLoading } = useGetHealthSharingQuery();
  const [updateSharing, { isLoading: saving }] = useUpdateHealthSharingMutation();

  const server = data?.data;
  const serverVitals = server?.shareVitalsWithDoctors ?? false;
  const serverWellness = server?.shareWellnessWithDoctors ?? false;

  const [shareVitals, setShareVitals] = useState(serverVitals);
  const [shareWellness, setShareWellness] = useState(serverWellness);
  const [syncedServer, setSyncedServer] = useState(server);

  if (server && server !== syncedServer) {
    setSyncedServer(server);
    setShareVitals(server.shareVitalsWithDoctors);
    setShareWellness(server.shareWellnessWithDoctors);
  }

  const handleSave = async () => {
    try {
      await updateSharing({
        shareVitalsWithDoctors: shareVitals,
        shareWellnessWithDoctors: shareWellness,
      }).unwrap();
      toast.success('Sharing preferences updated');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update sharing'));
    }
  };

  const dirty =
    server &&
    (shareVitals !== server.shareVitalsWithDoctors ||
      shareWellness !== server.shareWellnessWithDoctors);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Share health data with your doctors
        </CardTitle>
        <CardDescription>
          You control what your care team can see outside a live video visit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-24 bg-border animate-pulse rounded-lg" />
        ) : (
          <>
            <ToggleRow
              icon={Activity}
              label="Vitals (BP, sugar, weight)"
              description="Doctors you've consulted can view trends on your record."
              checked={shareVitals}
              onChange={setShareVitals}
              disabled={saving}
            />
            <ToggleRow
              icon={Apple}
              label="Wellness & diet logs"
              description="Lets doctors tailor diet plans using your adherence data."
              checked={shareWellness}
              onChange={setShareWellness}
              disabled={saving}
            />
            <Button
              className="mt-4 w-full sm:w-auto"
              onClick={handleSave}
              disabled={!dirty || saving}
            >
              {saving ? 'Saving…' : 'Save preferences'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
