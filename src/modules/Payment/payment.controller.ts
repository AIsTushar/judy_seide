import stripe from '../../config/stripe';
import AppError from '../../errors/AppError';
import { prisma } from '../../prisma/client';
import catchAsync from '../../utils/catchAsync';

const createCheckoutSession = catchAsync(async (req, res) => {
  const cartItems = req.body.cart;
  const userId = req.user.id;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  const productIds = cartItems.map(
    (item: { productId: string; quantity: number }) => item.productId,
  );
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
  });

  if (!products) {
    throw new AppError(404, 'Products not found');
  }

  // console.log(products);

  // 2. Create line_items for Stripe
  const line_items = cartItems.map(
    (item: { productId: string; quantity: number }) => {
      const product = products.find((p) => p.id === item.productId);
      // console.log(encodeURI(product?.imageUrl[0] ?? ''));
      return {
        price_data: {
          currency: 'usd',
          unit_amount: product?.price! * 100,
          product_data: {
            name: product?.name,
            description: product?.description,
            images: [encodeURI(product?.imageUrl?.[0] ?? '')],
          },
        },
        quantity: item.quantity,
      };
    },
  );

  // 3. Create Stripe session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: user?.email,
    success_url: `http://localhost:3000/success`,
    cancel_url: `http://localhost:3000/cancel`,
    line_items,
    metadata: {
      userId,
      cart: JSON.stringify(cartItems),
    },
  });

  res.status(200).json({ status: 'success', session });
});
const webhook = () => {};

export const PaymentController = { createCheckoutSession, webhook };
