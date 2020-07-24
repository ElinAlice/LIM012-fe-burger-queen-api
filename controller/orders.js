const OrdersService = require('../services/ordersService');
const UsersService = require('../services/usersService');
const ProductsService = require('../services/productsService');
const { pagination } = require('./utils/pagination');

const ordersService = new OrdersService();
const usersService = new UsersService();
const productsService = new ProductsService();

// const productDetails = async (products, next) => {
//   const orderedProducts = [];
//   for (let i = 0; i < products; i += 1) {
//     const { productId } = products[i];
//     // eslint-disable-next-line no-await-in-loop
//     const objectProduct = await productsService.getProduct({ productId });
//     if (objectProduct === null) {
//       return next;
//     }
//     orderedProducts.push(objectProduct);
//   }

//   const productsAndQuantity = orderedProducts.map((product) => {
//     const productFilter = products
//       .filter((element) => element.productId === product._id.toString());
//     return {
//       product,
//       qty: productFilter[0].qty,
//     };
//   });

//   return productsAndQuantity;
// };

module.exports = {
  getOrders: async (req, resp, next) => {
    const { tags } = req.query;
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (limit * page) - limit;

    try {
      const orders = await ordersService.getOrdersPag({ tags }, skip, limit);
      const ordersTotal = await ordersService.getOrders({ tags });
      pagination('orders', page, limit, ordersTotal.length);
      const allOrders = [];

      for (let i = 0; i < orders.length; i += 1) {
        const productsArray = orders[i].products;
        const orderedProducts = [];
        for (let j = 0; j < productsArray.length; j += 1) {
          const { productId } = productsArray[j];
          // eslint-disable-next-line no-await-in-loop
          const objectProduct = await productsService.getProduct({ productId });
          if (objectProduct === null) {
            return next(400);
          }
          orderedProducts.push(objectProduct);
        }

        const productsAndQuantity = orderedProducts.map((product) => {
          const productFilter = productsArray
            .filter((element) => element.productId === product._id.toString());
          return {
            product,
            qty: productFilter[0].qty,
          };
        });

        const detailsOrder = {
          _id: orders[i]._id.toString(),
          userId: orders[i].userId,
          client: orders[i].client,
          products: productsAndQuantity,
          status: orders[i].status,
          dateEntry: orders[i].dateEntry,
          dateProcessed: orders[i].dateProcessed,
        };

        allOrders.push(detailsOrder);
      }

      resp.status(200).json(allOrders);
    } catch (error) {
      next(error);
    }
  },

  getOrder: async (req, resp, next) => {
    const { orderId } = req.params;

    try {
      const order = await ordersService.getOrder({ orderId });
      if (order === null) {
        next(404);
      }

      const productsArray = order.products;
      const orderedProducts = [];

      for (let i = 0; i < productsArray.length; i += 1) {
        const { productId } = productsArray[i];
        // eslint-disable-next-line no-await-in-loop
        const objectProduct = await productsService.getProduct({ productId });

        orderedProducts.push(objectProduct);
      }

      const productsAndQuantity = orderedProducts.map((product) => {
        const productFilter = productsArray
          .filter((element) => element.productId === product._id.toString());
        return {
          product,
          qty: productFilter[0].qty,
        };
      });

      resp.status(200).json({
        _id: order._id.toString(),
        userId: order.userId,
        client: order.client,
        products: productsAndQuantity,
        status: order.status,
        dateEntry: order.dateEntry,
        dateProcessed: order.dateProcessed,
      });
    } catch (error) {
      next(error);
    }
  },

  postOrder: async (req, resp, next) => {
    const { body: order } = req;
    const { userId } = order;
    const productsArray = order.products;
    const orderedProducts = [];

    try {
      const objectUserId = await usersService.getUser({ userId });

      if (!objectUserId || objectUserId === null || productsArray.length <= 0 || !order.client) {
        return next(400);
      }

      for (let i = 0; i < productsArray.length; i += 1) {
        const { productId } = productsArray[i];
        // eslint-disable-next-line no-await-in-loop
        const objectProduct = await productsService.getProduct({ productId });
        if (objectProduct === null) {
          return next(400);
        }
        orderedProducts.push(objectProduct);
      }

      order.status = 'pending';
      order.dateEntry = new Date();
      order.dateProcessed = '';
      const orderId = await ordersService.createOrder({ order });
      const createOrderObject = await ordersService.getOrder({ orderId });

      const productsAndQuantity = orderedProducts.map((product) => {
        const productFilter = createOrderObject.products
          .filter((element) => element.productId === product._id.toString());

        return {
          product,
          qty: productFilter[0].qty,
        };
      });

      resp.status(200).json({
        _id: orderId.toString(),
        userId: createOrderObject.userId,
        client: createOrderObject.client,
        products: productsAndQuantity,
        status: createOrderObject.status,
        dateEntry: createOrderObject.dateEntry,
        dateProcessed: createOrderObject.dateProcessed,
        message: 'order created',
      });
    } catch (error) {
      next(error);
    }
  },

  putOrder: async (req, resp, next) => {
    const { orderId } = req.params;
    const { body: order } = req;
    const { userId } = order;
    const productsArray = order.products;
    const orderedProducts = [];
    const orderStatus = order.status;

    try {
      const objectUser = await usersService.getUser({ userId });
      if (!objectUser || objectUser === null || productsArray.length <= 0) {
        return next(400);
      }

      if (orderStatus !== 'pending' && orderStatus !== 'canceled'
          && orderStatus !== 'delivering' && orderStatus !== 'delivered' && orderStatus !== 'preparing') {
        return next(400);
      }

      for (let i = 0; i < productsArray.length; i += 1) {
        const { productId } = productsArray[i];
        // eslint-disable-next-line no-await-in-loop
        const objectProduct = await productsService.getProduct({ productId });
        if (objectProduct === null) {
          return next(400);
        }
        orderedProducts.push(objectProduct);
      }

      const validateOrderId = await ordersService.getOrder({ orderId });
      if (validateOrderId === null) {
        return next(404);
      }

      order.dateProcessed = new Date();
      await ordersService.updateOrder({ orderId, order });
      const objectUpdateOrder = await ordersService.getOrder({ orderId });

      const productsAndQuantity = orderedProducts.map((product) => {
        const productFilter = objectUpdateOrder.products
          .filter((element) => element.productId === product._id.toString());

        return {
          product,
          qty: productFilter[0].qty,
        };
      });

      resp.status(200).json({
        _id: objectUpdateOrder._id.toString(),
        userId: objectUpdateOrder.userId,
        client: objectUpdateOrder.client,
        products: productsAndQuantity,
        status: objectUpdateOrder.status,
        dateEntry: objectUpdateOrder.dateEntry,
        dateProcessed: objectUpdateOrder.dateProcessed,
        message: 'order update',
      });
    } catch (error) {
      next(error);
    }
  },

  deleteOrder: async (req, resp, next) => {
    const { orderId } = req.params;

    try {
      const orderObject = await ordersService.getOrder({ orderId });
      if (orderObject === null) {
        return next(404);
      }

      const productsArray = orderObject.products;

      // const productDetailsAndQuantity = await productDetails(productsArray, next(400));
      // console.log(productDetailsAndQuantity);
      const orderedProducts = [];

      for (let i = 0; i < productsArray.length; i += 1) {
        const { productId } = productsArray[i];
        // eslint-disable-next-line no-await-in-loop
        const objectProduct = await productsService.getProduct({ productId });
        orderedProducts.push(objectProduct);
      }

      const productsAndQuantity = orderedProducts.map((product) => {
        const productFilter = productsArray
          .filter((element) => element.productId === product._id.toString());
        return {
          product,
          qty: productFilter[0].qty,
        };
      });

      await ordersService.deleteOrder({ orderId });

      resp.status(200).json({
        _id: orderObject._id.toString(),
        userId: orderObject.userId,
        client: orderObject.client,
        products: productsAndQuantity,
        status: orderObject.status,
        dateEntry: orderObject.dateEntry,
        dateProcessed: orderObject.dateProcessed,
        message: 'order delete',
      });
    } catch (error) {
      next(error);
    }
  },
};
