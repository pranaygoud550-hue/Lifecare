import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useCreateHospitalAdminMutation,
  useGetHospitalAdminsQuery,
  useGetHospitalsQuery,
} from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export function AdminHospitalStaffPage() {
  const { data: adminsData, refetch } = useGetHospitalAdminsQuery();
  const { data: hospitalsData } = useGetHospitalsQuery({ city: 'Hyderabad', limit: '50' });
  const [createAdmin, { isLoading }] = useCreateHospitalAdminMutation();

  const [form, setForm] = useState({
    email: '',
    phone: '',
    password: 'Password@123',
    firstName: '',
    lastName: '',
    hospitalId: '',
    designation: 'Blood bank coordinator',
    bloodBankLicenseNumber: '',
    hospitalAuthorizationId: '',
  });

  const admins = adminsData?.data ?? [];
  const hospitals = hospitalsData?.data?.hospitals ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hospitalId) {
      toast.error('Select a hospital');
      return;
    }
    if (!form.bloodBankLicenseNumber.trim()) {
      toast.error('Blood bank license number is required');
      return;
    }
    try {
      await createAdmin(form).unwrap();
      toast.success('Hospital staff account created');
      setForm((f) => ({ ...f, email: '', phone: '', firstName: '', lastName: '' }));
      refetch();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : 'Failed to create account';
      toast.error(msg || 'Failed to create account');
    }
  };

  return (
    <div className="container-custom py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Hospital management staff</h1>
        <p className="text-muted mt-1">
          Create accounts for hospital blood bank coordinators. They can send blood emergency alerts to matching donors.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Add hospital staff</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>First name</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Last name</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Hospital</Label>
              <select
                value={form.hospitalId}
                onChange={(e) => setForm({ ...form, hospitalId: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Select hospital</option>
                {hospitals.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name} — {h.city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Blood bank license number</Label>
              <Input
                value={form.bloodBankLicenseNumber}
                onChange={(e) => setForm({ ...form, bloodBankLicenseNumber: e.target.value })}
                placeholder="Hospital-provided license (required)"
                required
              />
            </div>
            <div>
              <Label>Hospital authorization ID (optional)</Label>
              <Input
                value={form.hospitalAuthorizationId}
                onChange={(e) => setForm({ ...form, hospitalAuthorizationId: e.target.value })}
                placeholder="NABH / registration reference"
              />
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Staff must complete legal acknowledgment on first login before sending blood alerts.
              License details are stored for security audit.
            </p>
            <div>
              <Label>Designation</Label>
              <Input
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating…' : 'Create hospital staff'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Existing hospital staff ({admins.length})</h2>
        {admins.map((admin) => (
          <Card key={admin._id}>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {admin.profile.firstName} {admin.profile.lastName}
                </p>
                <p className="text-sm text-muted">{admin.email} · {admin.phone}</p>
                <p className="text-sm text-muted">
                  {admin.hospitalAdminDetails?.hospitalId?.name ?? 'No hospital linked'}
                </p>
              </div>
              <Badge variant="outline">Hospital admin</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
