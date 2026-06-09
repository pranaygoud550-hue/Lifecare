import { Router } from 'express';
import { getHospitals, getHospitalById, searchHospitalsByCity } from '../controllers/hospitalController.js';

const router = Router();

router.get('/', getHospitals);
router.get('/city/:city/search', searchHospitalsByCity);
router.get('/:id', getHospitalById);

export default router;
