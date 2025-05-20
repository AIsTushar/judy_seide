import { Router } from 'express';
import { ProductController } from './product.controller';
import { upload } from '../../utils/sendImageToCloudinary';
import auth from '../../middlewares/auth';
const router = Router();

router.post(
  '/create-product',
  auth('ADMIN'),
  upload.array('images'),
  ProductController.createProduct,
);
router.get('/get-all-products', ProductController.getAllProducts);
router.get('/get-product/:id', (req, res) => {
  res.send('get product');
});
router.patch('/update-product/:id', (req, res) => {
  res.send('update product');
});
router.delete('/delete-product/:id', (req, res) => {
  res.send('delete product');
});

export const ProductRoutes = router;
