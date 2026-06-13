import { useMemo } from 'react';
import { useGetHospitalRoutePreviewQuery } from '@/features/api/apiSlice';

type MapPoint = { lat: number; lng: number };

export function useDrivingRoute(
  origin: MapPoint | null | undefined,
  destination: MapPoint | null | undefined
): [number, number][] {
  const { data } = useGetHospitalRoutePreviewQuery(
    {
      originLat: origin!.lat,
      originLng: origin!.lng,
      destLat: destination!.lat,
      destLng: destination!.lng,
    },
    { skip: !origin || !destination }
  );

  return useMemo(() => {
    if (!origin || !destination) return [];
    const path = data?.data?.decodedPath;
    if (path && path.length >= 2) return path;
    return [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ];
  }, [origin, destination, data]);
}
