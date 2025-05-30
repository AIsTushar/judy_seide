import { sendOrderConfirmationEmail } from '../../helpers/emailSender/emails';
import { prisma } from '../../prisma/client';

const handleCheckoutSessionCompleted = async (session: any) => {
  console.log('Inside handleCheckoutSessionCompleted');
  const userId = session.metadata.userId;
  const cartItems = JSON.parse(session.metadata.cart);

  const address = `${session.customer_details.address.line1 || ''}, ${session.customer_details.address.line2 || ''}, ${session.customer_details.address.city || ''}, ${session.customer_details.address.country || ''}`;
  const phone = session.customer_details?.phone;

  // Step 1: Extract productIds
  const productIds = cartItems.map((item: any) => item.productId);

  // Step 2: Fetch product details from DB
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      price: true,
    },
  });

  // Step 3: Merge product details with quantity from cart
  const detailedCartItems = cartItems.map((item: any) => {
    const product = products.find((p) => p.id === item.productId);
    return {
      productId: product?.id,
      name: product?.name,
      imageUrl: product?.imageUrl,
      quantity: item.quantity,
      price: product?.price,
    };
  });

  const totalAmount = session.amount_total ? session.amount_total / 100 : 0;

  // Step 4: Save the order
  const order = await prisma.order.create({
    data: {
      customerId: userId,
      method: 'Stripe',
      email: session.customer_details.email,
      address,
      amount: totalAmount,
      phone,
      isPaid: true,
      cartItems: detailedCartItems,
    },
  });

  // **Reduce product quantity in inventory**
  await Promise.all(
    cartItems.map(async (item: { productId: string; quantity: number }) => {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            decrement: item.quantity,
          },
          salesCount: {
            increment: item.quantity,
          },
        },
      });
    }),
  );

  // Step 5: (Optional) Send confirmation email
  await sendOrderConfirmationEmail(session.customer_details.email, {
    email: session.customer_details.email,
    id: order.id,
    date: new Date(order.createdAt).toLocaleDateString(),
    amount: totalAmount,
    address,
    phone,
    cartItems: detailedCartItems,
  });
};

export const PaymentServices = { handleCheckoutSessionCompleted };
