import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserRound, ChevronRight } from 'lucide-react';
import { useGetDoctorCarePatientsQuery } from '@/features/api/apiSlice';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import type { DoctorPatientListItem } from '@/types/doctorCare';

export function DoctorPatientsPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const querySearch = debounced.trim() || undefined;
  const { data, isLoading, isFetching } = useGetDoctorCarePatientsQuery(
    querySearch ? { search: querySearch } : undefined
  );

  const sharingHint = useMemo(
    () =>
      (data?.data?.patients ?? []).filter(
        (p: DoctorPatientListItem) =>
          p.healthDataSharing?.shareVitalsWithDoctors || p.healthDataSharing?.shareWellnessWithDoctors
      ).length,
    [data?.data?.patients]
  );

  const patients = (data?.data?.patients ?? []) as DoctorPatientListItem[];

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setDebounced(value), 350);
    setTimer(t);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">My patients</h1>
        <p className="text-muted text-sm">
          Search by name or phone. Update diet, dos & don&apos;ts, and push plans to the patient wellness tab.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          className="pl-9"
          placeholder="Search patient by name…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search patients"
        />
      </div>

      {sharingHint > 0 && (
        <p className="text-sm text-muted">
          {sharingHint} patient{sharingHint !== 1 ? 's' : ''} sharing vitals or wellness data with you.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-border animate-pulse" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            <UserRound className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No patients found{debounced ? ` for “${debounced}”` : ''}.</p>
            <p className="text-sm mt-1">Patients appear after they book a consultation with you.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {patients.map((p) => {
            const sharing = p.healthDataSharing;
            const sharesVitals = sharing?.shareVitalsWithDoctors;
            const sharesWellness = sharing?.shareWellnessWithDoctors;
            return (
              <li key={p._id}>
                <Link to={`/doctor/patients/${p._id}`}>
                  <Card className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={p.profile?.profilePhoto} />
                        <AvatarFallback>
                          {getInitials(p.profile?.firstName, p.profile?.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">
                          {p.profile?.firstName} {p.profile?.lastName}
                        </p>
                        <p className="text-sm text-muted truncate">{p.phone || p.email}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {sharesVitals && <Badge variant="secondary">Vitals shared</Badge>}
                          {sharesWellness && <Badge variant="outline">Wellness shared</Badge>}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {isFetching && !isLoading && (
        <p className="text-xs text-muted">Updating list…</p>
      )}
    </div>
  );
}
