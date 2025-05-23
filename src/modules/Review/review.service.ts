import { prisma } from '../../prisma/client';
import { IReview } from './review.interface';

const createReview = async (id: string, payload: IReview) => {
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
