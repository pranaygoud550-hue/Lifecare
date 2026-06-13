import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Video } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useGetDoctorCarePatientDetailQuery,
  usePublishDoctorCarePlanMutation,
} from '@/features/api/apiSlice';
import { PatientVitalsPanel } from '@/components/consultation/PatientVitalsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/apiError';
import type { DoctorCarePlan } from '@/types/doctorCare';

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function DoctorPatientDetailPage() {
  const { patientId = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useGetDoctorCarePatientDetailQuery(patientId, {
    skip: !patientId,
  });
  const [publishPlan, { isLoading: publishing }] = usePublishDoctorCarePlanMutation();

  const detail = data?.data;
  const patient = detail?.patient;
  const sharing = patient?.healthDataSharing;
  const canSeeVitals = Boolean(sharing?.shareVitalsWithDoctors);

  const [title, setTitle] = useState('Personalized care plan');
  const [summary, setSummary] = useState('');
  const [dosText, setDosText] = useState('');
  const [dontsText, setDontsText] = useState('');
  const [dietInstructions, setDietInstructions] = useState('');
  const [lifestyleNotes, setLifestyleNotes] = useState('');
  const [bpSugarNotes, setBpSugarNotes] = useState('');

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await publishPlan({
        patientId,
        title,
        summary,
        dos: linesToArray(dosText),
        donts: linesToArray(dontsText),
        dietInstructions,
        lifestyleNotes,
        bpSugarNotes,
        publishToPatient: true,
        appointmentId: detail?.upcomingAppointment?._id,
      }).unwrap();
      toast.success('Care plan published — patient will see it on Wellness');
      setSummary('');
      setDosText('');
      setDontsText('');
      setDietInstructions('');
      setLifestyleNotes('');
      setBpSugarNotes('');
      refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not publish care plan'));
    }
  };

  if (isLoading) {
    return <div className="h-64 bg-border rounded-lg animate-pulse" />;
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted mb-4">Patient not found or not under your care.</p>
        <Link to="/doctor/patients">
          <Button variant="outline">Back to patients</Button>
        </Link>
      </div>
    );
  }

  const upcoming = detail?.upcomingAppointment;
  const carePlans = (detail?.carePlans ?? []) as DoctorCarePlan[];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-2 -ml-2" asChild>
        <Link to="/doctor/patients">
          <ArrowLeft className="h-4 w-4" />
          All patients
        </Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={patient.profile?.profilePhoto} />
          <AvatarFallback>{getInitials(patient.profile?.firstName, patient.profile?.lastName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {patient.profile?.firstName} {patient.profile?.lastName}
          </h1>
          <p className="text-muted text-sm">{patient.phone} · {patient.email}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {canSeeVitals ? (
              <Badge variant="success">Vitals access granted</Badge>
            ) : (
              <Badge variant="outline">Vitals not shared</Badge>
            )}
            {sharing?.shareWellnessWithDoctors && (
              <Badge variant="secondary">Wellness data shared</Badge>
            )}
          </div>
        </div>
        {upcoming && ['confirmed', 'in-progress', 'pending'].includes(upcoming.status) && (
          <Button
            className="gap-2 shrink-0"
            onClick={() => navigate(`/live-checkup/${upcoming._id}`)}
          >
            <Video className="h-4 w-4" />
            Join video consult
          </Button>
        )}
      </div>

      {patient.medicalHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Medical profile</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {patient.medicalHistory.bloodGroup && (
              <p><span className="text-muted">Blood group:</span> {patient.medicalHistory.bloodGroup}</p>
            )}
            {patient.medicalHistory.allergies?.length ? (
              <p><span className="text-muted">Allergies:</span> {patient.medicalHistory.allergies.join(', ')}</p>
            ) : null}
            {patient.medicalHistory.chronicConditions?.length ? (
              <p><span className="text-muted">Conditions:</span> {patient.medicalHistory.chronicConditions.join(', ')}</p>
            ) : null}
            {patient.medicalHistory.currentMedications?.length ? (
              <p><span className="text-muted">Medications:</span> {patient.medicalHistory.currentMedications.join(', ')}</p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {canSeeVitals ? (
        <Card className="overflow-hidden">
          <PatientVitalsPanel patientId={patientId} />
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted">
            BP and sugar trends appear here when the patient enables &quot;Share vitals with doctors&quot; in their profile.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create & publish care plan</CardTitle>
          <p className="text-sm text-muted">
            Diet, dos & don&apos;ts, and BP/sugar notes sync to the patient Wellness tab.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePublish} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Summary</label>
              <textarea
                className="w-full min-h-[72px] rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief overview for the patient"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Do&apos;s (one per line)</label>
                <textarea
                  className="w-full min-h-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={dosText}
                  onChange={(e) => setDosText(e.target.value)}
                  placeholder="Walk 30 min daily&#10;Drink 2L water"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Don&apos;ts (one per line)</label>
                <textarea
                  className="w-full min-h-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={dontsText}
                  onChange={(e) => setDontsText(e.target.value)}
                  placeholder="Avoid fried food&#10;Limit salt"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Diet instructions</label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={dietInstructions}
                onChange={(e) => setDietInstructions(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">BP / sugar notes</label>
              <textarea
                className="w-full min-h-[64px] rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={bpSugarNotes}
                onChange={(e) => setBpSugarNotes(e.target.value)}
                placeholder="Target fasting sugar 100–120; check BP twice daily"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Lifestyle notes</label>
              <textarea
                className="w-full min-h-[64px] rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={lifestyleNotes}
                onChange={(e) => setLifestyleNotes(e.target.value)}
              />
            </div>
            <Button type="submit" className="gap-2" disabled={publishing}>
              <Save className="h-4 w-4" />
              {publishing ? 'Publishing…' : 'Publish to patient'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {carePlans.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold">Previous plans</h2>
          {carePlans.map((plan) => (
            <Card key={plan._id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{plan.title}</p>
                  {plan.publishedToPatient && <Badge variant="success">Published</Badge>}
                </div>
                {plan.summary && <p className="text-sm text-muted">{plan.summary}</p>}
                {plan.dos?.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium text-green-700">Do:</span>{' '}
                    {plan.dos.join(' · ')}
                  </div>
                )}
                {plan.donts?.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium text-red-700">Don&apos;t:</span>{' '}
                    {plan.donts.join(' · ')}
                  </div>
                )}
                <p className="text-xs text-muted">
                  {new Date(plan.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
