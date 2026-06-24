import { areaToDisplayName, type HyderabadArea } from '@/data/hyderabadAreas';
import type { HyderabadAreaSelection } from '@/components/emergency/HyderabadAreaSearch';

export function selectionFromHyderabadArea(
  area: HyderabadArea,
  landmark?: string
): HyderabadAreaSelection {
  return {
    area,
    lat: area.lat,
    lng: area.lng,
    address: areaToDisplayName(area, landmark),
    landmark,
  };
}
