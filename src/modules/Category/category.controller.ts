import AppError from '../../errors/AppError';
import catchAsync from '../../utils/catchAsync';
import {
  deleteFromDigitalOceanAWS,
  uploadToDigitalOceanAWS,
} from '../../utils/sendImageToCloudinary';
import sendResponse from '../../utils/sendResponse';
import { ICategory } from './category.interface';
import { CategoryServices } from './category.service';

const createCategory = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError(400, 'At least one image is required');
  }

  let imageUrl = '';
  if (req.file) {
    const uploadResult = await uploadToDigitalOceanAWS(req.file);
    imageUrl = uploadResult.location;
  }

  const categoryData: ICategory = {
    ...req.body,
    imageUrl,
  };
  const result = await CategoryServices.createCategory(categoryData);

  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok
      ? 'Category Created Successfully'
      : 'Category Creation Failed',
    Data: isok ? result : [],
  });
});

const getAllCategories = catchAsync(async (req, res) => {
  const result = await CategoryServices.getAllCategories(req.query);
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok
      ? 'Categories Fetched Successfully'
      : 'Categories Fetching Failed',
    Data: isok ? result : [],
  });
});

const getAllCategoriesAdmin = catchAsync(async (req, res) => {
  const result = await CategoryServices.getAllCategoriesAdmin(req.query);
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok
      ? 'Categories Fetched Successfully'
      : 'Categories Fetching Failed',
    Data: isok ? result : [],
  });
});

const getCategory = catchAsync(async (req, res) => {
  const result = await CategoryServices.getCategory(req.params.id);
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok
      ? 'Category Fetched Successfully'
      : 'Category Fetching Failed',
    Data: isok ? result : [],
  });
});

const updateCategory = catchAsync(async (req, res) => {
  const category = await CategoryServices.getCategory(req.params.id);
  if (!category) {
    throw new AppError(400, 'Category not found');
  }
  let updatedData = { ...req.body };

  // Handle image update
  if (req.file) {
    if (category.imageUrl) {
      await deleteFromDigitalOceanAWS(category.imageUrl);
    }

    const uploadResult = await uploadToDigitalOceanAWS(req.file);
    updatedData.imageUrl = uploadResult.location;
  }

  const result = await CategoryServices.updateCategory(
    req.params.id,
    updatedData,
  );
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok
      ? 'Category Updated Successfully'
      : 'Category Updation Failed',
    Data: isok ? result : [],
  });
});

const deleteCategory = catchAsync(async (req, res) => {
  const result = await CategoryServices.deleteCategory(req.params.id);
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok
      ? 'Category Deleted Successfully'
      : 'Category Deletion Failed',
    Data: isok ? result : [],
  });
});

export const CategoryController = {
  createCategory,
  getAllCategories,
  getAllCategoriesAdmin,
  getCategory,
  updateCategory,
  deleteCategory,
};
