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

export const ProductController = { createProduct, getAllProducts };
