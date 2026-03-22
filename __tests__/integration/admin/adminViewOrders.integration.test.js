/*
  * Name: Lim Jin Yin
  * Student ID: A0256976H
*/

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import JWT from 'jsonwebtoken';
import app from '../../../server';
import userModel from '../../../models/userModel';
import orderModel from '../../../models/orderModel';
import { hashPassword } from '../../../helpers/authHelper';
import { getAllOrdersController, orderStatusController } from '../../../controllers/authController';

let mongoServer;

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send   = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (extras = {}) => ({ ...extras });

const getPayload = (res) =>
  res.json.mock.calls[0]?.[0] ?? res.send.mock.calls[0]?.[0];

// Seed a regular user (role: 0)
const seedUser = async (overrides = {}) => {
  const hashed = await hashPassword('password123');
  const user = await new userModel({
    name: 'Test User',
    email: `buyer-${Date.now()}@test.com`,
    password: hashed,
    phone: '12345678',
    address: 'Test Street',
    answer: 'test-answer',
    role: 0,
    ...overrides,
  }).save();

  const token = JWT.sign(
    { _id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { user, token };
};

// Seed an admin user (role: 1)
const seedAdmin = async (overrides = {}) => {
  return seedUser({ 
    role: 1, 
    email: `admin-${Date.now()}-${Math.random()}@test.com`, 
    ...overrides 
  });
};

const seedProduct = async (overrides = {}) => {
  const col = mongoose.connection.collection('products');
  const doc = {
    id: new mongoose.Types.ObjectId(),
    name: 'Test Product',
    description: 'A product for testing',
    price: 9.9,
    ...overrides,
  };
  await col.insertOne(doc);
  return doc;
};

const seedOrder = async (buyerId, productIds, overrides = {}) => {
  return orderModel.create({
    products: productIds,
    payment: { success: true , transactionId: 'txn_001' },
    buyer: buyerId,
    status: 'Not Processed',
    ...overrides,
  });
};

describe('Admin view orders integration tests', () => {

  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

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
    // only test the behaviours new in admin view orders
    // i.e. behaviours not in the user view orders tests

    it('find({}) returns orders belonging to different buyers', async () => {
      const { user: buyerA } = await seedUser({ email: 'a@test.com' });
      const { user: buyerB } = await seedUser({ email: 'b@test.com' });

      const product = await seedProduct();

      await seedOrder(buyerA._id, [product._id]);
      await seedOrder(buyerB._id, [product._id]);

      const orders = await orderModel.find({});

      expect(orders).toHaveLength(2);
      const buyerIds = orders.map((o) => o.buyer.toString());
      expect(buyerIds).toContain(buyerA._id.toString());
      expect(buyerIds).toContain(buyerB._id.toString());
    });

    it('find({}) returns an empty array when no orders exist', async () => {
      const orders = await orderModel.find({});

      expect(orders).toEqual([]);
    });

    it('sort({ createdAt: -1 }) returns orders in descending order of creation', async () => {
      const { user } = await seedUser();
      const product = await seedProduct();

      const order1 = await seedOrder(user._id, [product._id], { 
        createdAt: new Date('2026-01-01') 
      });
      const order2 = await seedOrder(user._id, [product._id], { 
        createdAt: new Date('2026-02-01') 
      });
      const order3 = await seedOrder(user._id, [product._id], { 
        createdAt: new Date('2026-03-01') 
      });
      
      const orders = await orderModel.find({}).sort({ createdAt: -1 });

      expect(orders[0]._id.toString()).toBe(order3._id.toString());
      expect(orders[1]._id.toString()).toBe(order2._id.toString());
      expect(orders[2]._id.toString()).toBe(order1._id.toString());
    });

    it('findByIdAndUpdate with { new: true } returns the updated document', async () => {
      const { user } = await seedUser();
      const product = await seedProduct();
      const order = await seedOrder(user._id, [product._id], { status: 'Not Processed' });

      const updated = await orderModel.findByIdAndUpdate(
        order._id, 
        { status: 'Processed' }, 
        { new: true }
      );

      expect(updated).toBeDefined();
      expect(updated._id.toString()).toBe(order._id.toString());
      expect(updated.status).toBe('Processed');

      const inDb = await orderModel.findById(order._id);
      expect(inDb.status).toBe('Processed');
    });

    // invalid status
    it('findByIdAndUpdate fails validation when given an invalid status', async () => {
      const { user } = await seedUser();
      const product = await seedProduct();
      const order = await seedOrder(user._id, [product._id], { status: 'Not Processed' });
      
      await expect(orderModel.findByIdAndUpdate(
        order._id, 
        { status: 'Invalid Status' }, 
        { new: true, runValidators: true }
      )).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('findByIdAndUpdate returns null when the order does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updated = await orderModel.findByIdAndUpdate(
        nonExistentId, 
        { status: 'Processed' }, 
        { new: true }
      );

      expect(updated).toBeNull();
    });

  });

  describe('test integration with orders controllers', () => {

    describe('getAllOrdersController', () => {

      it('returns orders from every buyer', async () => {
        const { user: buyerA } = await seedUser({ email: 'b@test.com' });
        const { user: buyerB } = await seedUser({ email: 'a@test.com' });
        const product = await seedProduct();

        await seedOrder(buyerA._id, [product._id]);
        await seedOrder(buyerB._id, [product._id]);
        await seedOrder(buyerA._id, [product._id]);

        const res = makeRes();
        await getAllOrdersController(makeReq(), res);

        const payload = getPayload(res);
        expect(payload).toHaveLength(3);
      });

      it('returns an empty array when no orders exist', async () => {
        const res = makeRes();
        await getAllOrdersController(makeReq(), res);

        const payload = getPayload(res);
        expect(payload).toEqual([]);
      });

      it('returns orders sorted in descending order of creation', async () => {
        const { user } = await seedUser();
        const product = await seedProduct();

        const order1 = await seedOrder(user._id, [product._id], { 
          createdAt: new Date('2026-01-01') 
        });
        const order2 = await seedOrder(user._id, [product._id], { 
          createdAt: new Date('2026-02-01') 
        });
        const order3 = await seedOrder(user._id, [product._id], { 
          createdAt: new Date('2026-03-01') 
        });

        const res = makeRes();
        await getAllOrdersController(makeReq(), res);

        const payload = getPayload(res);
        expect(payload[0]._id.toString()).toBe(order3._id.toString());
        expect(payload[1]._id.toString()).toBe(order2._id.toString());
        expect(payload[2]._id.toString()).toBe(order1._id.toString());
      });

      it('returns the fields AdminOrders.js renders for each order', async () => {
        const { user } = await seedUser({ name: 'Alice', email: 'alice@test.com' });
        const product = await seedProduct({ name: 'Widget', description: 'A widget', price: 50,
          photo: { data: Buffer.from('fake-photo-data'), contentType: 'image/png' }
         });
        await seedOrder(user._id, [product._id], {
          payment: { success: true },
          status: 'Not Processed',
        });

        const res = makeRes();
        await getAllOrdersController(makeReq(), res);

        const [order] = getPayload(res);
        expect(order.buyer.name).toBe('Alice');
        expect(order.status).toBe('Not Processed');
        expect(order.payment.success).toBe(true);
        expect(order).toHaveProperty('createdAt');
        expect(order.products).toHaveLength(1);
        expect(order.products[0].name).toBe('Widget');
      });

    });

    describe('orderStatusController', () => {
      
      it('updates the order status and returns the updated order', async () => {
        const { user } = await seedUser();
        const product = await seedProduct();
        const order = await seedOrder(user._id, [product._id], { status: 'Not Processed' });

        const res = makeRes();
        await orderStatusController(
          makeReq({ params: { orderId: order._id.toString() }, body: { status: 'Processing' } }),
          res
        );

        const payload = getPayload(res);
        expect(payload.status).toBe('Processing');
        
        const inDb = await orderModel.findById(order._id);
        expect(inDb.status).toBe('Processing');
      });

      it('can update the order status to any of the allowed values', async () => {
        const { user } = await seedUser();
        const product = await seedProduct();
        const order = await seedOrder(user._id, [product._id]);

        const validStatuses = ['Not Processed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

        for (const status of validStatuses) {
          const res = makeRes();
          await orderStatusController(
            makeReq({ params: { orderId: order._id.toString() }, body: { status } }),
            res
          );
          expect(getPayload(res).status).toBe(status);
        }
      });

      it('returns null when the order does not exist', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const res = makeRes();
        
        await orderStatusController(
          makeReq({ params: { orderId: nonExistentId }, body: { status: 'Delivered' } }),
          res
        );

        expect(res.json).toHaveBeenCalledWith(null);
      });

    });

  });

  describe('test integration with middleware API', () => {

    describe('GET /api/v1/auth/all-orders', () => {

      it('returns 401 when the Authorization header is absent', async () => {
        const res = await request(app).get('/api/v1/auth/all-orders');

        expect(res.status).toBe(401);
      });

      it('returns 401 when the token has expired', async () => {
        const { user } = await seedAdmin();
        const expiredToken = JWT.sign(
          { _id: user._id },
          process.env.JWT_SECRET,
          { expiresIn: '1ms' }
        );
        await new Promise((r) => setTimeout(r, 10));

        const res = await request(app)
          .get('/api/v1/auth/all-orders')
          .set('Authorization', expiredToken);

        expect(res.status).toBe(401);
      });

      it('returns 401 when the token signature is tampered', async () => {
        const { token } = await seedAdmin();

        const res = await request(app)
          .get('/api/v1/auth/all-orders')
          .set('Authorization', token + 'tampered');

        expect(res.status).toBe(401);
      });

      // isAdmin rejection

      it('returns 401 when a valid token belongs to a non-admin user', async () => {
        const { token } = await seedUser();

        const res = await request(app)
          .get('/api/v1/auth/users')
          .set('Authorization', token);

        expect(res.status).toBe(401);
      });

      // happy-path end-to-end

      it('returns 200 and an empty array when no orders exist', async () => {
        const { token } = await seedAdmin();

        const res = await request(app)
          .get('/api/v1/auth/all-orders')
          .set('Authorization', token);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
      });

      it('returns 200 and all orders across all buyers', async () => {
        const { token } = await seedAdmin();
        const { user: buyerA } = await seedUser({ email: 'a@test.com' });
        const { user: buyerB } = await seedUser({ email: 'b@test.com' });
        const product = await seedProduct();

        await seedOrder(buyerA._id, [product._id]);
        await seedOrder(buyerA._id, [product._id]);
        await seedOrder(buyerB._id, [product._id]);

        const res = await request(app)
          .get('/api/v1/auth/all-orders')
          .set('Authorization', token);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(3);
      });

      it('returns newest orders first', async () => {
        const { token } = await seedAdmin();
        const { user } = await seedUser();
        const product = await seedProduct();

        const order1 = await seedOrder(user._id, [product._id], { 
          createdAt: new Date('2026-01-01')
        });
        const order2 = await seedOrder(user._id, [product._id], { 
          createdAt: new Date('2026-02-01')
        });
        const order3 = await seedOrder(user._id, [product._id], { 
          createdAt: new Date('2026-03-01')
        });

        const res = await request(app)
          .get('/api/v1/auth/all-orders')
          .set('Authorization', token);

        expect(res.status).toBe(200);
        expect(res.body[0]._id.toString()).toBe(order3._id.toString());
        expect(res.body[1]._id.toString()).toBe(order2._id.toString());
        expect(res.body[2]._id.toString()).toBe(order1._id.toString());
      });

      it('returns the fields AdminOrders.js renders for each order', async () => {
        const { token } = await seedAdmin({ email: 'admin@test.com' });
        const { user } = await seedUser({ name: 'Alice', email: 'alice@test.com', phone: '88888888' });
        const product = await seedProduct({ name: 'Widget', description: 'A widget', price: 50 });
        await seedOrder(user._id, [product._id], {
          payment: { success: false },
          status: 'Cancelled',
        });

        const res = await request(app)
          .get('/api/v1/auth/all-orders')
          .set('Authorization', token);

        expect(res.status).toBe(200);
        const [order] = res.body;

        expect(order.buyer.name).toBe('Alice');
        expect(order.status).toBe('Cancelled');
        expect(order.payment.success).toBe(false);
        expect(order).toHaveProperty('createdAt');
        expect(order.products).toHaveLength(1);
        expect(order.products[0].name).toBe('Widget');
        expect(order.products[0].price).toBe(50);
        expect(order.products[0]).not.toHaveProperty('photo');
      });

    });

    describe('PUT /api/v1/auth/order-status/:orderId', () => {

      it('returns 401 when the Authorization header is absent', async () => {
        const { user } = await seedUser();
        const product = await seedProduct();
        const order = await seedOrder(user._id, [product._id]);

        const res = await request(app)
          .put(`/api/v1/auth/order-status/${order._id}`)
          .send({ status: 'Shipped' });

        expect(res.status).toBe(401);
      });

      it('returns 401 when a valid token belongs to a non-admin user', async () => {
        const { user, token } = await seedUser();
        const product = await seedProduct();
        const order = await seedOrder(user._id, [product._id]);

        const res = await request(app)
          .put(`/api/v1/auth/order-status/${order._id}`)
          .set('Authorization', token)
          .send({ status: 'Shipped' });

        expect(res.status).toBe(401);
      });

      it('returns 200 and the updated order when the admin changes the order status', async () => {
        const { token } = await seedAdmin();
        const { user } = await seedUser({ email: 'buyer@test.com' });
        const product = await seedProduct();
        const order = await seedOrder(user._id, [product._id], { status: 'Not Processed' });

        const res = await request(app)
          .put(`/api/v1/auth/order-status/${order._id}`)
          .set('Authorization', token)
          .send({ status: 'Delivered' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('Delivered');

        const inDb = await orderModel.findById(order._id);
        expect(inDb.status).toBe('Delivered');
      });

      it('reflects update when admin subsequently fetches all orders', async () => {
        const { token } = await seedAdmin();
        const { user } = await seedUser({ email: 'buyer@test.com' });
        const product = await seedProduct();
        const order = await seedOrder(user._id, [product._id], { status: 'Not Processed' });

        await request(app)
          .put(`/api/v1/auth/order-status/${order._id}`)
          .set('Authorization', token)
          .send({ status: 'Processing' });

        const res = await request(app)
          .get('/api/v1/auth/all-orders')
          .set('Authorization', token);

        expect(res.status).toBe(200);
        const updatedOrder = res.body.find((o) => o._id.toString() === order._id.toString());
        expect(updatedOrder).toBeDefined();
        expect(updatedOrder.status).toBe('Processing');

      });

    });

  });

});