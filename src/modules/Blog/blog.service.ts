import { PrismaQueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { prisma } from '../../prisma/client';
import { deleteFromDigitalOceanAWS } from '../../utils/sendImageToCloudinary';
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
    where: { isPublish: true },
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

// --- Admin --- Get All Blogs with ispublished = false and isdeleted = true
const getAllBlogsAdmin = async (queryParams: Record<string, unknown>) => {
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
  const blog = await prisma.blog.findUnique({
    where: { id, isPublish: true },
    include: { user: true },
  });

  if (!blog) return null;

  const relatedBlogs = await prisma.blog.findMany({
    where: {
      userId: blog.userId,
      NOT: { id },
    },
    select: {
      id: true,
      title: true,
      content: true,
      imageUrl: true,
    },
    take: 8,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return {
    blog,
    relatedBlogs,
  };
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
      isPublish: payload.isPublish,
    },
  });
  return result;
};

const deleteBlog = async (id: string) => {
  const blog = await prisma.blog.findUnique({
    where: {
      id,
    },
  });

  if (!blog) throw new AppError(404, 'Blog not found');

  if (blog.imageUrl) {
    await deleteFromDigitalOceanAWS(blog.imageUrl);
  }

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
  getAllBlogsAdmin,
  getBlog,
  updateBlog,
  deleteBlog,
};
