import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PatientMedicalForm, type PatientMedicalFormValues } from '@/components/auth/PatientMedicalForm';
import { ProfileRecordsWalletPanel } from '@/components/profile/ProfileCarePanels';
import { ProfileLanguageSettings } from '@/components/profile/ProfileLanguageSettings';
import {
  useGetMedicalHistoryQuery,
  useUpdateMedicalHistoryMutation,
  useGetHealthRecordsQuery,
  useGetWalletQuery,
} from '@/features/api/apiSlice';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { updateUser } from '@/features/auth/authSlice';
import { buildMedicalHistoryPayload, formatDateForInput } from '@/lib/medicalFormUtils';
import type { User } from '@/types';

const optionalPositiveNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}, z.number().optional());

const profileSchema = z.object({
  bloodGroup: z.string().min(1, 'Blood group is required'),
  heightCm: optionalPositiveNumber,
  weightKg: optionalPositiveNumber,
  organDonor: z.boolean().optional(),
  smokingStatus: z.string().optional(),
  alcoholUse: z.string().optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
  currentMedications: z.string().optional(),
  familyHistory: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insuranceNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
});

export function DashboardProfileSection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const { data, isLoading, isError } = useGetMedicalHistoryQuery(undefined, {
    skip: !user || user.userType !== 'patient',
  });
  const [updateMedical, { isLoading: saving }] = useUpdateMedicalHistoryMutation();
  const { data: recordsData } = useGetHealthRecordsQuery({}, { skip: !user });
  const { data: walletData } = useGetWalletQuery(undefined, { skip: !user });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PatientMedicalFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { organDonor: false, bloodGroup: '' },
  });

  useEffect(() => {
    const mh = (data?.data as User['medicalHistory'] | undefined) ?? user?.medicalHistory;
    reset({
      bloodGroup: mh?.bloodGroup || '',
      heightCm: mh?.heightCm,
      weightKg: mh?.weightKg,
      organDonor: mh?.organDonor ?? false,
      smokingStatus: mh?.smokingStatus || '',
      alcoholUse: mh?.alcoholUse || '',
      allergies: (mh?.allergies || []).join(', '),
      chronicConditions: (mh?.chronicConditions || []).join(', '),
      currentMedications: (mh?.currentMedications || []).join(', '),
      familyHistory: (mh?.familyHistory || []).join(', '),
      insuranceProvider: mh?.insuranceProvider || '',
      insuranceNumber: mh?.insuranceNumber || '',
      dateOfBirth: formatDateForInput(user?.profile?.dateOfBirth),
      gender: user?.profile?.gender || '',
    });
  }, [data, user, reset]);

  const onSubmit = async (form: PatientMedicalFormValues) => {
    try {
      const result = await updateMedical(buildMedicalHistoryPayload(form)).unwrap();
      dispatch(updateUser(result.data));
      toast.success(t('dashboard.savedSuccess'));
    } catch {
      toast.error(t('dashboard.saveFailed'));
    }
  };

  const height = watch('heightCm');
  const weight = watch('weightKg');
  const bmi =
    height && weight && Number.isFinite(height) && Number.isFinite(weight)
      ? (weight / ((height / 100) ** 2)).toFixed(1)
      : null;

  if (!user) {
    return <div className="h-48 animate-pulse bg-border rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t('dashboard.myProfileTitle')}</h2>
        <p className="text-sm text-muted mt-1">{t('dashboard.myProfileDesc')}</p>
      </div>

      <ProfileLanguageSettings />

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.medicalInfo')}</CardTitle>
          <CardDescription>{t('dashboard.medicalInfoDesc')}</CardDescription>
          {bmi && (
            <p className="text-sm text-muted">
              {t('dashboard.bmi')}: <span className="font-medium text-foreground">{bmi}</span>
            </p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 animate-pulse bg-border rounded-lg" />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {isError && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {t('dashboard.profileLoadHint')}
                </p>
              )}
              <PatientMedicalForm
                register={register}
                errors={{
                  ...errors,
                  bloodGroup: errors.bloodGroup
                    ? { ...errors.bloodGroup, message: t('profile.bloodGroupRequired') }
                    : errors.bloodGroup,
                }}
                setValue={setValue}
                watch={watch}
                showDemographics
              />
              <Button type="submit" className="w-full gap-2" disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? t('dashboard.saving') : t('dashboard.saveMedicalProfile')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-bold mb-3">{t('dashboard.recordsPayments')}</h3>
        <ProfileRecordsWalletPanel
          recordsCount={recordsData?.data?.length ?? 0}
          walletBalance={walletData?.data?.balance ?? 0}
        />
      </div>
    </div>
  );
}
