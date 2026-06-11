import { Router } from 'express';
import { nearestHospital, placesAutocomplete, placesDetails } from '../controllers/placesController.js';

const router = Router();

router.get('/autocomplete', placesAutocomplete);
router.get('/details/:placeId', placesDetails);
router.get('/nearest-hospital', nearestHospital);

export default router;
