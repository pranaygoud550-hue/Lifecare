'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PlacesAutocomplete } from '@/components/PlacesAutocomplete';

type ServiceType = 'emergency' | 'scheduled' | 'diagnostic';
type VehicleType = 'BLS' | 'ALS' | 'PTV' | 'MORTUARY';

const HYDERABAD_HOSPITALS = [
  { name: 'Apollo Hospital, Jubilee Hills', address: 'Jubilee Hills, Hyderabad', coords: { lat: 17.4215, lng: 78.4078 } },
  { name: 'Yashoda Hospital, Somajiguda', address: 'Somajiguda, Hyderabad', coords: { lat: 17.4239, lng: 78.4575 } },
  { name: 'KIMS Hospital, Secunderabad', address: 'Secunderabad, Hyderabad', coords: { lat: 17.4399, lng: 78.4983 } },
];

function estimateFare(vehicle: VehicleType, km: number) {
  const base = { BLS: 500, ALS: 1200, PTV: 350, MORTUARY: 800 }[vehicle];
  const perKm = { BLS: 25, ALS: 45, PTV: 15, MORTUARY: 30 }[vehicle];
  return Math.round(base + km * perKm);
}

export default function BookPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [serviceType, setServiceType] = useState<ServiceType>((params.get('type') as ServiceType) || 'emergency');
  const [patientName, setPatientName] = useState(params.get('name') || '');
  const [age, setAge] = useState(Number(params.get('age') || 30));
  const [phone, setPhone] = useState(params.get('phone') || '');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [condition, setCondition] = useState('');
  const [isConscious, setIsConscious] = useState(true);
  const [allergies, setAllergies] = useState(params.get('allergies') || '');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState({ lat: 17.4486, lng: 78.3908 });
  const [destAddress, setDestAddress] = useState('');
  const [destCoords, setDestCoords] = useState(HYDERABAD_HOSPITALS[0].coords);
  const [destName, setDestName] = useState(HYDERABAD_HOSPITALS[0].name);
  const [nearestHospital, setNearestHospital] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>('BLS');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'pay_on_arrival'>('pay_on_arrival');
  const lifecarePatientId = params.get('lifecarePatientId') || '';

  const distanceKm = useMemo(() => {
    const R = 6371;
    const dLat = ((destCoords.lat - pickupCoords.lat) * Math.PI) / 180;
    const dLng = ((destCoords.lng - pickupCoords.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((pickupCoords.lat * Math.PI) / 180) *
        Math.cos((destCoords.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [pickupCoords, destCoords]);

  const fare = estimateFare(vehicleType, distanceKm);

  async function selectNearestHospital() {
    setNearestHospital(true);
    try {
      const res = await api.nearestHospital(pickupCoords.lat, pickupCoords.lng);
      const h = res.data;
      setDestName(h.name);
      setDestAddress(h.address);
      setDestCoords(h.coords);
    } catch {
      let best = HYDERABAD_HOSPITALS[0];
      let bestDist = Infinity;
      for (const h of HYDERABAD_HOSPITALS) {
        const d = Math.hypot(h.coords.lat - pickupCoords.lat, h.coords.lng - pickupCoords.lng);
        if (d < bestDist) {
          bestDist = d;
          best = h;
        }
      }
      setDestName(best.name);
      setDestAddress(best.address);
      setDestCoords(best.coords);
    }
  }

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const res = await api.createBooking({
        serviceType,
        patientName,
        age,
        phone,
        emergencyContact,
        condition,
        isConscious,
        allergies,
        pickup: { address: pickupAddress || 'Hyderabad', coords: pickupCoords },
        destination: { address: destAddress || destName, coords: destCoords, name: destName },
        nearestHospital,
        vehicleType,
        paymentMethod,
        lifecarePatientId: lifecarePatientId || undefined,
      });
      router.push(`/track/${res.data.booking.bookingId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold text-white">Book Medical Transport</h1>
      <p className="mt-2 text-slate-400">Step {step} of 5</p>

      <div className="mt-6 flex gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded ${s <= step ? 'bg-red-600' : 'bg-slate-800'}`} />
        ))}
      </div>

      {step === 1 && (
        <section className="mt-8 space-y-4">
          <h2 className="font-semibold text-white">Select service type</h2>
          {(['emergency', 'scheduled', 'diagnostic'] as ServiceType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setServiceType(t)}
              className={`block w-full rounded-xl border p-4 text-left capitalize ${
                serviceType === t ? 'border-red-600 bg-red-950/40' : 'border-slate-800'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </section>
      )}

      {step === 2 && (
        <section className="mt-8 grid gap-4">
          <Field label="Patient name" value={patientName} onChange={setPatientName} />
          <Field label="Age" value={String(age)} onChange={(v) => setAge(Number(v))} type="number" />
          <Field label="Contact number" value={phone} onChange={setPhone} />
          <Field label="Emergency contact" value={emergencyContact} onChange={setEmergencyContact} />
          <label className="block text-sm text-slate-400">
            Medical condition / reason
            <textarea className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-3" value={condition} onChange={(e) => setCondition(e.target.value)} rows={3} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isConscious} onChange={(e) => setIsConscious(e.target.checked)} />
            Patient is conscious
          </label>
          <Field label="Known allergies" value={allergies} onChange={setAllergies} />
          {params.get('lifecarePatientId') && (
            <p className="rounded-lg bg-green-950/40 p-3 text-sm text-green-300">✓ Pre-filled from LifeCare+ account</p>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="mt-8 grid gap-4">
          <PlacesAutocomplete
            label="Pickup location"
            value={pickupAddress}
            onChange={setPickupAddress}
            placeholder="Madhapur, Hyderabad"
            biasCoords={{ lat: 17.4486, lng: 78.3908 }}
            onSelect={(p) => {
              setPickupAddress(p.address);
              setPickupCoords(p.coords);
            }}
          />
          <PlacesAutocomplete
            label="Destination (hospital or address)"
            value={destAddress}
            onChange={setDestAddress}
            placeholder="Apollo Hospital, Jubilee Hills"
            biasCoords={pickupCoords}
            onSelect={(p) => {
              setDestAddress(p.address);
              setDestName(p.name);
              setDestCoords(p.coords);
              setNearestHospital(false);
            }}
          />
          <button
            type="button"
            onClick={() => void selectNearestHospital()}
            className="rounded-lg border border-red-800 px-4 py-2 text-sm text-red-300 hover:bg-red-950/40"
          >
            Take me to nearest emergency hospital
          </button>
          {nearestHospital && destName && (
            <p className="rounded-lg bg-red-950/30 p-3 text-sm text-red-200">Nearest: {destName}</p>
          )}
        </section>
      )}

      {step === 4 && (
        <section className="mt-8 space-y-3">
          {(['BLS', 'ALS', 'PTV', 'MORTUARY'] as VehicleType[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVehicleType(v)}
              className={`block w-full rounded-xl border p-4 text-left ${
                vehicleType === v ? 'border-red-600 bg-red-950/40' : 'border-slate-800'
              }`}
            >
              <span className="font-semibold">{v}</span>
              <span className="ml-2 text-sm text-slate-400">
                {v === 'ALS' ? 'ICU on wheels' : v === 'PTV' ? 'Non-emergency' : ''}
              </span>
            </button>
          ))}
        </section>
      )}

      {step === 5 && (
        <section className="mt-8 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-slate-400">Estimated distance: {distanceKm.toFixed(1)} km</p>
            <p className="mt-2 text-3xl font-bold text-white">₹{fare}</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setPaymentMethod('pay_on_arrival')} className={`flex-1 rounded-lg border p-3 ${paymentMethod === 'pay_on_arrival' ? 'border-red-600' : 'border-slate-700'}`}>
              Pay on arrival
            </button>
            <button type="button" onClick={() => setPaymentMethod('stripe')} className={`flex-1 rounded-lg border p-3 ${paymentMethod === 'stripe' ? 'border-red-600' : 'border-slate-700'}`}>
              Pay now (Stripe)
            </button>
          </div>
          {error && <p className="text-red-400">{error}</p>}
        </section>
      )}

      <div className="mt-8 flex justify-between">
        <button type="button" disabled={step === 1} onClick={() => setStep((s) => s - 1)} className="rounded-lg px-4 py-2 text-slate-400 disabled:opacity-40">
          Back
        </button>
        {step < 5 ? (
          <button type="button" onClick={() => setStep((s) => s + 1)} className="rounded-lg bg-red-600 px-6 py-2 font-semibold text-white">
            Continue
          </button>
        ) : (
          <button type="button" disabled={loading} onClick={submit} className="rounded-lg bg-red-600 px-6 py-2 font-semibold text-white disabled:opacity-50">
            {loading ? 'Booking…' : 'Confirm booking'}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block text-sm text-slate-400">
      {label}
      <input type={type} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}
