import { subDays } from 'date-fns';
import { PrismaQueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { prisma } from '../../prisma/client';
import { deleteFromDigitalOceanAWS } from '../../utils/sendImageToCloudinary';
import { IProduct } from './product.interface';

const createProduct = async (payload: IProduct) => {
  const result = await prisma.product.create({
    data: {
      name: payload.name,
      price: payload.price,
      description: payload.description,
      imageUrl: payload.imageUrl,
      size: payload.size,
      quantity: payload.quantity,
      tags: payload.tags,
      materialId: payload.materialId,
      categoryId: payload.categoryId,
    },
  });

  return result;
};

const getAllProducts = async (queryParams: Record<string, unknown>) => {
  const transformedParams: Record<string, unknown> = {};

  // ✅ Always show only published products
  transformedParams.published = true;

  // --- Availability filter ---
  if (queryParams.availability === 'in stock') {
    transformedParams.quantity = { gt: 0 };
  } else if (queryParams.availability === 'out of stock') {
    transformedParams.quantity = 0;
  }

  // --- Price Range filter ---
  switch (queryParams.priceRange) {
    case 'under150':
      transformedParams.price = { lte: 150 };
      break;
    case '150-300':
      transformedParams.price = { gte: 150, lte: 300 };
      break;
    case '300-500':
      transformedParams.price = { gte: 300, lte: 500 };
      break;
    case 'above500':
      transformedParams.price = { gt: 500 };
      break;
  }

  // --- Category Filter ---
  if (queryParams.categories) {
    const categoryValues = String(queryParams.categories).split(',');
    transformedParams.categoryId = { in: categoryValues };
  }

  // --- Material Filter ---
  if (queryParams.materials) {
    const materialValues = String(queryParams.materials).split(',');
    transformedParams.materialId = { in: materialValues };
  }

  // --- Size Filter ---
  if (queryParams.sizes) {
    const sizeValues = String(queryParams.sizes).split(',');
    transformedParams.size = { in: sizeValues };
  }

  // --- Search by name ---
  const searchTerm = queryParams.search
    ? String(queryParams.search).trim()
    : undefined;

  // --- Build Prisma query ---
  const builder = new PrismaQueryBuilder(transformedParams, ['name']);
  const prismaQuery = builder.buildWhere().buildPagination().getQuery();

  // --- Sorting ---
  if (queryParams.sortPrice === 'low-to-high') {
    prismaQuery.orderBy = [{ price: 'asc' }];
  } else if (queryParams.sortPrice === 'high-to-low') {
    prismaQuery.orderBy = [{ price: 'desc' }];
  } else {
    // Default sort
    prismaQuery.orderBy = [{ createdAt: 'desc' }];
  }

  // --- Add search manually ---
  if (searchTerm) {
    prismaQuery.where = {
      ...prismaQuery.where,
      OR: [
        {
          name: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      ],
    };
  }

  // --- Include relations ---
  prismaQuery.include = {
    category: true,
    material: true,
  };

  // --- Execute query ---
  const data = await prisma.product.findMany(prismaQuery);
  const meta = await builder.getPaginationMeta(prisma.product);

  return {
    meta,
    data,
  };
};

const getAllProductsAdmin = async (queryParams: Record<string, unknown>) => {
  const transformedParams: Record<string, unknown> = {};

  // --- Availability filter ---
  if (queryParams.availability === 'in stock') {
    transformedParams.quantity = { gt: 0 };
  } else if (queryParams.availability === 'out of stock') {
    transformedParams.quantity = 0;
  }

  // --- Price Range filter ---
  switch (queryParams.priceRange) {
    case 'under150':
      transformedParams.price = { lte: 150 };
      break;
    case '150-300':
      transformedParams.price = { gte: 150, lte: 300 };
      break;
    case '300-500':
      transformedParams.price = { gte: 300, lte: 500 };
      break;
    case 'above500':
      transformedParams.price = { gt: 500 };
      break;
  }

  // --- Category Filter ---
  if (queryParams.categories) {
    const categoryValues = String(queryParams.categories).split(',');
    transformedParams.categoryId = { in: categoryValues };
  }

  // --- Material Filter ---
  if (queryParams.materials) {
    const materialValues = String(queryParams.materials).split(',');
    transformedParams.materialId = { in: materialValues };
  }

  // --- Size Filter ---
  if (queryParams.sizes) {
    const sizeValues = String(queryParams.sizes).split(',');
    transformedParams.size = { in: sizeValues };
  }

  // --- Search by name ---
  const searchTerm = queryParams.search
    ? String(queryParams.search).trim()
    : undefined;

  // --- Build Prisma query ---
  const builder = new PrismaQueryBuilder(transformedParams, ['name']);
  const prismaQuery = builder.buildWhere().buildPagination().getQuery();

  // --- Sorting ---
  if (queryParams.sortPrice === 'low-to-high') {
    prismaQuery.orderBy = [{ price: 'asc' }];
  } else if (queryParams.sortPrice === 'high-to-low') {
    prismaQuery.orderBy = [{ price: 'desc' }];
  } else {
    // Default sort
    prismaQuery.orderBy = [{ createdAt: 'desc' }];
  }

  // --- Add search manually ---
  if (searchTerm) {
    prismaQuery.where = {
      ...prismaQuery.where,
      OR: [
        {
          name: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      ],
    };
  }

  // --- Include relations ---
  prismaQuery.include = {
    category: true,
    material: true,
  };

  // --- Execute query ---
  const data = await prisma.product.findMany(prismaQuery);
  const meta = await builder.getPaginationMeta(prisma.product);

  return {
    meta,
    data,
  };
};

// Get Product By ID
const getProduct = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      material: true,
    },
  });

  if (!product) return null;

  // Get other products from the same category
  const relatedProducts = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: id },
      published: true,
    },
    take: 6,
    orderBy: { createdAt: 'desc' },
  });

  // Get good reviews (rating >= 4)
  const goodReviews = await prisma.review.findMany({
    where: {
      productId: id,
      rating: { gte: 4 },
    },
    include: {
      user: {
        select: {
          name: true,
          imageUrl: true,
        },
      },
    },
    take: 6,
    orderBy: { createdAt: 'desc' },
  });

  return {
    ...product,
    relatedProducts,
    goodReviews,
  };
};

interface UpdateProductPayload {
  name?: string;
  price?: number;
  description?: string;
  size?: string;
  quantity?: number;
  tags?: string[];
  materialId?: string;
  categoryId?: string;
  published?: boolean;
  imageUrlsToKeep?: string[];
  newImageUrls?: string[];
}

// Update Product
export const updateProduct = async (
  id: string,
  payload: UpdateProductPayload,
) => {
  const existingProduct = await prisma.product.findUnique({ where: { id } });
  if (!existingProduct) throw new AppError(404, 'Product not found!');

  // Initialize finalImageUrls with existing images by default
  let finalImageUrls = existingProduct.imageUrl || [];

  // Only update images if imageUrlsToKeep or newImageUrls are provided
  const hasImageUpdate =
    (payload.imageUrlsToKeep && payload.imageUrlsToKeep.length > 0) ||
    (payload.newImageUrls && payload.newImageUrls.length > 0);

  if (hasImageUpdate) {
    finalImageUrls = [
      ...(payload.imageUrlsToKeep || []),
      ...(payload.newImageUrls || []),
    ];

    // Identify images to delete
    const imagesToDelete = existingProduct.imageUrl.filter(
      (url) => !finalImageUrls.includes(url),
    );

    // Delete images from DigitalOcean
    await Promise.all(
      imagesToDelete.map((url) => deleteFromDigitalOceanAWS(url)),
    );
  }

  const dataToUpdate: any = {
    ...(payload.name && { name: payload.name }),
    ...(typeof payload.price === 'number' &&
      !isNaN(payload.price) && { price: payload.price }),
    ...(payload.description && { description: payload.description }),
    ...(payload.size && { size: payload.size }),
    ...(typeof payload.quantity === 'number' &&
      !isNaN(payload.quantity) && { quantity: payload.quantity }),
    ...(payload.tags && Array.isArray(payload.tags) && { tags: payload.tags }),
    ...(payload.materialId && { materialId: payload.materialId }),
    ...(payload.categoryId && { categoryId: payload.categoryId }),
    ...(typeof payload.published === 'boolean' && {
      published: payload.published,
    }),
    // Only update imageUrl if there’s an image-related update
    ...(hasImageUpdate &&
      finalImageUrls.length > 0 && {
        imageUrl: finalImageUrls,
      }),
  };

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: dataToUpdate,
  });

  return updatedProduct;
};

// Delete Product
const deleteProduct = async (id: string) => {
  const existingProduct = await prisma.product.findUnique({ where: { id } });
  if (!existingProduct) throw new AppError(404, 'Product not found!');

  if (existingProduct.imageUrl) {
    await Promise.all(
      existingProduct.imageUrl.map((url) => deleteFromDigitalOceanAWS(url)),
    );
  }
  const result = await prisma.product.delete({ where: { id } });
  return result;
};

type QueryParams = {
  searchTerm?: string;
  sort?: string;
  limit?: string;
  page?: string;
  fields?: string;
  range?: 'All' | 'New';
  [key: string]: unknown;
};

// Get Trending Products
const getTrendingProducts = async (queryParams: QueryParams) => {
  const isNew = queryParams.range === 'New';
  const thirtyDaysAgo = subDays(new Date(), 30);

  // Step 1: Fetch paid orders, optionally filtered by the last 30 days
  const orders = await prisma.order.findMany({
    where: {
      isPaid: true,
      ...(isNew && { orderTime: { gte: thirtyDaysAgo } }),
    },
    select: { cartItems: true },
  });

  // Step 2: Count product sales
  const salesMap: Record<string, number> = {};
  orders.forEach((order) => {
    const items = order.cartItems as Array<{
      productId: string;
      quantity: number;
    }>;

    items.forEach(({ productId, quantity }) => {
      salesMap[productId] = (salesMap[productId] || 0) + quantity;
    });
  });

  // Step 3: Sort product IDs by sales volume
  const sortedProductIds = Object.entries(salesMap)
    .sort(([, a], [, b]) => b - a)
    .map(([productId]) => productId);

  if (sortedProductIds.length === 0) {
    return {
      meta: {
        total: 0,
        totalPage: 0,
        page: 1,
        limit: Number(queryParams.limit) || 10,
      },
      data: [],
    };
  }

  // Step 4: Build base filters (excluding pagination, sort, and invalid fields)
  const { searchTerm, sort, limit, page, fields, range, ...filters } =
    queryParams;

  let baseWhere: any = {
    id: { in: sortedProductIds },
    published: true,
  };

  // Apply search term filter - try different approaches for MongoDB compatibility
  if (searchTerm) {
    try {
      baseWhere.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { tags: { hasSome: [searchTerm] } }, // For arrays in MongoDB
      ];
    } catch (error) {
      // Fallback for older Prisma versions or different MongoDB setups
      baseWhere.OR = [
        { name: { contains: searchTerm } },
        { description: { contains: searchTerm } },
        { tags: { has: searchTerm } },
      ];
    }
  }

  // Apply additional filters
  if (Object.keys(filters).length) {
    baseWhere = { ...baseWhere, ...filters };
  }

  // Step 5: Get total count for pagination (simplified for MongoDB compatibility)
  let total: number;
  try {
    total = await prisma.product.count({ where: baseWhere });
  } catch (error) {
    // If count fails, get all matching products and count them
    const allProducts = await prisma.product.findMany({
      where: baseWhere,
      select: { id: true },
    });
    total = allProducts.length;
  }

  if (total === 0) {
    return {
      meta: {
        total: 0,
        totalPage: 0,
        page: 1,
        limit: Number(queryParams.limit) || 10,
      },
      data: [],
    };
  }

  // Step 6: Apply pagination
  const pageNum = Number(queryParams.page) || 1;
  const limitNum = Number(queryParams.limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Step 7: Fetch all matching products (we'll handle ordering manually)
  const allMatchingProducts = await prisma.product.findMany({
    where: baseWhere,
    include: {
      category: true,
      material: true,
    },
  });

  // Step 8: Sort products by sales volume (maintain the trending order)
  const productSalesOrder = new Map(
    sortedProductIds.map((id, index) => [id, index]),
  );
  const sortedProducts = allMatchingProducts.sort((a, b) => {
    const orderA = productSalesOrder.get(a.id) ?? Infinity;
    const orderB = productSalesOrder.get(b.id) ?? Infinity;
    return orderA - orderB;
  });

  // Step 9: Apply pagination to sorted results
  const paginatedProducts = sortedProducts.slice(skip, skip + limitNum);

  // Step 10: Group products by category
  const categoryMap: Record<string, { category: any; products: any[] }> = {};
  paginatedProducts.forEach((product) => {
    const categoryId = product.category.id;
    if (!categoryMap[categoryId]) {
      categoryMap[categoryId] = {
        category: product.category,
        products: [],
      };
    }
    categoryMap[categoryId].products.push(product);
  });

  // Step 11: Return grouped results with pagination meta
  const result = Object.values(categoryMap);
  const totalPage = Math.ceil(total / limitNum);
  const meta = {
    total,
    totalPage,
    page: pageNum,
    limit: limitNum,
  };

  return { meta, data: result };
};

export const ProductServices = {
  createProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
  getTrendingProducts,
};
