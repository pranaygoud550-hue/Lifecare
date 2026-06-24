import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Heart, ChevronLeft, Stethoscope, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { OtpInput } from '@/components/auth/OtpInput';
import { PatientMedicalForm, type PatientMedicalFormValues } from '@/components/auth/PatientMedicalForm';
import { useRegisterMutation, useSendOtpMutation, useSubmitDoctorVerificationMutation } from '@/features/api/apiSlice';
import { useAppDispatch } from '@/hooks/redux';
import { setUser } from '@/features/auth/authSlice';
import { storeAuthTokens } from '@/lib/authTokens';
import { buildMedicalHistoryPayload } from '@/lib/medicalFormUtils';
import { getApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { isValidIndianMobile, normalizePhone, formatPhoneDisplay } from '@/lib/phone';

const accountSchema = z.object({
  userType: z.enum(['patient', 'doctor', 'pharmacy', 'ambulance']),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z
    .string()
    .min(10, 'Invalid phone number')
    .refine((p) => isValidIndianMobile(normalizePhone(p)), 'Enter a valid 10-digit mobile number'),
});

const medicalSchema = z.object({
  bloodGroup: z.string().min(1, 'Blood group is required'),
  heightCm: z.coerce.number().optional(),
  weightKg: z.coerce.number().optional(),
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

type AccountForm = z.infer<typeof accountSchema>;
type Step = 'account' | 'otp' | 'medical' | 'doctor-credentials';

export function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [step, setStep] = useState<Step>('account');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [accountData, setAccountData] = useState<AccountForm | null>(null);

  const [sendOtp, { isLoading: sendingOtp }] = useSendOtpMutation();
  const [registerUser, { isLoading: registering }] = useRegisterMutation();
  const [submitVerification, { isLoading: uploadingDocs }] = useSubmitDoctorVerificationMutation();

  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [degreeFile, setDegreeFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);

  const accountForm = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: { userType: 'patient' },
  });

  const medicalForm = useForm<PatientMedicalFormValues>({
    resolver: zodResolver(medicalSchema),
    defaultValues: { organDonor: false },
  });

  const userType = useWatch({ control: accountForm.control, name: 'userType' });
  const isPatient = userType === 'patient';
  const isDoctor = userType === 'doctor';

  const onAccountSubmit = async (data: AccountForm) => {
    const normalized = normalizePhone(data.phone);
    try {
      const result = await sendOtp({ phone: normalized, purpose: 'register' }).unwrap();
      setAccountData({ ...data, phone: normalized });
      setStep('otp');
      setOtp('');
      if (result.data.otp) {
        setDevOtp(result.data.otp);
      } else {
        toast.success('Verification code sent');
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not send verification code'));
    }
  };

  const onOtpContinue = async () => {
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    if (isPatient) {
      setStep('medical');
    } else if (isDoctor) {
      setStep('doctor-credentials');
    } else {
      await completeRegistration();
    }
  };

  const completeRegistration = async (medical?: PatientMedicalFormValues, registrationNumber?: string) => {
    if (!accountData) return;
    const payload: Record<string, unknown> = {
      userType: accountData.userType,
      firstName: accountData.firstName,
      lastName: accountData.lastName,
      phone: accountData.phone,
      otp,
    };
    if (medical) {
      payload.dateOfBirth = medical.dateOfBirth;
      payload.gender = medical.gender;
      payload.medicalHistory = buildMedicalHistoryPayload(medical);
    }
    if (registrationNumber) {
      payload.registrationNumber = registrationNumber;
    }
    const result = await registerUser(payload).unwrap();
    storeAuthTokens(result.data.accessToken, result.data.refreshToken);
    dispatch(setUser(result.data.user));
    if (accountData.userType !== 'doctor') {
      toast.success('Account created successfully!');
      navigate('/appointments');
    }
  };

  const onMedicalSubmit = medicalForm.handleSubmit((data) => completeRegistration(data));

  const onDoctorCredentialsSubmit = async () => {
    if (!licenseNumber.trim() || !licenseFile || !degreeFile || !idFile) {
      toast.error('License number and all three documents are required');
      return;
    }
    try {
      await completeRegistration(undefined, licenseNumber.trim());
      const form = new FormData();
      form.append('medicalLicenseNumber', licenseNumber.trim());
      form.append('medicalLicense', licenseFile);
      form.append('degreeCertificate', degreeFile);
      form.append('identityProof', idFile);
      await submitVerification(form).unwrap();
      toast.success('Account created — verification submitted for review');
      navigate('/doctor/verification');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Registration failed'));
    }
  };

  const steps: { id: Step; label: string }[] = isPatient
    ? [
        { id: 'account', label: 'Account' },
        { id: 'otp', label: 'Verify OTP' },
        { id: 'medical', label: 'Medical Info' },
      ]
    : isDoctor
      ? [
          { id: 'account', label: 'Account' },
          { id: 'otp', label: 'Verify OTP' },
          { id: 'doctor-credentials', label: 'Credentials' },
        ]
      : [
          { id: 'account', label: 'Account' },
          { id: 'otp', label: 'Verify OTP' },
        ];

  const stepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <Card className={cn('w-full', step === 'medical' ? 'max-w-2xl' : 'max-w-lg')}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Heart className="h-10 w-10 text-primary fill-primary" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            {step === 'medical'
              ? 'Complete your medical profile for safer care'
              : 'Register with your mobile number and OTP'}
          </CardDescription>

          <div className="flex justify-center gap-2 mt-4">
            {steps.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                  i <= stepIndex ? 'bg-primary/10 text-primary' : 'text-muted'
                )}
              >
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">
                  {i + 1}
                </span>
                {s.label}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {step === 'account' && (
            <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
              <div>
                <Label>I am a</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm mt-1"
                  {...accountForm.register('userType')}
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="ambulance">Ambulance Driver</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input {...accountForm.register('firstName')} />
                  {accountForm.formState.errors.firstName && (
                    <p className="text-sm text-accent mt-1">{accountForm.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input {...accountForm.register('lastName')} />
                  {accountForm.formState.errors.lastName && (
                    <p className="text-sm text-accent mt-1">{accountForm.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Mobile number</Label>
                <Input type="tel" placeholder="98765 43210" {...accountForm.register('phone')} />
                {accountForm.formState.errors.phone && (
                  <p className="text-sm text-accent mt-1">{accountForm.formState.errors.phone.message}</p>
                )}
                <p className="text-xs text-muted mt-1">We&apos;ll send a one-time code — no email or password needed</p>
              </div>

              {isDoctor && (
                <p className="text-xs text-muted flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" /> You will upload license & certificates in the next step.
                </p>
              )}

              <Button type="submit" className="w-full" disabled={sendingOtp}>
                {sendingOtp ? 'Sending OTP...' : 'Continue — Send OTP'}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              <p className="text-sm text-muted text-center">
                OTP for{' '}
                <strong>
                  {accountData?.phone ? formatPhoneDisplay(accountData.phone) : ''}
                </strong>
              </p>
              {devOtp && (
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-center">
                  <p className="text-xs text-muted mb-1">Your code</p>
                  <p className="text-2xl font-bold tracking-[0.25em] text-primary">{devOtp}</p>
                </div>
              )}
              <OtpInput value={otp} onChange={setOtp} />
              <Button type="button" className="w-full" onClick={onOtpContinue} disabled={registering}>
                {registering
                  ? 'Please wait...'
                  : isPatient
                    ? 'Continue to Medical Profile'
                    : isDoctor
                      ? 'Continue to Credentials'
                      : 'Create Account'}
              </Button>
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-muted hover:text-foreground mx-auto"
                onClick={() => setStep('account')}
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            </div>
          )}

          {step === 'doctor-credentials' && (
            <div className="space-y-4">
              <p className="text-sm text-muted">Upload documents for admin verification</p>
              <div>
                <Label>Medical license number</Label>
                <Input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="mt-1"
                  placeholder="MCI / State council number"
                />
              </div>
              {[
                { label: 'Medical license document', file: licenseFile, set: setLicenseFile, key: 'l' },
                { label: 'Degree certificate', file: degreeFile, set: setDegreeFile, key: 'd' },
                { label: 'Identity proof', file: idFile, set: setIdFile, key: 'i' },
              ].map((item) => (
                <div key={item.key}>
                  <Label>{item.label}</Label>
                  <label className="mt-1 flex items-center gap-2 p-3 border border-dashed rounded-lg cursor-pointer hover:bg-background">
                    <Upload className="h-4 w-4 text-muted" />
                    <span className="text-sm truncate flex-1">{item.file?.name || 'Choose file'}</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(e) => item.set(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              ))}
              <Button
                type="button"
                className="w-full"
                onClick={onDoctorCredentialsSubmit}
                disabled={registering || uploadingDocs}
              >
                {registering || uploadingDocs ? 'Submitting...' : 'Create account & submit verification'}
              </Button>
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-muted hover:text-foreground mx-auto"
                onClick={() => setStep('otp')}
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            </div>
          )}

          {step === 'medical' && (
            <form onSubmit={onMedicalSubmit} className="space-y-4">
              <PatientMedicalForm
                register={medicalForm.register}
                errors={medicalForm.formState.errors}
                setValue={medicalForm.setValue}
                watch={medicalForm.watch}
              />
              <Button type="submit" className="w-full" disabled={registering}>
                {registering ? 'Creating account...' : 'Complete Registration'}
              </Button>
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-muted hover:text-foreground mx-auto"
                onClick={() => setStep('otp')}
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            </form>
          )}

          <p className="text-center text-sm text-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
