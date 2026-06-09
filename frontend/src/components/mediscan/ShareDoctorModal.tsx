import { useMemo, useState } from 'react';
import { X, Stethoscope } from 'lucide-react';
import { useGetAppointmentsQuery, useGetDoctorsQuery } from '@/features/api/apiSlice';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import type { Doctor, User } from '@/types';

interface ShareDoctorModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (doctorId: string) => void;
  isLoading?: boolean;
}

export function ShareDoctorModal({ open, onClose, onSelect, isLoading }: ShareDoctorModalProps) {
  const [search, setSearch] = useState('');
  const { data: appointmentsData } = useGetAppointmentsQuery({});
  const { data: doctorsData } = useGetDoctorsQuery({ limit: '20' });

  const recentDoctors = useMemo(() => {
    const appts = appointmentsData?.data?.appointments ?? [];
    const seen = new Map<string, User>();
    for (const a of appts) {
      const doc = a.doctorId;
      if (typeof doc === 'object' && doc?._id) {
        seen.set(doc._id, doc as User);
      }
    }
    return Array.from(seen.values());
  }, [appointmentsData]);

  const allDoctors = (doctorsData?.data?.doctors ?? []) as Doctor[];
  const q = search.trim().toLowerCase();

  const filteredRecent = recentDoctors.filter((d) =>
    `${d.profile.firstName} ${d.profile.lastName}`.toLowerCase().includes(q)
  );
  const filteredAll = allDoctors.filter((d) =>
    `${d.profile.firstName} ${d.profile.lastName}`.toLowerCase().includes(q)
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Share with doctor
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-background" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 border-b border-border">
          <Input
            placeholder="Search doctors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {filteredRecent.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Your doctors</p>
              <ul className="space-y-2">
                {filteredRecent.map((doc) => (
                  <DoctorRow
                    key={doc._id}
                    doc={doc}
                    onSelect={() => onSelect(doc._id)}
                    disabled={isLoading}
                  />
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">All doctors</p>
            <ul className="space-y-2">
              {filteredAll.map((doc) => (
                <DoctorRow
                  key={doc._id}
                  doc={doc}
                  onSelect={() => onSelect(doc._id)}
                  disabled={isLoading}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function DoctorRow({
  doc,
  onSelect,
  disabled,
}: {
  doc: { _id: string; profile: { firstName: string; lastName: string; profilePhoto?: string }; doctorDetails?: { specializations?: string[] } };
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={doc.profile.profilePhoto} />
          <AvatarFallback>{getInitials(doc.profile.firstName, doc.profile.lastName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">
            Dr. {doc.profile.firstName} {doc.profile.lastName}
          </p>
          <p className="text-xs text-muted truncate">
            {doc.doctorDetails?.specializations?.[0] ?? 'General physician'}
          </p>
        </div>
      </button>
    </li>
  );
}
