import { prisma } from '../../prisma/client';

const handleCheckoutSessionCompleted = async (session: any) => {
  console.log('Inside handleCheckoutSessionCompleted');
  console.log(session);
  const userId = session.metadata.userId;
  const cartItems = JSON.parse(session.metadata.cart);

  const address = `${session.customer_details.address.line1}, ${session.customer_details.address.city}, ${session.customer_details.address.country}`;

  await prisma.order.create({
    data: {
      customerId: userId,
      method: 'Stripe',
      email: session.customer_details.email,
      address,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      isPaid: true,
      cartItems,
    },
  });
};

export const PaymentServices = { handleCheckoutSessionCompleted };
