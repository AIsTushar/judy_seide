import { prisma } from '../../prisma/client';

const handleCheckoutSessionCompleted = async (session: any) => {
  console.log('Inside handleCheckoutSessionCompleted');
  console.log(session);
  const userId = session.metadata.userId;
  const cartItems = JSON.parse(session.metadata.cart);

  await prisma.order.create({
    data: {
      customerId: userId,
      method: 'Stripe',
      amount: session.amount_total ? session.amount_total / 100 : 0,
      cartItems,
    },
  });
};

export const PaymentServices = { handleCheckoutSessionCompleted };
