import { useTranslation } from 'react-i18next';
import type { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  BLOOD_GROUPS, GENDERS, SMOKING_OPTIONS, ALCOHOL_OPTIONS,
  COMMON_ALLERGIES, COMMON_CONDITIONS,
} from '@/lib/medicalConstants';

export interface PatientMedicalFormValues {
  bloodGroup: string;
  heightCm?: number;
  weightKg?: number;
  organDonor?: boolean;
  smokingStatus?: string;
  alcoholUse?: string;
  allergies?: string;
  chronicConditions?: string;
  currentMedications?: string;
  familyHistory?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  dateOfBirth?: string;
  gender?: string;
}

interface PatientMedicalFormProps {
  register: UseFormRegister<PatientMedicalFormValues>;
  errors: FieldErrors<PatientMedicalFormValues>;
  setValue: UseFormSetValue<PatientMedicalFormValues>;
  watch: UseFormWatch<PatientMedicalFormValues>;
  showDemographics?: boolean;
}

export function PatientMedicalForm({
  register, errors, setValue, watch, showDemographics = true,
}: PatientMedicalFormProps) {
  const { t } = useTranslation();
  const allergies = watch('allergies') || '';
  const conditions = watch('chronicConditions') || '';

  const toggleChip = (field: 'allergies' | 'chronicConditions', item: string) => {
    const current = (watch(field) || '').split(',').map((s) => s.trim()).filter(Boolean);
    const next = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item];
    setValue(field, next.join(', '));
  };

  const selectedAllergies = allergies.split(',').map((s) => s.trim()).filter(Boolean);
  const selectedConditions = conditions.split(',').map((s) => s.trim()).filter(Boolean);

  return (
    <div className="space-y-5">
      {showDemographics && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dateOfBirth">{t('profile.dateOfBirth')}</Label>
            <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
          </div>
          <div>
            <Label htmlFor="gender">{t('profile.gender')}</Label>
            <select
              id="gender"
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              {...register('gender')}
            >
              <option value="">{t('profile.select')}</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="bloodGroup">{t('profile.bloodGroup')} *</Label>
        <select
          id="bloodGroup"
          className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm mt-1"
          {...register('bloodGroup')}
        >
          <option value="">{t('profile.selectBloodGroup')}</option>
          {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
        </select>
        {errors.bloodGroup && (
          <p className="text-sm text-accent mt-1">{errors.bloodGroup.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="heightCm">{t('profile.heightCm')}</Label>
          <Input id="heightCm" type="number" placeholder="170" {...register('heightCm', { valueAsNumber: true })} />
        </div>
        <div>
          <Label htmlFor="weightKg">{t('profile.weightKg')}</Label>
          <Input id="weightKg" type="number" placeholder="65" {...register('weightKg', { valueAsNumber: true })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="smokingStatus">{t('profile.smoking')}</Label>
          <select
            id="smokingStatus"
            className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
            {...register('smokingStatus')}
          >
            <option value="">{t('profile.select')}</option>
            {SMOKING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="alcoholUse">{t('profile.alcoholUse')}</Label>
          <select
            id="alcoholUse"
            className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
            {...register('alcoholUse')}
          >
            <option value="">{t('profile.select')}</option>
            {ALCOHOL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" className="rounded" {...register('organDonor')} />
        {t('profile.organDonor')}
      </label>

      <div>
        <Label>{t('profile.knownAllergies')}</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {COMMON_ALLERGIES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleChip('allergies', a)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                selectedAllergies.includes(a)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted hover:border-primary'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <Input className="mt-2" placeholder={t('profile.otherAllergies')} {...register('allergies')} />
      </div>

      <div>
        <Label>{t('profile.chronicConditions')}</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {COMMON_CONDITIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleChip('chronicConditions', c)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                selectedConditions.includes(c)
                  ? 'bg-secondary text-white border-secondary'
                  : 'border-border text-muted hover:border-secondary'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <Input className="mt-2" placeholder={t('profile.otherConditions')} {...register('chronicConditions')} />
      </div>

      <div>
        <Label htmlFor="currentMedications">{t('profile.currentMedications')}</Label>
        <Input
          id="currentMedications"
          placeholder={t('profile.medicationsPlaceholder')}
          {...register('currentMedications')}
        />
      </div>

      <div>
        <Label htmlFor="familyHistory">{t('profile.familyHistory')}</Label>
        <Input
          id="familyHistory"
          placeholder={t('profile.familyHistoryPlaceholder')}
          {...register('familyHistory')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="insuranceProvider">{t('profile.insuranceProvider')}</Label>
          <Input id="insuranceProvider" placeholder={t('profile.optional')} {...register('insuranceProvider')} />
        </div>
        <div>
          <Label htmlFor="insuranceNumber">{t('profile.policyNumber')}</Label>
          <Input id="insuranceNumber" placeholder={t('profile.optional')} {...register('insuranceNumber')} />
        </div>
      </div>
    </div>
  );
}
