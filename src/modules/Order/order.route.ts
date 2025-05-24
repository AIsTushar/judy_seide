import { Router } from 'express';
import { OrderController } from './order.controller';
import auth from '../../middlewares/auth';
const router = Router();

router.get('/get-all-orders', auth('ADMIN'), OrderController.getAllOrders);
router.get('/get-user-orders/:id', OrderController.getUserOrders);
router.get('/my-orders', auth('USER'), OrderController.getMyOrders);
router.get('/my-orders/:id', auth('USER'), OrderController.getMyOrderByID);

export const OrderRoutes = router;
