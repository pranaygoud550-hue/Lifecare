import { Router } from 'express';
import { getHospitals, getHospitalById, searchHospitalsByCity } from '../controllers/hospitalController.js';
import { getGooglePlaceDetails } from '../controllers/hospitalGoogleController.js';
import { mountGoogleHospitalRoutes, isGooglePlaceId } from './googleHospitalRoutes.js';

const router = Router();

router.get('/', getHospitals);
router.get('/city/:city/search', searchHospitalsByCity);
mountGoogleHospitalRoutes(router);

/** Google Place ID (ChIJ…) or mongo ObjectId */
router.get('/:id', (req, res, next) => {
  if (isGooglePlaceId(req.params.id)) {
    (req.params as { id: string; place_id: string }).place_id = req.params.id;
    return getGooglePlaceDetails(req, res, next);
  }
  return getHospitalById(req, res, next);
});

export default router;
