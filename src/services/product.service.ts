import { NextFunction, Request, Response } from 'express';
import createHttpError, { InternalServerError } from 'http-errors';

import { AddProductToCartT, AuthenticatedRequestBody, IUser, OrderT, TPaginationResponse } from '@src/interfaces';
import { customResponse, isValidMongooseObjectId } from '@src/utils';

import Product from '@src/models/Product.model';
import User from '@src/models/User.model';

export const getProductsService = async (_req: Request, res: TPaginationResponse) => {
  if (res?.paginatedResults) {
    const { results, next, previous, currentPage, totalDocs, totalPages, lastPage } = res.paginatedResults;
    const responseObject: any = {
      totalDocs: totalDocs || 0,
      totalPages: totalPages || 0,
      lastPage: lastPage || 0,
      count: results?.length || 0,
      currentPage: currentPage || 0,
    };

    if (next) {
      responseObject.nextPage = next;
    }
    if (previous) {
      responseObject.prevPage = previous;
    }

    responseObject.products = results?.map((productDoc: any) => {
      const { user, ...otherProductInfo } = productDoc._doc;
      return {
        ...otherProductInfo,
        request: {
          type: 'Get',
          description: 'Get one product with the id',
          url: `${process.env.API_URL}/api/${process.env.API_VERSION}/products/${productDoc._doc._id}`,
        },
      };
    });

    return res.status(200).send(
      customResponse<typeof responseObject>({
        success: true,
        error: false,
        message: 'Successful Found products',
        status: 200,
        data: responseObject,
      })
    );
  }
};

export const getProductService = async (req: AuthenticatedRequestBody<IUser>, res: Response, next: NextFunction) => {
  if (!isValidMongooseObjectId(req.params.productId) || !req.params.productId) {
    return next(createHttpError(422, `Invalid request`));
  }

  try {
    const product = await Product.findById(req.params.productId);

    if (!product) {
      return next(new createHttpError.BadRequest());
    }

    const { user, ...otherProductInfo } = product._doc;

    const data = {
      product: {
        ...otherProductInfo,
        request: {
          type: 'Get',
          description: 'Get all the product',
          url: `${process.env.API_URL}/api/${process.env.API_VERSION}/products`,
        },
      },
    };

    return res.status(200).send(
      customResponse<typeof data>({
        success: true,
        error: false,
        message: `Successfully found product by ID: ${req.params.productId}`,
        status: 200,
        data,
      })
    );
  } catch (error) {
    return next(InternalServerError);
  }
};

export const addProductToCartService = async (
  req: AuthenticatedRequestBody<AddProductToCartT>,
  res: Response,
  next: NextFunction
) => {
  if (!isValidMongooseObjectId(req.body.productId) || !req.body.productId) {
    return next(createHttpError(422, `Invalid request`));
  }

  try {
    const product = await Product.findById(req.body.productId);

    if (!product) {
      return next(new createHttpError.BadRequest());
    }

    const user = await User.findOne({ email: req.user?.email });

    if (!user) {
      return next(createHttpError(401, `Auth Failed`));
    }

    const doDecrease = req.query.decrease === 'true';
    const updatedUser = await user.addToCart(req.body.productId, doDecrease);

    const data = {
      user: updatedUser,
    };

    return res.status(201).send(
      customResponse<typeof data>({
        success: true,
        error: false,
        message: `Successfully added product to cart: ${req.body.productId}`,
        status: 201,
        data,
      })
    );
  } catch (error) {
    return next(error);
  }
};

export const deleteProductFromCartService = async (
  req: AuthenticatedRequestBody<AddProductToCartT>,
  res: Response,
  next: NextFunction
) => {
  if (!isValidMongooseObjectId(req.body.productId) || !req.body.productId) {
    return next(createHttpError(422, `Invalid request`));
  }

  try {
    const product = await Product.findById(req.body.productId);

    if (!product) {
      return next(new createHttpError.BadRequest());
    }

    const user = await User.findOne({ email: req.user?.email });

    if (!user) {
      return next(createHttpError(401, `Auth Failed`));
    }

    const updatedUser = await user.removeFromCart(req.body.productId);

    const data = {
      user: updatedUser,
    };

    return res.status(200).send(
      customResponse<typeof data>({
        success: true,
        error: false,
        message: `Successfully removed item: ${req.body.productId} from Cart`,
        status: 200,
        data,
      })
    );
  } catch (error) {
    return next(error);
  }
};

export const getCartService = async (req: AuthenticatedRequestBody<IUser>, res: Response, next: NextFunction) => {
  try {
    const userCart = await User.findById(req.user?._id).select('cart').populate('cart.items.productId').exec();

    if (!userCart) {
      const message = `Auth Failed (Invalid Credentials)`;
      return next(createHttpError(401, message));
    }

    const cartItems = userCart.cart.items.map((item: { quantity: number; productId: { _doc: OrderT } }) => {
      return { quantity: item.quantity, product: { ...item.productId._doc } };
    });

    const data = {
      products: cartItems,
      userId: userCart._id,
    };

    return res.status(200).send(
      customResponse<typeof data>({
        success: true,
        error: false,
        message: `Successfully found cart`,
        status: 200,
        data,
      })
    );
  } catch (error) {
    return next(error);
  }
};

export const clearCartService = async (req: AuthenticatedRequestBody<IUser>, res: Response, next: NextFunction) => {
  const user = await User.findOne({ email: new RegExp(`^${req.user?.email}$`, 'i') });

  if (!user) {
    const message = `Auth Failed (Invalid Credentials)`;
    return next(createHttpError(401, message));
  }
  try {
    const updatedUser = await user.clearCart();
    const data = {
      user: updatedUser,
    };

    return res.status(200).send(
      customResponse<typeof data>({
        success: true,
        error: false,
        message: `Successfully cleared cart`,
        status: 200,
        data,
      })
    );
  } catch (error) {
    return next(error);
  }
};

export default getProductsService;
