import type { Request, Response } from 'express';
import { autocomplete, findNearestHospital, getPlaceDetails } from '../services/placesService.js';

export async function placesAutocomplete(req: Request, res: Response) {
  const input = String(req.query.input || '');
  const lat = req.query.lat ? Number(req.query.lat) : undefined;
  const lng = req.query.lng ? Number(req.query.lng) : undefined;
  const suggestions = await autocomplete(input, lat, lng);
  return res.json({ success: true, data: suggestions });
}

export async function placesDetails(req: Request, res: Response) {
  const placeId = String(req.params.placeId || '');
  const details = await getPlaceDetails(placeId);
  if (!details) return res.status(404).json({ success: false, message: 'Place not found' });
  return res.json({ success: true, data: details });
}

export async function nearestHospital(req: Request, res: Response) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ success: false, message: 'lat and lng required' });
  }
  const hospital = await findNearestHospital({ lat, lng });
  if (!hospital) return res.status(404).json({ success: false, message: 'No hospital found' });
  return res.json({ success: true, data: hospital });
}
