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

// Get weekly overview data circel chart
export const getWeeklyOverview = async () => {
  // 1. Get all paid orders
  const orders = await prisma.order.findMany({
    where: { isPaid: true },
    select: { cartItems: true },
  });

  // 2. Flatten all cart items
  const allCartItems: { productId: string; quantity: number }[] =
    orders.flatMap(
      (order) => order.cartItems as { productId: string; quantity: number }[],
    );

  // 3. Get unique product IDs
  const uniqueProductIds = [
    ...new Set(allCartItems.map((item) => item.productId)),
  ];

  // 4. Fetch product details with categories
  const allProducts = await prisma.product.findMany({
    where: { id: { in: uniqueProductIds } },
    include: { category: true },
  });

  // 5. Build product map
  const productMap = new Map(
    allProducts.map((product) => [product.id, product]),
  );

  // 6. Calculate sales per category
  const productSalesMap: Record<string, number> = {};

  for (const item of allCartItems) {
    const product = productMap.get(item.productId);
    if (!product || !product.category) continue;

    const categoryName = product.category.name;
    const saleAmount = (product.price || 0) * item.quantity;

    productSalesMap[categoryName] =
      (productSalesMap[categoryName] || 0) + saleAmount;
  }

  // 7. Get all categories (to include those with 0% too)
  const allCategories = await prisma.category.findMany();

  // 8. Calculate total sales
  const totalSales = Object.values(productSalesMap).reduce((a, b) => a + b, 0);

  // 9. Final result with all categories included
  const categoryDistribution = allCategories.map((cat) => {
    const categoryName = cat.name;
    const categorySales = productSalesMap[categoryName] || 0;
    const percentage =
      totalSales === 0
        ? 0
        : Number(((categorySales / totalSales) * 100).toFixed(2));

    return {
      category: categoryName,
      percentage,
    };
  });

  return categoryDistribution;
};

// getWeeklySales
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
