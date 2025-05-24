import AppError from '../../errors/AppError';
import catchAsync from '../../utils/catchAsync';
import { uploadToDigitalOceanAWS } from '../../utils/sendImageToCloudinary';
import sendResponse from '../../utils/sendResponse';
import { ProductServices } from './product.service';

const createProduct = catchAsync(async (req, res) => {
  const { categoryId, materialId } = req.body;

  if (!categoryId) {
    throw new Error('Category is required');
  }

  if (!materialId) {
    throw new Error('Material is required');
  }

  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    throw new Error('At least one image is required');
  }

  const uploadPromises = (req.files as Express.Multer.File[]).map((file) =>
    uploadToDigitalOceanAWS(file),
  );

  const uploadResults = await Promise.all(uploadPromises);
  const imageUrls = uploadResults.map((upload) => upload.location);

  const productPayload = {
    ...req.body,
    imageUrl: imageUrls,
    price: parseFloat(req.body.price), // ensure proper typing
    quantity: parseInt(req.body.quantity, 10),
    tags:
      typeof req.body.tags === 'string'
        ? req.body.tags.split(',')
        : req.body.tags,
  };

  const createdProduct = await ProductServices.createProduct(productPayload);

  sendResponse(res, {
    statusCode: createdProduct ? 201 : 400,
    success: !!createdProduct,
    message: createdProduct
      ? 'Product created successfully'
      : 'Product creation failed',
    Data: createdProduct || null,
  });
});

const getAllProducts = catchAsync(async (req, res) => {
  const result = await ProductServices.getAllProducts(req.query);
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok
      ? 'Products Fetched Successfully'
      : 'Products Fetching Failed',
    Data: isok ? result : [],
  });
});

const getAllProductsAdmin = catchAsync(async (req, res) => {
  const result = await ProductServices.getAllProductsAdmin(req.query);
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok
      ? 'Products Fetched Successfully'
      : 'Products Fetching Failed',
    Data: isok ? result : [],
  });
});

const getProduct = catchAsync(async (req, res) => {
  const result = await ProductServices.getProduct(req.params.id);
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok
      ? 'Product Fetched Successfully'
      : 'Product Fetching Failed, No Product Found With This ID',
    Data: isok ? result : [],
  });
});

const updateProduct = catchAsync(async (req, res) => {
  const id = req.params.id;
  const {
    name,
    price,
    description,
    size,
    quantity,
    tags,
    materialId,
    categoryId,
    published,
  } = req.body;

  let imageUrlsToKeep = [];
  if (req.body.imageUrlsToKeep && req.body.imageUrlsToKeep.length != 0) {
    try {
      imageUrlsToKeep = JSON.parse(req.body.imageUrlsToKeep);
    } catch {
      throw new AppError(400, 'Invalid imagesToKeep format');
    }
  }

  // Upload new images
  let newImageUrls: string[] = [];
  if (req.files && Array.isArray(req.files)) {
    const uploadPromises = (req.files as Express.Multer.File[]).map((file) =>
      uploadToDigitalOceanAWS(file),
    );
    const uploadResults = await Promise.all(uploadPromises);
    newImageUrls = uploadResults.map((upload) => upload.location);
  }

  const updatePayload = {
    name,
    price: parseFloat(price),
    description,
    size,
    quantity: parseInt(quantity),
    tags: typeof tags === 'string' ? tags.split(',') : tags,
    materialId,
    categoryId,
    imageUrlsToKeep,
    newImageUrls,
    published,
  };

  const result = await ProductServices.updateProduct(id, updatePayload);
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok ? 'Product Updated Successfully' : 'Product Updation Failed',
    Data: isok ? result : [],
  });
});

const deleteProduct = catchAsync(async (req, res) => {
  const result = await ProductServices.deleteProduct(req.params.id);
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok ? 'Product Deleted Successfully' : 'Product Deletion Failed',
    Data: isok ? result : [],
  });
});

export const ProductController = {
  createProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
};
