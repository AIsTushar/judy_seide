import { subDays, subMonths } from 'date-fns';
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
      published: payload.published,
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

  const data = await prisma.product.findMany(prismaQuery);
  const meta = await builder.getPaginationMeta(prisma.product);

  // Calculate flags
  const now = new Date();
  const isNewArrival = (date: Date) => {
    const daysOld = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return daysOld <= 7;
  };

  // Get top 10 best sellers from filtered dataset (optional: get from full db if needed)
  const topSellers = [...data]
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 5)
    .map((p) => p.id);

  // Annotate
  const annotatedData = data.map((product) => ({
    ...product,
    isBestSeller: topSellers.includes(product.id),
    isNewArrival: isNewArrival(new Date(product.createdAt)),
  }));

  return {
    meta,
    data: annotatedData,
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

// Get Trending Products
const getTrendingProducts = async () => {
  const threeMonthsAgo = subMonths(new Date(), 3);

  // Step 1: Fetch orders in the last 3 months
  const recentOrders = await prisma.order.findMany({
    where: {
      orderTime: {
        gte: threeMonthsAgo,
      },
      isPaid: true,
    },
    select: {
      cartItems: true,
    },
  });

  // Step 2: Aggregate product sales count
  const productSales: Record<string, number> = {};

  for (const order of recentOrders) {
    const cart = order.cartItems as Array<{
      productId: string;
      quantity: number;
    }>;
    for (const item of cart) {
      if (item?.productId) {
        productSales[item.productId] =
          (productSales[item.productId] || 0) + item.quantity;
      }
    }
  }

  // Step 3: Sort productIds by quantity sold
  const sortedProductIds = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1]) // descending order
    .map(([productId]) => productId);

  // Optional: limit top N trending products
  const topProductIds = sortedProductIds.slice(0, 10);

  // Step 4: Get full product details
  const trendingProducts = await prisma.product.findMany({
    where: {
      id: { in: topProductIds },
    },
  });

  // Optional: Return with sales count info
  const trendingWithSales = trendingProducts.map((product) => ({
    ...product,
    totalSold: productSales[product.id] || 0,
  }));

  return trendingWithSales;
};

const getNavbarProducts = async () => {
  const threeMonthsAgo = subMonths(new Date(), 3);

  // Step 1: Fetch paid orders in last 3 months
  const recentOrders = await prisma.order.findMany({
    where: {
      orderTime: { gte: threeMonthsAgo },
      isPaid: true,
    },
    select: {
      cartItems: true,
    },
  });

  // Step 2: Build product sales map
  const productSales: Record<string, number> = {};

  for (const order of recentOrders) {
    const cart = order.cartItems as Array<{
      productId: string;
      quantity: number;
    }>;
    for (const item of cart) {
      if (item?.productId) {
        productSales[item.productId] =
          (productSales[item.productId] || 0) + item.quantity;
      }
    }
  }

  const allProductIds = Object.keys(productSales);

  // Step 3: Fetch product info with category
  const products = await prisma.product.findMany({
    where: {
      id: { in: allProductIds },
      published: true,
    },
    include: {
      category: true,
    },
  });

  // Use proper object array in categoryWise
  const categoryWise: Record<string, { name: string; sold: number }[]> = {};
  const overallList: Array<{ name: string; totalSold: number }> = [];

  for (const product of products) {
    const sold = productSales[product.id] || 0;
    const catName = product.category.name;

    if (!categoryWise[catName]) {
      categoryWise[catName] = [];
    }

    categoryWise[catName].push({ name: product.name, sold });
    overallList.push({ name: product.name, totalSold: sold });
  }

  // Step 4: Fetch all published categories
  const publishedCategories = await prisma.category.findMany({
    where: { published: true },
  });

  const trendingByCategory: Record<string, string[]> = {};

  for (const category of publishedCategories) {
    const catName = category.name;
    const productsInCategory = categoryWise[catName] || [];

    const topNames = productsInCategory
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 3)
      .map((p) => p.name);

    trendingByCategory[catName] = topNames;
  }

  // Step 5: Build overall top products list
  const overallTrending = overallList
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 3)
    .map((p) => p.name);

  return {
    trendingByCategory,
    overallTrending,
  };
};

export const ProductServices = {
  createProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
  getTrendingProducts,
  getNavbarProducts,
};
