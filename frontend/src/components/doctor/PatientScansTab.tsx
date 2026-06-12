import { useMemo, useState } from 'react';
import { Loader2, MessageSquarePlus, User } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useGetDoctorPatientScansQuery,
  useAddChestScanNoteMutation,
} from '@/features/api/apiSlice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  chestScanBadgeVariant,
  formatChestScanDate,
  resolveChestScanImageUrl,
} from '@/lib/chestScan';
import type { ChestScan, ChestScanPatientSummary } from '@/types/chestScan';

function patientName(scan: ChestScan): string {
  const patient = scan.patient as ChestScanPatientSummary | undefined;
  if (!patient?.profile) return 'Patient';
  return `${patient.profile.firstName ?? ''} ${patient.profile.lastName ?? ''}`.trim() || 'Patient';
}

export function PatientScansTab() {
  const { data, isLoading, refetch } = useGetDoctorPatientScansQuery();
  const [addNote, { isLoading: savingNote }] = useAddChestScanNoteMutation();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const scans = useMemo(() => data?.data ?? [], [data?.data]);

  const handleSaveNote = async (scanId: string) => {
    if (!noteText.trim()) {
      toast.error('Please enter a note before saving.');
      return;
    }
    try {
      await addNote({ id: scanId, doctorNote: noteText.trim() }).unwrap();
      toast.success('Note saved');
      setActiveNoteId(null);
      setNoteText('');
      void refetch();
    } catch {
      toast.error('Failed to save note');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading patient scans...
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted">
          No chest X-ray scans have been shared with you yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {scans.map((scan) => (
        <Card key={scan._id}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                {patientName(scan)}
              </CardTitle>
              <span className="text-sm text-muted">{formatChestScanDate(scan.createdAt)}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <img
                src={resolveChestScanImageUrl(scan.imageUrl)}
                alt="Patient chest X-ray"
                className="h-32 w-32 shrink-0 rounded-lg border object-cover"
              />
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={chestScanBadgeVariant(scan.prediction)}>
                    {scan.prediction}
                  </Badge>
                  <span className="font-semibold">{scan.confidence.toFixed(1)}% confidence</span>
                </div>
                <p className="text-sm leading-relaxed">{scan.explanation}</p>
                {scan.doctorNote && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="mb-1 font-medium">Your note</p>
                    <p>{scan.doctorNote}</p>
                  </div>
                )}
              </div>
            </div>

            {activeNoteId === scan._id ? (
              <div className="space-y-3 rounded-xl border p-4">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add clinical notes, follow-up recommendations, or observations..."
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSaveNote(scan._id)}
                    disabled={savingNote}
                  >
                    {savingNote ? 'Saving...' : 'Save note'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActiveNoteId(null);
                      setNoteText('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setActiveNoteId(scan._id);
                  setNoteText(scan.doctorNote ?? '');
                }}
              >
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                {scan.doctorNote ? 'Edit note' : 'Add note'}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
