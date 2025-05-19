import { PrismaQueryBuilder } from '../../builder/QueryBuilder';
import { prisma } from '../../prisma/client';
import { IBlog } from './blog.interface';

const createBlog = async (payload: IBlog) => {
  const result = await prisma.blog.create({
    data: {
      userId: payload.userId,
      title: payload.title,
      content: payload.content,
      imageUrl: payload.imageUrl,
      others: payload.others,
    },
  });

  return result;
};

const getAllBlogs = async (queryParams: Record<string, unknown>) => {
  const queryBuilder = new PrismaQueryBuilder(queryParams, [
    'title',
    'content',
  ]);
  const prismaQuery = queryBuilder
    .buildWhere()
    .buildSort()
    .buildPagination()
    .buildSelect()
    .getQuery();

  const blogs = await prisma.blog.findMany({
    ...prismaQuery,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
    },
  });

  const meta = await queryBuilder.getPaginationMeta(prisma.blog);

  return {
    meta,
    data: blogs,
  };
};

const getBlog = async (id: string) => {
  const result = await prisma.blog.findUnique({
    where: {
      id,
    },
  });
  return result;
};

const updateBlog = async (id: string, payload: IBlog) => {
  const result = await prisma.blog.update({
    where: {
      id,
    },
    data: {
      title: payload.title,
      content: payload.content,
      imageUrl: payload.imageUrl,
      others: payload.others,
    },
  });
  return result;
};

const deleteBlog = async (id: string) => {
  const result = await prisma.blog.delete({
    where: {
      id,
    },
  });
  return result;
};

export const BlogServices = {
  createBlog,
  getAllBlogs,
  getBlog,
  updateBlog,
  deleteBlog,
};
