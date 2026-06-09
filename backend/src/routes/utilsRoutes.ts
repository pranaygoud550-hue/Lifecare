import { Router } from 'express';
import { searchCities, getCityDetails } from '../controllers/utilsController.js';

const router = Router();

router.get('/cities', searchCities);
router.get('/cities/:city', getCityDetails);

export default router;
