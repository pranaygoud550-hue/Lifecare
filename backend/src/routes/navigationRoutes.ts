import { Router, type Response, type NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getNavigationRoute, getNavigationEta } from '../controllers/navigationController.js';
import {
  navigationRouteBodySchema,
  navigationEtaQuerySchema,
} from '../utils/schemas.js';

function authorizeEmergencyViewer(
  req: Parameters<typeof authenticate>[0],
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }
  next();
}

const router = Router();

router.post('/route', authenticate, authorizeEmergencyViewer, validate(navigationRouteBodySchema), getNavigationRoute);
router.get('/eta', authenticate, authorizeEmergencyViewer, validate(navigationEtaQuerySchema), getNavigationEta);

export default router;
