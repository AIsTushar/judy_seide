import AppError from '../../errors/AppError';
import { prisma } from '../../prisma/client';
import catchAsync from '../../utils/catchAsync';
import {
  deleteFromDigitalOceanAWS,
  uploadToDigitalOceanAWS,
} from '../../utils/sendImageToCloudinary';
import sendResponse from '../../utils/sendResponse';
import { IBlog } from './blog.interface';
import { BlogServices } from './blog.service';

const createBlog = catchAsync(async (req, res) => {
  const user = req.user;
  let imageUrl = '';
  if (!req.file) {
    throw new AppError(400, 'At least one image is required');
  }
  if (req.file) {
    const uploadResult = await uploadToDigitalOceanAWS(req.file);
    imageUrl = uploadResult.location;
  }

  const blogData: IBlog = {
    ...req.body,
    userId: user.id,
    imageUrl,
  };

  const result = await BlogServices.createBlog(blogData);
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok ? 'Blog Created Successfully' : 'Blog Creation Failed',
    Data: isok ? result : [],
  });
});

const getAllBlogs = catchAsync(async (req, res) => {
  const result = await BlogServices.getAllBlogs(req.query);
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok ? 'Blogs Fetched Successfully' : 'Blogs Fetching Failed',
    Data: isok ? result : [],
  });
});

const getAllBlogsAdmin = catchAsync(async (req, res) => {
  const result = await BlogServices.getAllBlogsAdmin(req.query);
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok ? 'Blogs Fetched Successfully' : 'Blogs Fetching Failed',
    Data: isok ? result : [],
  });
});

const getBlog = catchAsync(async (req, res) => {
  console.log(req.params.id);
  const result = await BlogServices.getBlog(req.params.id);
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok ? 'Blog Fetched Successfully' : 'Blog Fetching Failed',
    Data: isok ? result : [],
  });
});

const updateBlog = catchAsync(async (req, res) => {
  const blogId = req.params.id;

  const existingBlog = await prisma.blog.findUnique({
    where: { id: blogId },
  });

  if (!existingBlog) {
    throw new AppError(404, 'Blog not found');
  }

  let updatedData = { ...req.body };

  // Handle image update
  if (req.file) {
    if (existingBlog?.imageUrl) {
      await deleteFromDigitalOceanAWS(existingBlog?.imageUrl);
    }

    const uploadResult = await uploadToDigitalOceanAWS(req.file);
    updatedData.imageUrl = uploadResult.location;
  }

  const result = await BlogServices.updateBlog(blogId, updatedData);
  const isok = result ? true : false;

  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok ? 'Blog Updated Successfully' : 'Blog Updation Failed',
    Data: isok ? result : [],
  });
});

const deleteBlog = catchAsync(async (req, res) => {
  const result = await BlogServices.deleteBlog(req.params.id);
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok ? 'Blog Deleted Successfully' : 'Blog Deletion Failed',
    Data: isok ? result : [],
  });
});

export const BlogController = {
  createBlog,
  getAllBlogs,
  getAllBlogsAdmin,
  getBlog,
  updateBlog,
  deleteBlog,
};
