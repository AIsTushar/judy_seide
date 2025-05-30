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

  if (req.body.published && typeof req.body.published === 'string') {
    req.body.published = req.body.published === 'true' ? true : false;
  }

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

  console.log(productPayload);

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
  } = req.body;

  let imageUrlsToKeep = [];
  let published = req.body.published;
  if (req.body.imageUrlsToKeep) {
    try {
      imageUrlsToKeep =
        typeof req.body.imageUrlsToKeep === 'string'
          ? JSON.parse(req.body.imageUrlsToKeep)
          : req.body.imageUrlsToKeep;
      if (!Array.isArray(imageUrlsToKeep)) {
        throw new AppError(400, 'imageUrlsToKeep must be an array');
      }
    } catch {
      throw new AppError(400, 'Invalid imageUrlsToKeep format');
    }
  }

  // Upload new images
  let newImageUrls: string[] = [];
  if (req.files && Array.isArray(req.files)) {
    const uploadPromises = (req.files as Express.Multer.File[]).map((file) =>
      uploadToDigitalOceanAWS(file),
    );
    newImageUrls = (await Promise.all(uploadPromises)).map(
      (upload) => upload.location,
    );
  }

  if (req.body.published && typeof req.body.published === 'string') {
    published = req.body.published === 'true' ? true : false;
  }

  const updatePayload = {
    name,
    price: price ? parseFloat(price) : undefined,
    description,
    size,
    quantity: quantity ? parseInt(quantity) : undefined,
    tags: typeof tags === 'string' ? tags.split(',') : tags,
    materialId,
    categoryId,
    imageUrlsToKeep,
    newImageUrls,
    published,
  };

  const result = await ProductServices.updateProduct(id, updatePayload);
  sendResponse(res, {
    statusCode: result ? 200 : 400,
    success: !!result,
    message: result ? 'Product Updated Successfully' : 'Product Update Failed',
    Data: result || [],
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

// Get Trending Products In Home Page
const getTrendingProducts = catchAsync(async (req, res) => {
  const result = await ProductServices.getTrendingProducts();
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok
      ? 'Trending Products Fetched Successfully'
      : 'Trending Products Fetching Failed',
    Data: isok ? result : [],
  });
});

const getNavbarProducts = catchAsync(async (req, res) => {
  const result = await ProductServices.getNavbarProducts();
  const isok = result ? true : false;
  sendResponse(res, {
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok
      ? 'Navbar Products Fetched Successfully'
      : 'Navbar Products Fetching Failed',
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
  getTrendingProducts,
  getNavbarProducts,
};
