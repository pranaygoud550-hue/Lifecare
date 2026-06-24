export interface MapPoint {
  lat: number;
  lng: number;
}

export interface HospitalMapPoint extends MapPoint {
  name: string;
  address?: string;
}

export function openRideInMaps(pickup: MapPoint, hospital?: HospitalMapPoint | null) {
  const url = hospital
    ? `https://www.google.com/maps/dir/?api=1&origin=${pickup.lat},${pickup.lng}&destination=${hospital.lat},${hospital.lng}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${pickup.lat},${pickup.lng}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
