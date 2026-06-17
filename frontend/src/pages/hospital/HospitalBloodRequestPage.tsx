import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCreateBloodAlertMutation, useGetHospitalProfileQuery } from '@/features/api/apiSlice';
import { BLOOD_GROUPS } from '@/lib/medicalConstants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function HospitalBloodRequestPage() {
  const navigate = useNavigate();
  const { data: profileData } = useGetHospitalProfileQuery();
  const [createAlert, { isLoading }] = useCreateBloodAlertMutation();

  const hospital = profileData?.data?.hospitalAdminDetails?.hospitalId;

  const [bloodGroup, setBloodGroup] = useState('O+');
  const [unitsNeeded, setUnitsNeeded] = useState('');
  const [urgency, setUrgency] = useState<'critical' | 'urgent' | 'normal'>('urgent');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createAlert({
        bloodGroup,
        unitsNeeded: unitsNeeded ? Number(unitsNeeded) : undefined,
        urgency,
        notes: notes.trim() || undefined,
      }).unwrap();
      toast.success(`Alert sent to ${result.data.notifiedCount} matching donors`);
      navigate(`/hospital/alerts/${result.data._id}`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : 'Could not send blood alert';
      toast.error(msg || 'Could not send blood alert');
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Request blood donors</h1>
        <p className="text-muted text-sm mt-1">
          All registered {bloodGroup} patients in Hyderabad will be notified instantly.
        </p>
      </div>

      {hospital && (
        <Card className="border-red-100 bg-red-50/40">
          <CardContent className="p-4 text-sm">
            <p className="font-semibold">{hospital.name}</p>
            <p className="text-muted">{hospital.address}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Blood emergency form</CardTitle>
          <CardDescription>
            Use when an accident or emergency patient needs blood at your hospital blood bank.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="bloodGroup">Blood group needed</Label>
              <select
                id="bloodGroup"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {BLOOD_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="units">Units needed (optional)</Label>
              <Input
                id="units"
                type="number"
                min={1}
                max={20}
                value={unitsNeeded}
                onChange={(e) => setUnitsNeeded(e.target.value)}
                placeholder="e.g. 2"
              />
            </div>

            <div>
              <Label htmlFor="urgency">Urgency</Label>
              <select
                id="urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as typeof urgency)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="critical">Critical — accident / life threat</option>
                <option value="urgent">Urgent</option>
                <option value="normal">Normal</option>
              </select>
            </div>

            <div>
              <Label htmlFor="notes">Notes for donors</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Road accident patient in ER — need donors at blood bank counter"
              />
            </div>

            <p className="text-xs text-muted leading-relaxed">
              LifeCare+ coordinates donors only. All donations must happen at your hospital blood bank with
              valid ID and medical screening.
            </p>

            <Button type="submit" disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700">
              {isLoading ? 'Sending…' : 'Send alert to matching donors'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
