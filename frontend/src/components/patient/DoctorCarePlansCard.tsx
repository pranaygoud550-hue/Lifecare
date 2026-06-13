import { Stethoscope } from 'lucide-react';
import { useGetMyDoctorCarePlansQuery } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DoctorCarePlan } from '@/types/doctorCare';
import type { User } from '@/types';

function doctorName(plan: DoctorCarePlan): string {
  const d = plan.doctorId;
  if (typeof d === 'object' && d && 'profile' in d) {
    const u = d as User;
    return `Dr. ${u.profile?.firstName ?? ''} ${u.profile?.lastName ?? ''}`.trim();
  }
  return 'Your doctor';
}

export function DoctorCarePlansCard() {
  const { data, isLoading } = useGetMyDoctorCarePlansQuery();
  const plans = (data?.data ?? []) as DoctorCarePlan[];

  if (isLoading) {
    return <div className="h-32 bg-border animate-pulse rounded-lg" />;
  }

  if (plans.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">From your doctor</h2>
      </div>
      {plans.map((plan) => (
        <Card key={plan._id} className="border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{plan.title}</CardTitle>
              <Badge variant="secondary">{doctorName(plan)}</Badge>
            </div>
            {plan.summary && <p className="text-sm text-muted">{plan.summary}</p>}
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {plan.dietInstructions && (
              <div>
                <p className="font-semibold text-primary mb-1">Diet</p>
                <p className="whitespace-pre-wrap">{plan.dietInstructions}</p>
              </div>
            )}
            {plan.dos?.length > 0 && (
              <div>
                <p className="font-semibold text-green-700 mb-1">Do</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  {plan.dos.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {plan.donts?.length > 0 && (
              <div>
                <p className="font-semibold text-red-700 mb-1">Don&apos;t</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  {plan.donts.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {plan.bpSugarNotes && (
              <div>
                <p className="font-semibold mb-1">BP / sugar guidance</p>
                <p className="whitespace-pre-wrap">{plan.bpSugarNotes}</p>
              </div>
            )}
            {plan.lifestyleNotes && (
              <div>
                <p className="font-semibold mb-1">Lifestyle</p>
                <p className="whitespace-pre-wrap">{plan.lifestyleNotes}</p>
              </div>
            )}
            <p className="text-xs text-muted pt-2">
              Updated {new Date(plan.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
