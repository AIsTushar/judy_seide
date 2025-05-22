import catchAsync from '../../utils/catchAsync';
import { OrderServices } from './order.service';

const getAllOrders = catchAsync(async (req, res) => {
  const result = await OrderServices.getAllOrders(req.query);
  const isok = result ? true : false;
  res.status(isok ? 200 : 400).json({
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok ? 'Orders Fetched Successfully' : 'Orders Fetching Failed',
    Data: isok ? result : [],
  });
});

const getUserOrders = catchAsync(async (req, res) => {
  const result = await OrderServices.getUserOrders(req.params.id, req.query);
  const isok = result ? true : false;
  res.status(isok ? 200 : 400).json({
    statusCode: isok ? 200 : 400,
    success: isok ? true : false,
    message: isok ? 'Orders Fetched Successfully' : 'Orders Fetching Failed',
    Data: isok ? result : [],
  });
});

export const OrderController = { getAllOrders, getUserOrders };
