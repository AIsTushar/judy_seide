import { Router } from 'express';
import { ProductController } from './product.controller';
const router = Router();

router.post('/create-product', ProductController.createProduct);
router.get('/get-all-products', (req, res) => {
  res.send('get all products');
});
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
