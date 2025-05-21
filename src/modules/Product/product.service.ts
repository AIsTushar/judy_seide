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

const getProduct = async (id: string) => {
  const result = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      material: true,
    },
  });
  return result;
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
  imageUrlsToKeep?: string[]; // List of URLs to retain from existing images
  newImageUrls?: string[]; // List of newly uploaded image URLs
}

export const updateProduct = async (
  id: string,
  payload: UpdateProductPayload,
) => {
  const existingProduct = await prisma.product.findUnique({ where: { id } });
  if (!existingProduct) throw new AppError(404, 'Product not found!');

  const finalImageUrls = [
    ...(payload.imageUrlsToKeep || []),
    ...(payload.newImageUrls || []),
  ];

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
    ...(finalImageUrls.length > 0 && { imageUrl: finalImageUrls }),
  };

  const imagesToDelete = existingProduct.imageUrl.filter(
    (url) => !finalImageUrls.includes(url),
  );
  await Promise.all(
    imagesToDelete.map((url) => deleteFromDigitalOceanAWS(url)),
  );

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: dataToUpdate,
  });

  return updatedProduct;
};

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

export const ProductServices = {
  createProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
