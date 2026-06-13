import { type Response, type NextFunction, type Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getNearbyGooglePlaces,
  getGooglePlaceDetails,
  getHospitalRoutePreview,
  recommendSmartHospital,
} from '../controllers/hospitalGoogleController.js';
import {
  googlePlaceDetailsParamSchema,
  hospitalRoutePreviewQuerySchema,
  nearbyGooglePlacesQuerySchema,
  smartHospitalQuerySchema,
} from '../utils/schemas.js';

function authorizePatient(req: Parameters<typeof authenticate>[0], res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }
  if (req.user.userType !== 'patient' && req.user.userType !== 'admin') {
    res.status(403).json({ success: false, message: 'Patients only' });
    return;
  }
  next();
}

/** Mount Google Places routes — must be registered before /:id mongo route. */
export function mountGoogleHospitalRoutes(router: Router): void {
  router.get('/nearby', validate(nearbyGooglePlacesQuerySchema), getNearbyGooglePlaces);
  router.get('/route-preview', validate(hospitalRoutePreviewQuerySchema), getHospitalRoutePreview);
  router.get('/recommend', authenticate, authorizePatient, validate(smartHospitalQuerySchema), recommendSmartHospital);
  router.get('/places/:place_id', validate(googlePlaceDetailsParamSchema), getGooglePlaceDetails);
}

/** Detect Google Place IDs vs Mongo ObjectId for GET /:id handler. */
export function isGooglePlaceId(id: string): boolean {
  if (/^[a-f0-9]{24}$/i.test(id)) return false;
  return /^[A-Za-z0-9_-]{20,}$/.test(id) && id.length >= 20;
}
