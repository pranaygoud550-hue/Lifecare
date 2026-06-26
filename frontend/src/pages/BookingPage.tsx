import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Video,
  Building2,
  Wallet,
  CreditCard,
  Banknote,
  Upload,
  X,
  FileText,
  CalendarPlus,
  ExternalLink,
  Stethoscope,
} from 'lucide-react';
import {
  useGetDoctorByIdQuery,
  useBookAppointmentMutation,
  useUploadBookingReportsMutation,
  useConfirmAppointmentPaymentMutation,
  useCreateAppointmentPaymentIntentMutation,
  useGetWalletQuery,
} from '@/features/api/apiSlice';
import { StripeCheckoutForm } from '@/components/payments/StripeCheckoutForm';
import { isStripeEnabled } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DoctorAvailabilityPicker } from '@/components/doctor/DoctorAvailabilityPicker';
import { BookingProgressBar } from '@/components/booking/BookingProgressBar';
import { formatCurrency, formatDate, cn, getInitials } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/apiError';
import { buildGoogleCalendarUrl } from '@/lib/calendar';
import { scanTypeLabel } from '@/lib/mediscan';
import type { Appointment } from '@/types';

const STEPS = ['Schedule', 'Symptoms', 'Payment', 'Confirmation'];

const CONSULTATION_OPTIONS = [
  {
    id: 'video' as const,
    label: 'Video Consultation',
    description: 'Join from home via secure video call',
    icon: Video,
  },
  {
    id: 'homeVisit' as const,
    label: 'In-clinic Visit',
    description: 'Visit the doctor at their clinic',
    icon: Building2,
  },
];

type PaymentMethod = 'wallet' | 'card' | 'clinic';

type UploadedFile = { name: string; url: string };

export function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const bookingPrefill = location.state as {
    chiefComplaint?: string;
    scanId?: string;
    scanBooking?: import('@/lib/mediscanBooking').ScanBookingPrefill;
  } | null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialType = searchParams.get('type') === 'homeVisit' ? 'homeVisit' : 'video';
  const hasPrefilledSlot = !!(searchParams.get('date') && searchParams.get('time'));

  const [step, setStep] = useState(0);
  const [consultationType, setConsultationType] = useState<'video' | 'homeVisit'>(initialType);
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || '');
  const [selectedTime, setSelectedTime] = useState(searchParams.get('time') || '');
  const [symptoms, setSymptoms] = useState(
    bookingPrefill?.scanBooking?.chiefComplaint ??
      bookingPrefill?.chiefComplaint ??
      ''
  );
  const scanReportId =
    bookingPrefill?.scanBooking?.scanReportId ?? bookingPrefill?.scanId;
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [cardClientSecret, setCardClientSecret] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const { data: doctorData } = useGetDoctorByIdQuery(id!);
  const { data: walletData } = useGetWalletQuery(undefined, { skip: step < 2 });
  const [bookAppointment, { isLoading: booking }] = useBookAppointmentMutation();
  const [uploadReports, { isLoading: uploading }] = useUploadBookingReportsMutation();
  const [confirmPayment, { isLoading: paying }] = useConfirmAppointmentPaymentMutation();
  const [createAppointmentPaymentIntent, { isLoading: loadingCardIntent }] =
    useCreateAppointmentPaymentIntentMutation();

  const doctor = doctorData?.data?.doctor;
  const walletBalance = walletData?.data?.balance ?? 0;

  const feeKey = consultationType === 'homeVisit' ? 'homeVisit' : consultationType;
  const fee =
    doctor?.doctorDetails?.consultationFees?.[
      feeKey as keyof typeof doctor.doctorDetails.consultationFees
    ] ?? 500;

  const handleSlotSelect = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (pendingFiles.length + files.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }
    setPendingFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPendingFiles = async (): Promise<string[]> => {
    const existing = uploadedFiles.map((f) => f.url);
    if (pendingFiles.length === 0) return existing;

    const formData = new FormData();
    pendingFiles.forEach((f) => formData.append('reports', f));
    const result = await uploadReports(formData).unwrap();
    const newFiles = result.data.files.map((f) => ({ name: f.fileName, url: f.fileUrl }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setPendingFiles([]);
    return [...existing, ...newFiles.map((f) => f.url)];
  };

  const handleStep1Continue = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select a date and time slot');
      return;
    }
    setStep(1);
  };

  const handleStep2Continue = async () => {
    if (!symptoms.trim()) {
      toast.error('Please describe your symptoms');
      return;
    }
    try {
      const attachmentUrls = await uploadPendingFiles();
      const result = await bookAppointment({
        doctorId: id,
        consultationType,
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
        chiefComplaint: symptoms.trim(),
        patientNotes: (bookingPrefill?.scanBooking?.patientNotes ?? symptoms).trim(),
        attachments: attachmentUrls.length ? attachmentUrls : undefined,
        scanReportId: scanReportId || undefined,
      }).unwrap();

      setAppointment(result.data);
      setStep(2);
      toast.success('Appointment reserved. Complete payment to confirm.');
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      toast.error(getApiErrorMessage(error, 'Booking failed'));
    }
  };

  const selectPaymentMethod = async (method: PaymentMethod) => {
    setPaymentMethod(method);
    setPaymentError(null);
    setCardClientSecret(null);

    if (method === 'card' && appointment && isStripeEnabled()) {
      try {
        const intent = await createAppointmentPaymentIntent(appointment._id).unwrap();
        setCardClientSecret(intent.data.clientSecret);
      } catch (err: unknown) {
        const error = err as { data?: { message?: string; code?: string } };
        setPaymentError(getApiErrorMessage(error, 'Could not initialize card payment'));
        if (error.data?.code === 'STRIPE_NOT_CONFIGURED') {
          toast.error('Stripe is not configured. Use wallet or pay at clinic.');
        }
      }
    }
  };

  const handleWalletOrClinicPayment = async () => {
    if (!paymentMethod || !appointment) {
      toast.error('Select a payment method');
      return;
    }

    try {
      const result = await confirmPayment({
        id: appointment._id,
        method: paymentMethod,
      }).unwrap();

      setAppointment(result.data);
      setStep(3);
      toast.success('Booking confirmed!');
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      toast.error(getApiErrorMessage(error, 'Payment failed'));
    }
  };

  const handleCardPaymentSuccess = async (paymentIntentId: string) => {
    if (!appointment) return;
    setPaymentError(null);
    try {
      const result = await confirmPayment({
        id: appointment._id,
        method: 'card',
        paymentIntentId,
      }).unwrap();

      setAppointment(result.data);
      setStep(3);
      toast.success('Booking confirmed! Confirmation email sent.');
    } catch (err: unknown) {
      const error = err as { data?: { message?: string; canRetry?: boolean } };
      const msg = getApiErrorMessage(error, 'Payment verification failed');
      setPaymentError(msg);
      toast.error(msg);
    }
  };

  const retryCardPayment = async () => {
    if (!appointment) return;
    setPaymentError(null);
    setCardClientSecret(null);
    await selectPaymentMethod('card');
  };

  if (!doctor) {
    return (
      <div className="container-custom py-8">
        <div className="h-64 bg-border animate-pulse rounded-lg" />
      </div>
    );
  }

  const doctorName = `Dr. ${doctor.profile.firstName} ${doctor.profile.lastName}`;
  const clinic = doctor.doctorDetails.clinic;
  const clinicAddress = clinic
    ? [clinic.name, clinic.address, clinic.city].filter(Boolean).join(', ')
    : '';

  const calendarUrl =
    appointment && step === 3
      ? buildGoogleCalendarUrl({
          title: `${consultationType === 'video' ? 'Video' : 'In-clinic'} — ${doctorName}`,
          date: selectedDate,
          time: selectedTime,
          description:
            consultationType === 'video'
              ? `Appointment ID: ${appointment.appointmentId}\nJoin from Appointments → Live Checkup 10 min before your slot.`
              : `Appointment ID: ${appointment.appointmentId}\nArrive 15 minutes early. Clinic: ${clinicAddress}`,
          location: consultationType === 'video' ? 'Online (LifeCare+)' : clinicAddress,
        })
      : '';

  return (
    <div className="container-custom py-8 max-w-3xl">
      <Button variant="ghost" className="mb-4" onClick={() => navigate(`/doctors/${id}`)}>
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to profile
      </Button>

      <div className="flex items-center gap-3 mb-6 p-4 rounded-xl border border-border bg-card">
        <Avatar className="h-12 w-12">
          <AvatarImage src={doctor.profile.profilePhoto} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(doctor.profile.firstName, doctor.profile.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{doctorName}</p>
          <p className="text-sm text-muted truncate">
            {doctor.doctorDetails.specializations?.[0] || 'General Physician'}
          </p>
        </div>
        <Badge variant="outline">{formatCurrency(fee)}</Badge>
      </div>

      {scanReportId && (
        <div className="mb-4 p-3 rounded-lg border border-primary/30 bg-primary/5 text-sm">
          <p className="font-medium text-primary">Booking linked to MediScan</p>
          <p className="text-muted mt-0.5">
            Your appointment notes include the AI scan result. Scan ID:{' '}
            <code className="text-xs bg-background px-1 rounded">{scanReportId}</code>
            {bookingPrefill?.scanBooking?.scanType && (
              <span className="block mt-1">
                Specialty focus: {scanTypeLabel(bookingPrefill.scanBooking.scanType)}
              </span>
            )}
          </p>
        </div>
      )}

      <BookingProgressBar steps={STEPS} currentStep={step} />

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
          <p className="text-sm text-muted">
            Step {step + 1} of {STEPS.length}
            {hasPrefilledSlot && step === 0 && ' · Slot pre-selected from profile'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Schedule */}
          {step === 0 && (
            <>
              <div>
                <Label className="text-base">Consultation type</Label>
                <div className="grid sm:grid-cols-2 gap-3 mt-3">
                  {CONSULTATION_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const optFee =
                      doctor.doctorDetails.consultationFees?.[
                        opt.id as keyof typeof doctor.doctorDetails.consultationFees
                      ] ?? fee;
                    const available = doctor.doctorDetails.consultationTypes?.includes(opt.id) ?? true;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={!available}
                        onClick={() => setConsultationType(opt.id)}
                        className={cn(
                          'p-4 rounded-xl border text-left transition-all',
                          consultationType === opt.id
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50',
                          !available && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Icon className="h-5 w-5 text-primary mb-2" />
                        <p className="font-semibold">{opt.label}</p>
                        <p className="text-xs text-muted mt-1">{opt.description}</p>
                        <p className="text-sm font-medium text-primary mt-2">{formatCurrency(optFee)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <DoctorAvailabilityPicker
                doctorId={id!}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onSlotSelect={handleSlotSelect}
              />

              {selectedDate && selectedTime && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                  <strong>Selected:</strong> {formatDate(selectedDate)} at {selectedTime}
                </div>
              )}

              <Button className="w-full" size="lg" onClick={handleStep1Continue} disabled={!selectedDate || !selectedTime}>
                Continue to symptoms <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}

          {/* Step 2: Symptoms */}
          {step === 1 && (
            <>
              <div>
                <Label htmlFor="symptoms">Describe your symptoms</Label>
                <textarea
                  id="symptoms"
                  rows={5}
                  placeholder="e.g. fever for 2 days, headache, any medicines taken..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-[120px]"
                />
              </div>

              <div>
                <Label>Upload existing reports (optional)</Label>
                <p className="text-xs text-muted mt-1">PDF, JPG, PNG — up to 5 files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" /> Choose files
                </Button>

                {pendingFiles.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {pendingFiles.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center justify-between text-sm p-2 rounded-lg bg-background border border-border">
                        <span className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          {f.name}
                        </span>
                        <button type="button" onClick={() => removePendingFile(i)} className="text-muted hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {uploadedFiles.length > 0 && (
                  <p className="text-xs text-muted mt-2">{uploadedFiles.length} file(s) already uploaded</p>
                )}
              </div>

              <div className="p-4 rounded-lg bg-background border border-border text-sm space-y-1">
                <p><strong>Type:</strong> {consultationType === 'video' ? 'Video' : 'In-clinic'}</p>
                <p><strong>When:</strong> {formatDate(selectedDate)} at {selectedTime}</p>
                <p><strong>Fee:</strong> {formatCurrency(fee)}</p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button className="flex-1" onClick={handleStep2Continue} disabled={booking || uploading}>
                  {booking || uploading ? 'Saving...' : 'Continue to payment'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Payment */}
          {step === 2 && appointment && (
            <>
              <div className="p-4 rounded-lg bg-background border border-border space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Consultation fee</span>
                  <span>{formatCurrency(fee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform fee</span>
                  <span>{formatCurrency(0)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(fee)}</span>
                </div>
              </div>

              <div>
                <Label className="text-base">Payment method</Label>
                <div className="space-y-3 mt-3">
                  <button
                    type="button"
                    onClick={() => selectPaymentMethod('wallet')}
                    className={cn(
                      'w-full p-4 rounded-xl border text-left flex items-start gap-3 transition-all',
                      paymentMethod === 'wallet' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Wallet className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">Health Wallet</p>
                      <p className="text-sm text-muted">Balance: {formatCurrency(walletBalance)}</p>
                      {walletBalance < fee && (
                        <p className="text-xs text-amber-600 mt-1">Insufficient balance — add money from Wallet page</p>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => selectPaymentMethod('card')}
                    className={cn(
                      'w-full p-4 rounded-xl border text-left flex items-start gap-3 transition-all',
                      paymentMethod === 'card' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <CreditCard className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Pay with Card</p>
                      <p className="text-sm text-muted">Secure payment via Stripe</p>
                    </div>
                  </button>

                  {consultationType === 'homeVisit' && (
                    <button
                      type="button"
                      onClick={() => selectPaymentMethod('clinic')}
                      className={cn(
                        'w-full p-4 rounded-xl border text-left flex items-start gap-3 transition-all',
                        paymentMethod === 'clinic' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Banknote className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Pay at clinic</p>
                        <p className="text-sm text-muted">Pay when you arrive for your in-clinic visit</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {paymentMethod === 'card' && (
                <div className="space-y-3">
                  {loadingCardIntent && (
                    <p className="text-sm text-muted text-center py-4">Loading secure checkout...</p>
                  )}
                  {paymentError && (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
                      <p className="text-destructive font-medium">{paymentError}</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={retryCardPayment}>
                        Retry payment
                      </Button>
                    </div>
                  )}
                  {cardClientSecret && !paymentError && (
                    <StripeCheckoutForm
                      clientSecret={cardClientSecret}
                      amountLabel={formatCurrency(fee)}
                      submitLabel="Pay"
                      onSuccess={handleCardPaymentSuccess}
                      onError={(msg) => {
                        setPaymentError(msg);
                        toast.error(msg);
                      }}
                      disabled={paying}
                    />
                  )}
                  {paymentMethod === 'card' && !isStripeEnabled() && !cardClientSecret && (
                    <p className="text-sm text-amber-600">
                      Stripe is not configured. Choose wallet or pay at clinic, or set VITE_STRIPE_PUBLISHABLE_KEY.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} disabled={paying}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                {paymentMethod !== 'card' && (
                  <Button
                    className="flex-1"
                    size="lg"
                    onClick={handleWalletOrClinicPayment}
                    disabled={
                      paying ||
                      !paymentMethod ||
                      (paymentMethod === 'wallet' && walletBalance < fee)
                    }
                  >
                    {paying ? 'Processing...' : `Pay ${formatCurrency(fee)}`}
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Step 4: Confirmation */}
          {step === 3 && appointment && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/20 text-secondary mb-4">
                  <Check className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Booking confirmed</h3>
                <p className="text-muted text-sm mt-1">Your appointment has been scheduled successfully</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-background space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Appointment ID</span>
                  <Badge className="font-mono">{appointment.appointmentId}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Doctor</span>
                  <span className="font-medium text-right">{doctorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Type</span>
                  <span className="capitalize">
                    {consultationType === 'video' ? 'Video consultation' : 'In-clinic visit'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Date & time</span>
                  <span className="font-medium">{formatDate(selectedDate)} · {selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Payment</span>
                  <span className="capitalize">
                    {appointment.payment?.status === 'paid' ? 'Paid' : 'Pay at clinic / pending'}
                  </span>
                </div>
              </div>

              {consultationType === 'video' ? (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="font-semibold flex items-center gap-2 text-primary mb-2">
                    <Video className="h-4 w-4" /> Joining instructions
                  </p>
                  <ul className="text-sm text-muted space-y-2 list-disc list-inside">
                    <li>Go to <strong>Appointments → Live Checkup</strong> 10 minutes before your slot</li>
                    <li>Ensure stable internet and allow camera/microphone permissions</li>
                    <li>Keep your reports ready if you uploaded any</li>
                    <li>Appointment ID: <code className="text-xs bg-background px-1 rounded">{appointment.appointmentId}</code></li>
                  </ul>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20">
                  <p className="font-semibold flex items-center gap-2 mb-2">
                    <Stethoscope className="h-4 w-4 text-secondary" /> Clinic visit instructions
                  </p>
                  <ul className="text-sm text-muted space-y-2 list-disc list-inside">
                    <li>Arrive 15 minutes before {selectedTime}</li>
                    {clinicAddress && <li>Location: {clinicAddress}</li>}
                    <li>Carry a valid ID and any medical reports</li>
                    {appointment.payment?.status !== 'paid' && (
                      <li>Pay consultation fee at the clinic reception</li>
                    )}
                  </ul>
                </div>
              )}

              <a
                href={calendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm font-medium"
              >
                <CalendarPlus className="h-4 w-4" /> Add to Google Calendar
                <ExternalLink className="h-3 w-3 text-muted" />
              </a>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="flex-1" onClick={() => navigate('/appointments')}>
                  View appointments
                </Button>
                {consultationType === 'video' && (
                  <Button variant="outline" className="flex-1" onClick={() => navigate('/live-checkup')}>
                    Go to Live Checkup
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
