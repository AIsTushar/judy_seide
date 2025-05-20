import { prisma } from '../../prisma/client';
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
  return true;
};

export const ProductServices = { createProduct, getAllProducts };
