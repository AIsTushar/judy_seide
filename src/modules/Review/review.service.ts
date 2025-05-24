import AppError from '../../errors/AppError';
import { prisma } from '../../prisma/client';
import { IReview } from './review.interface';

const createReview = async (id: string, payload: IReview) => {
  if (!id) throw new AppError(404, 'User not found');

  // 1. Check if product exists
  const isProductExist = await prisma.product.findUnique({
    where: { id: payload.productId },
  });
  if (!isProductExist) throw new AppError(404, 'Product not found');

  // 2. Validate rating
  if (payload.rating > 5 || payload.rating < 0)
    throw new AppError(400, 'Rating must be between 0 and 5');

  // 3. Check if user already reviewed this product
  const existingReview = await prisma.review.findFirst({
    where: {
      productId: payload.productId,
      userId: id,
    },
  });

  if (existingReview) {
    throw new AppError(400, 'You have already reviewed this product');
  }

  const result = await prisma.review.create({
    data: {
      rating: payload.rating,
      title: payload.title,
      comment: payload.comment,
      productId: payload.productId,
      userId: id,
    },
  });
  return result;
};

export const ReviewServices = { createReview };
