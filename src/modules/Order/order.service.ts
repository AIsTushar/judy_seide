import { PrismaQueryBuilder } from '../../builder/QueryBuilder';
import { prisma } from '../../prisma/client';

const getAllOrders = async (queryParams: Record<string, unknown>) => {
  const { searchTerm, status, ...rest } = queryParams;

  const queryBuilder = new PrismaQueryBuilder(rest, ['title', 'content']); // Leave builder as-is

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
  const { searchTerm, ...rest } = queryParams;

  const queryBuilder = new PrismaQueryBuilder(rest);
  const prismaQuery = queryBuilder
    .buildSort()
    .buildPagination()
    .buildSelect()
    .getQuery();

  // Construct dynamic where condition
  const where: any = {
    customerId: id,
  };

  // Manual filtering for product name inside cartItems
  if (searchTerm) {
    where.cartItems = {
      array_contains: [
        { name: { contains: String(searchTerm), mode: 'insensitive' } },
      ],
    };
  }

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

  // Get total count & total amount
  const [totalOrders, totalAmount] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.aggregate({
      where,
      _sum: {
        amount: true,
      },
    }),
  ]);

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

export const OrderServices = { getAllOrders, getUserOrders };
