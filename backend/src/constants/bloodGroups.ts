export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export function isValidBloodGroup(value: string): value is BloodGroup {
  return (BLOOD_GROUPS as readonly string[]).includes(value);
}

export function mapsUrlForCoords(lat: number, lng: number, label?: string): string {
  const q = label ? encodeURIComponent(label) : `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=driving&q=${q}`;
}
