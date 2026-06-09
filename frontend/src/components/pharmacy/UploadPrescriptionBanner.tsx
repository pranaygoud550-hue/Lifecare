import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, X, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { useUploadHealthRecordMutation } from '@/features/api/apiSlice';
import { useAppSelector } from '@/hooks/redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function UploadPrescriptionBanner() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('Pharmacy prescription');
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadRecord, { isLoading }] = useUploadHealthRecordMutation();

  const handleOpen = () => {
    if (!isAuthenticated) {
      toast.info('Sign in to upload your prescription');
      navigate('/login');
      return;
    }
    setShowModal(true);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const files = fileRef.current?.files;
    if (!files?.length) {
      toast.error('Please select a prescription file');
      return;
    }

    const formData = new FormData();
    formData.append('title', title || 'Pharmacy prescription');
    formData.append('recordType', 'prescription');
    formData.append('description', 'Uploaded from pharmacy for medicine order');
    Array.from(files).forEach((f) => formData.append('files', f));

    try {
      await uploadRecord(formData).unwrap();
      toast.success('Prescription uploaded! Our pharmacist will verify Rx medicines in your cart.');
      setShowModal(false);
      setTitle('Pharmacy prescription');
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      toast.error('Upload failed. Try again or use Health Records.');
    }
  };

  return (
    <>
      <div className="mb-8 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <FileText className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg flex items-center gap-2">
            Upload Prescription
            <ShieldCheck className="h-4 w-4 text-secondary" />
          </p>
          <p className="text-sm text-muted mt-1">
            Ordering Rx medicines? Upload a valid doctor&apos;s prescription — verified by our licensed
            pharmacy partners within 30 minutes.
          </p>
        </div>
        <Button onClick={handleOpen} className="shrink-0 gap-2 w-full sm:w-auto">
          <Upload className="h-4 w-4" /> Upload now
        </Button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">Upload prescription</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-4 space-y-4">
              <div>
                <Label htmlFor="rx-title">Title (optional)</Label>
                <Input
                  id="rx-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Prescription file</Label>
                <p className="text-xs text-muted mb-2">PDF, JPG, or PNG — max 5 MB</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:cursor-pointer"
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? 'Uploading...' : 'Submit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
