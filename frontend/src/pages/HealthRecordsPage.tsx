import { useState, useRef } from 'react';
import { Upload, FolderOpen, Trash2, FileText, Image, Syringe } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useGetHealthRecordsQuery,
  useUploadHealthRecordMutation,
  useDeleteHealthRecordMutation,
} from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { HealthRecord } from '@/types';

const recordTypes = [
  { value: 'lab-report', label: 'Lab Report', icon: FileText },
  { value: 'prescription', label: 'Prescription', icon: FileText },
  { value: 'image', label: 'Scan/Image', icon: Image },
  { value: 'vaccination', label: 'Vaccination', icon: Syringe },
  { value: 'other', label: 'Other', icon: FolderOpen },
];

export function HealthRecordsPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [filter, setFilter] = useState('');
  const [title, setTitle] = useState('');
  const [recordType, setRecordType] = useState('lab-report');
  const [description, setDescription] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = useGetHealthRecordsQuery(
    filter ? { recordType: filter } : {}
  );
  const [uploadRecord, { isLoading: uploading }] = useUploadHealthRecordMutation();
  const [deleteRecord] = useDeleteHealthRecordMutation();

  const records = data?.data || [];

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const files = fileRef.current?.files;
    if (!title) {
      toast.error('Title is required');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('recordType', recordType);
    formData.append('description', description);
    if (files) {
      Array.from(files).forEach((f) => formData.append('files', f));
    }

    try {
      await uploadRecord(formData).unwrap();
      toast.success('Record uploaded successfully');
      setShowUpload(false);
      setTitle('');
      setDescription('');
      if (fileRef.current) fileRef.current.value = '';
      refetch();
    } catch {
      toast.error('Upload failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    try {
      await deleteRecord(id).unwrap();
      toast.success('Record deleted');
      refetch();
    } catch {
      toast.error('Delete failed');
    }
  };

  const getTypeIcon = (type: string) => {
    const found = recordTypes.find((t) => t.value === type);
    return found ? found.icon : FolderOpen;
  };

  return (
    <div className="container-custom py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Health Records Vault</h1>
          <p className="text-muted">Securely store and manage your medical documents</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)} className="gap-2">
          <Upload className="h-4 w-4" /> Upload Record
        </Button>
      </div>

      {showUpload && (
        <Card className="mb-8">
          <CardHeader><CardTitle>Upload Health Record</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Blood Test Report" />
                </div>
                <div>
                  <Label>Record Type</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm"
                    value={recordType}
                    onChange={(e) => setRecordType(e.target.value)}
                  >
                    {recordTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes" />
              </div>
              <div>
                <Label>Files (PDF, images)</Label>
                <Input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant={filter === '' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('')}>All</Button>
        {recordTypes.map((t) => (
          <Button key={t.value} variant={filter === t.value ? 'default' : 'outline'} size="sm" onClick={() => setFilter(t.value)}>
            {t.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-border rounded-lg animate-pulse" />)}
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-12 w-12 text-muted mx-auto mb-4" />
            <p className="text-lg font-medium">No health records yet</p>
            <p className="text-muted mt-2">Upload lab reports, prescriptions, and medical documents</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {records.map((record: HealthRecord) => {
            const Icon = getTypeIcon(record.recordType);
            return (
              <Card key={record._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{record.title}</h3>
                      <p className="text-xs text-muted capitalize">{record.recordType.replace('-', ' ')} • {formatDate(record.date)}</p>
                      {record.description && <p className="text-sm text-muted mt-1 line-clamp-2">{record.description}</p>}
                      {record.tags?.length ? (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {record.tags.map((tag) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                        </div>
                      ) : null}
                      {record.files?.length ? (
                        <p className="text-xs text-muted mt-2">{record.files.length} file(s) attached</p>
                      ) : null}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(record._id)}>
                      <Trash2 className="h-4 w-4 text-accent" />
                    </Button>
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
