/*
  * Name: Lim Jin Yin
  * Student ID: A0256976H
*/

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import JWT from 'jsonwebtoken';
import app from '../../server';
import userModel from '../../models/userModel';
import orderModel from '../../models/orderModel';
import { hashPassword } from '../../helpers/authHelper';
import { getOrdersController } from '../../controllers/authController';

let mongoServer;

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (userId) => ({ user: { _id: userId } });

const getPayload = (res) =>
  res.json.mock.calls[0]?.[0] ?? res.send.mock.calls[0]?.[0];

const seedUser = async (overrides = {}) => {
  const hashed = await hashPassword('password123');
  const user = await new userModel({
    name: 'Test Buyer',
    email: `buyer-${Date.now()}@test.com`,
    password: hashed,
    phone: '12345678',
    address: 'Test Street',
    answer: 'test-answer',
    ...overrides,
  }).save();

  const token = JWT.sign(
    { _id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { user, token };
};

const seedProduct = async (overrides = {}) => {
  const col = mongoose.connection.collection('products');
  const doc = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test Product',
    description: 'A product used in order tests',
    price: 99,
    ...overrides,
  };
  await col.insertOne(doc);
  return doc;
};

const seedOrder = async (buyerId, productIds, overrides = {}) => {
  return orderModel.create({
    products: productIds,
    payment: { success: true, transactionId: 'txn_001' },
    buyer: buyerId,
    status: 'Not Processed',
    ...overrides,
  });
};


describe('User orders viewing integration tests', () => {

  jest.spyOn(console, 'log').mockImplementation(() => {});

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await orderModel.deleteMany({});
    await userModel.deleteMany({});
    await mongoose.connection.collection('products').deleteMany({});
  });

  describe('orderModel integration with MongoDB', () => {

    it('persists all fields on creation and applies the default status', async () => {
      const { user } = await seedUser();
      const product = await seedProduct();

      const order = await seedOrder(user._id, [product._id]);

      expect(order._id).toBeDefined();
      expect(order.status).toBe('Not Processed'); // default
      expect(order.buyer.toString()).toBe(user._id.toString());
      expect(order.products).toHaveLength(1);
      expect(order.products[0].toString()).toBe(product._id.toString());
    });

    it('persists a payment object with arbitrary fields', async () => {
      const { user } = await seedUser();
      const product = await seedProduct();

      const order = await seedOrder(user._id, [product._id], {
        payment: { success: false, transactionId: 'txn_fail', amount: 0 },
      });

      expect(order.payment.success).toBe(false);
      expect(order.payment.transactionId).toBe('txn_fail');
      expect(order.payment.amount).toBe(0);
    });

    it('rejects a status value that is not in the enum', async () => {
      const { user } = await seedUser();
      const product = await seedProduct();

      await expect(
        orderModel.create({
          products: [product._id],
          payment: { success: true },
          buyer: user._id,
          status: 'InvalidStatus',
        })
      ).rejects.toThrow();
    });

    it('accepts every valid enum status value', async () => {
      const { user } = await seedUser();
      const product = await seedProduct();
      const statuses = ['Not Processed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

      for (const status of statuses) {
        const order = await orderModel.create({
          products: [product._id],
          payment: { success: true },
          buyer: user._id,
          status,
        });
        expect(order.status).toBe(status);
        await orderModel.findByIdAndDelete(order._id);
      }
    });

    it('populates buyer name when queried with .populate("buyer")', async () => {
      const { user } = await seedUser();
      const product = await seedProduct();
      await seedOrder(user._id, [product._id]);

      const [populated] = await orderModel
        .find({ buyer: user._id })
        .populate('buyer', 'name');

      expect(populated.buyer.name).toBe('Test Buyer');
      expect(populated.buyer._id.toString()).toBe(user._id.toString());
    });

    it('populates product fields when queried with .populate("products")', async () => {
      const { user } = await seedUser();
      const product = await seedProduct({ name: 'Fancy Widget', price: 42 });
      await seedOrder(user._id, [product._id]);

      const [populated] = await orderModel
        .find({ buyer: user._id })
        .populate('products', '-photo');

      expect(populated.products[0].name).toBe('Fancy Widget');
      expect(populated.products[0].price).toBe(42);
    });

    it('find({ buyer }) returns only orders belonging to that buyer', async () => {
      const { user: buyerA } = await seedUser({ email: 'a@test.com' });
      const { user: buyerB } = await seedUser({ email: 'b@test.com' });
      const product = await seedProduct();

      await seedOrder(buyerA._id, [product._id]);
      await seedOrder(buyerA._id, [product._id]);
      await seedOrder(buyerB._id, [product._id]);

      const buyerAOrders = await orderModel.find({ buyer: buyerA._id });
      const buyerBOrders = await orderModel.find({ buyer: buyerB._id });

      expect(buyerAOrders).toHaveLength(2);
      expect(buyerBOrders).toHaveLength(1);
    });

    it('returns an empty array when the buyer has no orders', async () => {
      const { user } = await seedUser();

      const orders = await orderModel.find({ buyer: user._id });

      expect(orders).toEqual([]);
    });

    it('stores createdAt and updatedAt timestamps automatically', async () => {
      const { user } = await seedUser();
      const product = await seedProduct();
      const order = await seedOrder(user._id, [product._id]);

      expect(order.createdAt).toBeDefined();
      expect(order.updatedAt).toBeDefined();
      expect(order.createdAt).toBeInstanceOf(Date);
    });

  });

  describe('test integration with controllers', () => {

    it('returns only the orders that belong to the requesting user', async () => {
      const { user: buyerA } = await seedUser({ email: 'a@test.com' });
      const { user: buyerB } = await seedUser({ email: 'b@test.com' });
      const product = await seedProduct();

      await seedOrder(buyerA._id, [product._id]);
      await seedOrder(buyerA._id, [product._id]);
      await seedOrder(buyerB._id, [product._id]);

      const res = makeRes();
      await getOrdersController(makeReq(buyerA._id), res);

      const payload = getPayload(res);
      expect(payload).toHaveLength(2);
      payload.forEach((o) =>
        expect(o.buyer._id.toString()).toBe(buyerA._id.toString())
      );
    });

    it('returns an empty array when the user has no orders', async () => {
      const { user } = await seedUser();
      const res = makeRes();

      await getOrdersController(makeReq(user._id), res);

      const payload = getPayload(res);
      expect(payload).toEqual([]);
    });

    it('returns populated buyer name in each order', async () => {
      const { user } = await seedUser({ name: 'Alice' });
      const product = await seedProduct();
      await seedOrder(user._id, [product._id]);

      const res = makeRes();
      await getOrdersController(makeReq(user._id), res);

      const [order] = getPayload(res);
      expect(typeof order.buyer.name).toBe('string');
      expect(order.buyer.name).toBe('Alice');
    });

    it('returns populated product fields in each order', async () => {
      const { user } = await seedUser();
      const product = await seedProduct({ name: 'Widget', price: 50 });
      await seedOrder(user._id, [product._id]);

      const res = makeRes();
      await getOrdersController(makeReq(user._id), res);

      const [order] = getPayload(res);
      expect(order.products[0].name).toBe('Widget');
      expect(order.products[0].price).toBe(50);
    });

    it('returns the payment object with a success flag in each order', async () => {
      const { user } = await seedUser();
      const product = await seedProduct();
      await seedOrder(user._id, [product._id], { payment: { success: true } });

      const res = makeRes();
      await getOrdersController(makeReq(user._id), res);

      const [order] = getPayload(res);
      expect(order.payment).toHaveProperty('success');
      expect(order.payment.success).toBe(true);
    });

    it('returns the status field in each order', async () => {
      const { user } = await seedUser();
      const product = await seedProduct();
      await seedOrder(user._id, [product._id], { status: 'Shipped' });

      const res = makeRes();
      await getOrdersController(makeReq(user._id), res);

      const [order] = getPayload(res);
      expect(order.status).toBe('Shipped');
    });

    it('returns multiple products within a single order', async () => {
      const { user } = await seedUser();
      const p1 = await seedProduct({ name: 'Product A' });
      const p2 = await seedProduct({ name: 'Product B' });
      const p3 = await seedProduct({ name: 'Product C' });
      await seedOrder(user._id, [p1._id, p2._id, p3._id]);

      const res = makeRes();
      await getOrdersController(makeReq(user._id), res);

      const [order] = getPayload(res);
      expect(order.products).toHaveLength(3);
    });

  });

  describe('test integration with orders API', () => {

    it('returns 401 when the Authorization header is absent', async () => {
      const res = await request(app).get('/api/v1/auth/orders');

      expect(res.status).toBe(401);
    });

    it('returns 401 when the token has expired', async () => {
      const { user } = await seedUser();
      const expiredToken = JWT.sign(
        { _id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1ms' }
      );
      await new Promise((r) => setTimeout(r, 10));

      const res = await request(app)
        .get('/api/v1/auth/orders')
        .set('Authorization', expiredToken);

      expect(res.status).toBe(401);
    });

    it('returns 401 when the token signature is tampered', async () => {
      const { token } = await seedUser();

      const res = await request(app)
        .get('/api/v1/auth/orders')
        .set('Authorization', token + 'tampered');

      expect(res.status).toBe(401);
    });

    it('returns 200 and an empty array when the user has no orders', async () => {
      const { token } = await seedUser();

      const res = await request(app)
        .get('/api/v1/auth/orders')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns 200 and only the authenticated user\'s orders', async () => {
      const { user, token } = await seedUser({ email: 'owner@test.com' });
      const { user: other } = await seedUser({ email: 'other@test.com' });
      const product = await seedProduct();

      await seedOrder(user._id, [product._id]);
      await seedOrder(user._id, [product._id]);
      await seedOrder(other._id, [product._id]);

      const res = await request(app)
        .get('/api/v1/auth/orders')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('returns the fields required for each order', async () => {
      const { user, token } = await seedUser({ name: 'Alice' });
      const product = await seedProduct({ name: 'Widget', description: 'A widget', price: 10 });
      await seedOrder(user._id, [product._id], {
        payment: { success: true },
        status: 'Processing',
      });

      const res = await request(app)
        .get('/api/v1/auth/orders')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      const [order] = res.body;

      expect(order).toHaveProperty('status', 'Processing');
      expect(order.buyer.name).toBe('Alice');           // o?.buyer?.name
      expect(order.payment.success).toBe(true);         // o?.payment.success
      expect(order).toHaveProperty('createdAt');        // moment(o?.createdAt).fromNow()
      expect(order.products[0].name).toBe('Widget');    // p.name
      expect(order.products[0].price).toBe(10);         // p.price
      expect(order.products).toHaveLength(1);           // o?.products?.length
    });

  });

});