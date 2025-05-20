import AppError from '../../errors/AppError';
import { prisma } from '../../prisma/client';
import { ICategory } from './category.interface';
import { PrismaQueryBuilder } from '../../builder/QueryBuilder';
import { deleteFromDigitalOceanAWS } from '../../utils/sendImageToCloudinary';

const createCategory = async (payload: ICategory) => {
  const isExist = await prisma.category.findFirst({
    where: {
      name: payload.name.toUpperCase(),
    },
  });

  if (isExist) {
    throw new AppError(400, 'Category already exists');
  }
  const result = await prisma.category.create({
    data: {
      name: payload.name.toUpperCase(),
      published: payload.published,
      imageUrl: payload.imageUrl,
    },
  });

  return result;
};

const getAllCategories = async (queryParams: Record<string, unknown>) => {
  const queryBuilder = new PrismaQueryBuilder(queryParams, ['name']);
  const prismaQuery = queryBuilder
    .buildWhere()
    .buildSort()
    .buildPagination()
    .buildSelect()
    .getQuery();
  const categories = await prisma.category.findMany({
    ...prismaQuery,
  });

  const meta = await queryBuilder.getPaginationMeta(prisma.category);

  return {
    meta,
    data: categories,
  };
};

const getCategory = async (id: string) => {
  const result = await prisma.category.findUnique({
    where: {
      id,
    },
  });
  return result;
};

const updateCategory = async (id: string, payload: Partial<ICategory>) => {
  const isExist = await prisma.category.findUnique({
    where: {
      id,
    },
  });

  if (!isExist) {
    throw new AppError(400, 'Category not found');
  }

  const imageUrl: string | undefined = payload.imageUrl;

  const result = await prisma.category.update({
    where: {
      id,
    },
    data: {
      name: payload?.name?.toUpperCase(),
      imageUrl: imageUrl,
      published: payload.published,
    },
  });

  return result;
};

const deleteCategory = async (id: string) => {
  const isExist = await prisma.category.findUnique({
    where: {
      id,
    },
  });

  if (!isExist) {
    throw new AppError(400, 'Category not found');
  }

  if (isExist.imageUrl) {
    await deleteFromDigitalOceanAWS(isExist.imageUrl);
  }

  const result = await prisma.category.delete({
    where: {
      id,
    },
  });
  return result;
};

export const CategoryServices = {
  createCategory,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
