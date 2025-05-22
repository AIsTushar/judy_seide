import { Router } from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';
const router = Router();

router.post(
  '/create-checkout-session',
  auth('ADMIN', 'USER'),
  PaymentController.createCheckoutSession,
);
router.post('/webhook', PaymentController.webhook);

export const PaymentRoutes = router;
