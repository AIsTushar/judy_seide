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

  if (!products || products.length !== cartItems.length) {
    throw new AppError(404, 'Some products not found');
  }

  // ✅ Step: Check if requested quantity is available
  for (const item of cartItems) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      throw new AppError(404, `Product not found for ID: ${item.productId}`);
    }
    if (product.quantity < item.quantity) {
      throw new AppError(
        400,
        `Insufficient stock for "${product.name}". Available: ${product.quantity}, Requested: ${item.quantity}`,
      );
    }
  }

  // ✅ Step: Build Stripe line items
  const line_items = cartItems.map(
    (item: { productId: string; quantity: number }) => {
      const product = products.find((p) => p.id === item.productId)!;
      console.log('product', product);

      return {
        price_data: {
          currency: 'usd',
          unit_amount: product.price * 100,
          product_data: {
            name: product.name,
            description: product.description,
            images: [encodeURI(product.imageUrl?.[0] ?? '')],
          },
        },
        quantity: item.quantity,
      };
    },
  );

  // ✅ Step: Create Stripe Checkout Session
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
