import { Router } from 'express';
import { reviewController } from './review.controller';
import auth from '../../middlewares/auth';
const router = Router();

router.post('/create-review', auth('USER'), reviewController.createReview);
router.get('/get-all-reviews', () => {});
router.get('/get-review/:id', () => {});
router.get('/get-user-reviews/:id', () => {});
router.get('/get-product-reviews/:id', () => {});

export const ReviewRoutes = router;
