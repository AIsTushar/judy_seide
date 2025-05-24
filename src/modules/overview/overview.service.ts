import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subDays,
} from 'date-fns';
import { prisma } from '../../prisma/client';

const getOverview = async () => {
  const now = new Date();

  // Time ranges
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Today's total orders
  const todayOrders = await prisma.order.count({
    where: {
      orderTime: {
        gte: todayStart,
        lte: todayEnd,
      },
      isPaid: true,
    },
  });

  // This month's total orders
  const monthOrders = await prisma.order.count({
    where: {
      orderTime: {
        gte: monthStart,
        lte: monthEnd,
      },
      isPaid: true,
    },
  });

  // This month's total sales
  const monthSalesAgg = await prisma.order.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      orderTime: {
        gte: monthStart,
        lte: monthEnd,
      },
      isPaid: true,
    },
  });

  // Total sales
  const totalSalesAgg = await prisma.order.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      isPaid: true,
    },
  });

  return {
    todayOrders,
    monthOrders,
    monthSales: monthSalesAgg._sum.amount || 0,
    totalSales: totalSalesAgg._sum.amount || 0,
  };
};

const getWeeklyOverview = async () => {
  // Step 1: Get all paid orders
  const orders = await prisma.order.findMany({
    where: { isPaid: true },
    select: {
      cartItems: true,
    },
  });

  // Step 2: Flatten and process all cart items
  const productSalesMap: Record<string, number> = {}; // { categoryName: totalSales }

  for (const order of orders) {
    const cart = order.cartItems as {
      productId: string;
      price: number;
      quantity: number;
    }[];

    for (const item of cart) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { category: true },
      });

      if (product?.category?.name) {
        const catName = product.category.name;
        const saleAmount = item.price * item.quantity;

        productSalesMap[catName] = (productSalesMap[catName] || 0) + saleAmount;
      }
    }
  }

  // Step 3: Calculate total and percentage
  const totalSales = Object.values(productSalesMap).reduce((a, b) => a + b, 0);

  const categoryDistribution = Object.entries(productSalesMap).map(
    ([category, amount]) => ({
      category,
      percentage:
        totalSales === 0 ? 0 : Number(((amount / totalSales) * 100).toFixed(2)),
    }),
  );

  return categoryDistribution;
};

const getWeeklySales = async () => {
  const sevenDaysAgo = subDays(new Date(), 6); // includes today

  // Fetch paid orders from the last 7 days
  const orders = await prisma.order.findMany({
    where: {
      isPaid: true,
      orderTime: {
        gte: startOfDay(sevenDaysAgo),
      },
    },
    select: {
      orderTime: true,
      amount: true,
    },
  });

  // Initialize summary with 0 values
  const salesSummary: Record<string, number> = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  };

  // Fill in actual amounts
  for (const order of orders) {
    const dayName = order.orderTime.toLocaleDateString('en-US', {
      weekday: 'long',
    });
    salesSummary[dayName] += order.amount;
  }

  return salesSummary;
};

export const OverviewServices = {
  getOverview,
  getWeeklyOverview,
  getWeeklySales,
};
