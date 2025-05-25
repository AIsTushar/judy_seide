import { prisma } from '../../prisma/client';

const handleCheckoutSessionCompleted = async (session: any) => {
  console.log('Inside handleCheckoutSessionCompleted');
  console.log(session);
  const userId = session.metadata.userId;
  const cartItems = JSON.parse(session.metadata.cart);

  const address = `${session.customer_details.address.line1}, ${session.customer_details.address.line2}, ${session.customer_details.address.city}, ${session.customer_details.address.country}`;
  const phone = session.customer_details?.phone;

  await prisma.order.create({
    data: {
      customerId: userId,
      method: 'Stripe',
      email: session.customer_details.email,
      address,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      phone,
      isPaid: true,
      cartItems,
    },
  });
};

export const PaymentServices = { handleCheckoutSessionCompleted };
