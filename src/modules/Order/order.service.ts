import { PrismaQueryBuilder } from '../../builder/QueryBuilder';
import { prisma } from '../../prisma/client';

const getAllOrders = async (queryParams: Record<string, unknown>) => {
  const { searchTerm, status, ...rest } = queryParams;

  const queryBuilder = new PrismaQueryBuilder(rest, ['title', 'content']);

  const prismaQuery = queryBuilder
    .buildWhere()
    .buildSort()
    .buildPagination()
    .buildSelect()
    .getQuery();

  // Add custom search manually for customer.name and status
  const where: any = prismaQuery.where || {};

  if (searchTerm) {
    where.OR = [
      ...(where.OR || []),
      {
        customer: {
          name: {
            contains: String(searchTerm),
            mode: 'insensitive',
          },
        },
      },
    ];
  }

  if (status) {
    where.status = status;
  }

  const result = await prisma.order.findMany({
    ...prismaQuery,
    where,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
    },
  });

  const meta = await queryBuilder.getPaginationMeta({
    count: (args: any) =>
      prisma.order.count({
        ...args,
        where,
      }),
  });

  return {
    meta,
    data: result,
  };
};

// Get user's orders BY ID
const getUserOrders = async (
  id: string,
  queryParams: Record<string, unknown>,
) => {
  // Extract searchTerm and rest params
  const { searchTerm, ...rest } = queryParams;

  // Build base query without searchTerm filters
  const queryBuilder = new PrismaQueryBuilder(rest);
  const prismaQuery = queryBuilder
    .buildSort()
    .buildPagination()
    .buildSelect()
    .getQuery();

  // Base where filter by customer
  const where: any = {
    customerId: id,
  };

  // If there's a search term, we need to handle it specially for JSON fields
  if (
    searchTerm &&
    typeof searchTerm === 'string' &&
    searchTerm.trim() !== ''
  ) {
    const s = searchTerm.trim();

    // Define valid OrderStatus enum values
    const validOrderStatuses = [
      'PENDING',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
    ];

    // Build OR conditions for searchable string fields
    const orConditions: any[] = [
      { id: { contains: s, mode: 'insensitive' } },
      { method: { contains: s, mode: 'insensitive' } },
      { address: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
    ];

    // Add status search if the search term matches a valid enum value
    const matchingStatus = validOrderStatuses.find(
      (status) => status.toLowerCase() === s.toLowerCase(),
    );

    if (matchingStatus) {
      orConditions.push({ status: { equals: matchingStatus } });
    }

    // For searching in cartItems, we'll need to do it post-query
    // First, get all orders for this customer
    const allOrders = await prisma.order.findMany({
      where: { customerId: id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
      orderBy: prismaQuery.orderBy,
    });

    // Filter orders that match the search term
    const filteredOrders = allOrders.filter((order) => {
      // Check string fields
      const stringFieldsMatch =
        order.id.toLowerCase().includes(s.toLowerCase()) ||
        order.method.toLowerCase().includes(s.toLowerCase()) ||
        order.address.toLowerCase().includes(s.toLowerCase()) ||
        order.email.toLowerCase().includes(s.toLowerCase()) ||
        (matchingStatus && order.status === matchingStatus);

      // Check if search term matches any product name in cartItems
      const cartItemsMatch =
        Array.isArray(order.cartItems) &&
        order.cartItems.some(
          (item: any) =>
            item.name && item.name.toLowerCase().includes(s.toLowerCase()),
        );

      return stringFieldsMatch || cartItemsMatch;
    });

    // Apply pagination manually
    const skip = prismaQuery.skip || 0;
    const take = prismaQuery.take || 10;
    const paginatedOrders = filteredOrders.slice(skip, skip + take);

    // Calculate totals for filtered results
    const totalOrders = filteredOrders.length;
    const totalAmount = filteredOrders.reduce(
      (sum, order) => sum + order.amount,
      0,
    );

    // Calculate pagination meta
    const totalPages = Math.ceil(totalOrders / take);
    const currentPage = Math.floor(skip / take) + 1;

    return {
      meta: {
        total: totalOrders,
        totalPage: totalPages,
        page: currentPage,
        limit: take,
      },
      totalOrders,
      totalAmount,
      data: paginatedOrders,
    };
  }

  // If no search term, use the regular database query
  const orders = await prisma.order.findMany({
    ...prismaQuery,
    where,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
    },
  });

  // Get total count and total amount matching filters
  const [totalOrders, totalAmount] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.aggregate({
      where,
      _sum: {
        amount: true,
      },
    }),
  ]);

  // Get pagination meta using PrismaQueryBuilder helper
  const meta = await queryBuilder.getPaginationMeta({
    count: (args: any) => prisma.order.count({ ...args, where }),
  });

  return {
    meta,
    totalOrders,
    totalAmount: totalAmount._sum.amount ?? 0,
    data: orders,
  };
};

const getMyOrders = async (
  userId: string,
  queryParams: Record<string, unknown>,
) => {
  // Extend query builder with searchable order ID
  const queryBuilder = new PrismaQueryBuilder(queryParams, ['id']);

  // Build full query (where + sort + pagination)
  const prismaQuery = queryBuilder
    .buildWhere()
    .buildSort()
    .buildPagination()
    .getQuery();

  // Inject user-based filter (customerId)
  prismaQuery.where = {
    ...prismaQuery.where,
    customerId: userId,
  };

  // Include customer details
  prismaQuery.include = {
    customer: {
      select: {
        id: true,
        name: true,
        imageUrl: true,
      },
    },
  };

  // Execute main query
  const orders = await prisma.order.findMany(prismaQuery);

  // Get pagination meta
  const meta = await queryBuilder.getPaginationMeta(prisma.order);

  return {
    meta,
    data: orders,
  };
};

const getMyOrder = async (userId: string, orderId: string) => {
  // Step 1: Get the order (with cartItems as JSON)
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
      customerId: userId,
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
    },
  });

  if (!order) return null;

  // Step 2: Extract productIds from cartItems
  const cartItems = order.cartItems as {
    productId: string;
    quantity: number;
  }[];
  const productIds = cartItems.map((item) => item.productId);

  // Step 3: Fetch product details
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
    },
    select: {
      id: true,
      name: true,
      price: true,
      imageUrl: true,
    },
  });

  // Step 4: Combine cartItems with product info
  const detailedCartItems = cartItems.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return {
      ...item,
      product,
    };
  });

  // Step 5: Return enriched order
  return {
    ...order,
    cartItems: detailedCartItems,
  };
};

export const OrderServices = {
  getAllOrders,
  getUserOrders,
  getMyOrders,
  getMyOrder,
};
