import Stripe from 'stripe';
import stripe from '../../config/stripe';
import AppError from '../../errors/AppError';
import { prisma } from '../../prisma/client';
import catchAsync from '../../utils/catchAsync';
import { PaymentServices } from './payment.service';
import config from '../../config';
import sendResponse from '../../utils/sendResponse';

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
    success_url: `${config.client_url}/success`,
    cancel_url: `${config.client_url}/cancel`,
    phone_number_collection: {
      enabled: true,
    },
    line_items,
    metadata: {
      userId,
      cart: JSON.stringify(cartItems),
    },
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Checkout Session Created Successfully',
    Data: { url: session.url },
  });
});

// Webhook
const webhook = catchAsync(async (req, res) => {
  console.log('webhook called!!');
  const event = req.body as Stripe.Event;
  if (event.type === 'checkout.session.completed') {
    await PaymentServices.handleCheckoutSessionCompleted(
      event.data.object as Stripe.Checkout.Session,
    );
  }
  res.status(200).json({ status: 'success' });
});

export const PaymentController = { createCheckoutSession, webhook };
