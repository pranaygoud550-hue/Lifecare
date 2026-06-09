import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, FileText, Clock, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useGetDoctorVerificationStatusQuery,
  useSubmitDoctorVerificationMutation,
} from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getApiErrorMessage } from '@/lib/apiError';

export function DoctorVerificationPage() {
  const { data, isLoading, refetch } = useGetDoctorVerificationStatusQuery();
  const [submit, { isLoading: submitting }] = useSubmitDoctorVerificationMutation();

  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [degreeFile, setDegreeFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);

  const status = data?.data?.verificationStatus || 'none';
  const rejectionReason = data?.data?.rejectionReason;

  const canSubmit = status === 'none' || status === 'rejected';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseNumber.trim() || !licenseFile || !degreeFile || !idFile) {
      toast.error('Please fill license number and upload all three documents');
      return;
    }

    const form = new FormData();
    form.append('medicalLicenseNumber', licenseNumber.trim());
    form.append('medicalLicense', licenseFile);
    form.append('degreeCertificate', degreeFile);
    form.append('identityProof', idFile);

    try {
      await submit(form).unwrap();
      toast.success('Documents submitted for review');
      refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Upload failed'));
    }
  };

  if (isLoading) {
    return (
      <div className="container-custom py-8">
        <div className="h-64 bg-border rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="container-custom py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Doctor verification
          </CardTitle>
          <CardDescription>
            Upload your medical license, degree certificate, and government ID for admin review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'pending' && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
              <Clock className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Under review</p>
                <p className="text-sm mt-1">Our team is verifying your documents. You will be notified by email.</p>
              </div>
            </div>
          )}

          {status === 'approved' && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
              <Badge variant="success">Verified</Badge>
              <p className="text-sm">Your profile is live. Patients can book appointments with you.</p>
            </div>
          )}

          {status === 'rejected' && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-900">
              <XCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Verification declined</p>
                {rejectionReason && <p className="text-sm mt-1">{rejectionReason}</p>}
                <p className="text-sm mt-2">Update your documents below and resubmit.</p>
              </div>
            </div>
          )}

          {canSubmit ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>Medical license number</Label>
                <Input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. MCI-12345"
                  className="mt-1"
                />
              </div>

              {[
                { label: 'Medical license (PDF or image)', file: licenseFile, set: setLicenseFile, key: 'license' },
                { label: 'Degree certificate', file: degreeFile, set: setDegreeFile, key: 'degree' },
                { label: 'Identity proof (Aadhaar / Passport)', file: idFile, set: setIdFile, key: 'id' },
              ].map((item) => (
                <div key={item.key}>
                  <Label>{item.label}</Label>
                  <label className="mt-1 flex items-center gap-3 p-4 border border-dashed border-border rounded-lg cursor-pointer hover:bg-background transition-colors">
                    <Upload className="h-5 w-5 text-muted" />
                    <span className="text-sm text-muted flex-1 truncate">
                      {item.file?.name || 'Choose file (max 10MB)'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(e) => item.set(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              ))}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Uploading...' : status === 'rejected' ? 'Resubmit for review' : 'Submit for verification'}
              </Button>
            </form>
          ) : null}

          <Link to="/dashboard" className="text-sm text-primary hover:underline block text-center">
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
