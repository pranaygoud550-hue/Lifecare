import { FileText, Download, Calendar, User, Plus, Bell } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useGetPrescriptionsQuery, useCreatePrescriptionMutation, useEnablePrescriptionRemindersMutation } from '@/features/api/apiSlice';
import { useAppSelector } from '@/hooks/redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/utils';
import { downloadPrescriptionPdf } from '@/lib/prescriptionDownload';
import type { User as UserType, Prescription } from '@/types';

export function PrescriptionsPage() {
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointment');
  const { user } = useAppSelector((state) => state.auth);
  const isDoctor = user?.userType === 'doctor';

  const [showForm, setShowForm] = useState(!!appointmentId);
  const [diagnosis, setDiagnosis] = useState('');
  const [medications, setMedications] = useState([{ medicineName: '', dosage: '', frequency: 'Once daily', duration: '7 days' }]);
  const [advice, setAdvice] = useState('');

  const { data, isLoading, refetch } = useGetPrescriptionsQuery();
  const [createPrescription, { isLoading: creating }] = useCreatePrescriptionMutation();
  const [enableReminders, { isLoading: enablingReminders }] = useEnablePrescriptionRemindersMutation();

  const prescriptions = data?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentId) return;
    try {
      await createPrescription({
        appointmentId,
        diagnosis,
        medications: medications.filter((m) => m.medicineName),
        advice,
      }).unwrap();
      toast.success('Prescription created');
      setShowForm(false);
      refetch();
    } catch {
      toast.error('Failed to create prescription');
    }
  };

  const getDoctor = (p: Prescription): UserType | null => {
    if (typeof p.doctorId === 'object') return p.doctorId as UserType;
    return null;
  };

  const handleEnableReminders = async (prescriptionId: string) => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      await enableReminders(prescriptionId).unwrap();
      toast.success('Medicine reminders enabled — browser notifications at dose times');
    } catch {
      toast.error('Could not enable reminders');
    }
  };

  return (
    <div className="container-custom py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{isDoctor ? 'Prescriptions' : 'My Prescriptions'}</h1>
          <p className="text-muted">Digital prescriptions from consultations</p>
        </div>
        {isDoctor && appointmentId && (
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" /> New Prescription
          </Button>
        )}
      </div>

      {showForm && isDoctor && appointmentId && (
        <Card className="mb-8">
          <CardHeader><CardTitle>Create Prescription</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Diagnosis</Label>
                <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} required />
              </div>
              {medications.map((med, i) => (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Input placeholder="Medicine" value={med.medicineName} onChange={(e) => {
                    const updated = [...medications];
                    updated[i].medicineName = e.target.value;
                    setMedications(updated);
                  }} />
                  <Input placeholder="Dosage" value={med.dosage} onChange={(e) => {
                    const updated = [...medications];
                    updated[i].dosage = e.target.value;
                    setMedications(updated);
                  }} />
                  <Input placeholder="Frequency" value={med.frequency} onChange={(e) => {
                    const updated = [...medications];
                    updated[i].frequency = e.target.value;
                    setMedications(updated);
                  }} />
                  <Input placeholder="Duration" value={med.duration} onChange={(e) => {
                    const updated = [...medications];
                    updated[i].duration = e.target.value;
                    setMedications(updated);
                  }} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setMedications([...medications, { medicineName: '', dosage: '', frequency: 'Once daily', duration: '7 days' }])}>
                + Add Medicine
              </Button>
              <div>
                <Label>Advice</Label>
                <Input value={advice} onChange={(e) => setAdvice(e.target.value)} placeholder="Rest, fluids, follow-up..." />
              </div>
              <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Issue Prescription'}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-border rounded-lg animate-pulse" />)}
        </div>
      ) : prescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No prescriptions yet</p>
            <p className="text-muted mb-6">Prescriptions appear here after consultations</p>
            <Link to="/doctors"><Button>Book a Consultation</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((rx) => {
            const doctor = getDoctor(rx);
            return (
              <Card key={rx._id}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{rx.diagnosis || 'Prescription'}</h3>
                        <Badge variant="secondary">{formatDate(rx.date)}</Badge>
                      </div>
                      <p className="text-sm text-muted flex items-center gap-1 mb-3">
                        <User className="h-4 w-4" />
                        Dr. {doctor?.profile.firstName} {doctor?.profile.lastName}
                      </p>

                      <div className="space-y-2">
                        {rx.medications?.map((med, i) => (
                          <div key={i} className="text-sm p-2 bg-background rounded-md">
                            <span className="font-medium">{med.medicineName}</span>
                            <span className="text-muted"> — {med.dosage}, {med.frequency}, {med.duration}</span>
                          </div>
                        ))}
                      </div>

                      {rx.labTests?.length ? (
                        <p className="text-sm mt-3"><strong>Lab Tests:</strong> {rx.labTests.join(', ')}</p>
                      ) : null}
                      {rx.advice && <p className="text-sm mt-2 text-muted"><strong>Advice:</strong> {rx.advice}</p>}
                      {rx.followUpDate && (
                        <p className="text-sm mt-2 flex items-center gap-1">
                          <Calendar className="h-4 w-4" /> Follow-up: {formatDate(rx.followUpDate)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {!isDoctor && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1"
                          disabled={enablingReminders}
                          onClick={() => void handleEnableReminders(rx._id)}
                        >
                          <Bell className="h-4 w-4" /> Remind me
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => downloadPrescriptionPdf(rx, doctor)}
                      >
                        <Download className="h-4 w-4" /> Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
