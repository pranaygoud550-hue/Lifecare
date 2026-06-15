import { Stethoscope, CheckCircle2, Heart, Sparkles } from 'lucide-react';
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
    return <div className="h-32 bg-emerald-100/50 animate-pulse rounded-2xl" />;
  }

  if (plans.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-emerald-100">
          <Stethoscope className="h-5 w-5 text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold">From your doctor</h2>
      </div>
      {plans.map((plan) => (
        <Card
          key={plan._id}
          className="border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/40 overflow-hidden shadow-sm wellness-card-shine lc-hover-lift lc-card-pop"
        >
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{plan.title}</CardTitle>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                {doctorName(plan)}
              </Badge>
            </div>
            {plan.summary && <p className="text-sm text-muted mt-1">{plan.summary}</p>}
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {plan.dietInstructions && (
              <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-100">
                <p className="font-semibold text-emerald-800 mb-1.5 flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" /> Diet
                </p>
                <p className="whitespace-pre-wrap leading-relaxed">{plan.dietInstructions}</p>
              </div>
            )}
            {plan.dos?.length > 0 && (
              <div className="p-3.5 rounded-xl bg-green-50/80 border border-green-100">
                <p className="font-semibold text-green-800 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Do
                </p>
                <ul className="space-y-1">
                  {plan.dos.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-green-600 shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {plan.donts?.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-100">
                <p className="font-semibold text-rose-700 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Go easy on
                </p>
                <ul className="space-y-1">
                  {plan.donts.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-rose-400 shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {plan.bpSugarNotes && (
              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-100">
                <p className="font-semibold text-blue-900 mb-1">BP / sugar guidance</p>
                <p className="whitespace-pre-wrap leading-relaxed">{plan.bpSugarNotes}</p>
              </div>
            )}
            {plan.lifestyleNotes && (
              <div className="p-3.5 rounded-xl bg-violet-50/80 border border-violet-100">
                <p className="font-semibold text-violet-900 mb-1">Lifestyle</p>
                <p className="whitespace-pre-wrap leading-relaxed">{plan.lifestyleNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
