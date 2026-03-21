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
import { hashPassword } from '../../../helpers/authHelper';
import { getAllUsersController } from '../../../controllers/authController';

let mongoServer;

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send   = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = () => ({});

const getPayload = (res) =>
  res.json.mock.calls[0]?.[0] ?? res.send.mock.calls[0]?.[0];

// Seed a regular user (role: 0)
const seedUser = async (overrides = {}) => {
  const hashed = await hashPassword('password123');
  const user = await new userModel({
    name: 'Test User',
    email: `user-${Date.now()}-${Math.random()}@test.com`,
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
  return seedUser({ role: 1, email: `admin-${Date.now()}-${Math.random()}@test.com`, ...overrides });
};

describe('Admin view users integration tests', () => {

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
    await userModel.deleteMany({});
  });

  describe('userModel integration with MongoDB', () => {

    it('persists all required fields and defaults role to 0', async () => {
      const { user } = await seedUser();

      expect(user._id).toBeDefined();
      expect(user.name).toBe('Test User');
      expect(user.email).toMatch(/@test\.com$/);
      expect(user.phone).toBe('12345678');
      expect(user.role).toBe(0); // default: regular user
    });

    it('persists role: 1 for an admin user', async () => {
      const { user } = await seedAdmin();

      expect(user.role).toBe(1);
    });

    it('find({}) returns all users in the collection', async () => {
      await seedUser({ email: 'a@test.com' });
      await seedUser({ email: 'b@test.com' });
      await seedAdmin({ email: 'c@test.com' });

      const all = await userModel.find({});

      expect(all).toHaveLength(3);
    });

    it('find({}) returns an empty array when the collection is empty', async () => {
      const all = await userModel.find({});

      expect(all).toEqual([]);
    });

    it('select("-password -answer") removes password and answer but keeps other fields', async () => {
      await seedUser({ email: 'proj@test.com' });

      const [user] = await userModel.find({}).select('-password -answer');

      expect(user.password).toBeUndefined();
      expect(user.answer).toBeUndefined();

      expect(user.name).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.phone).toBeDefined();
      expect(user.role).toBeDefined();
    });

    it('select("-password -answer") removes password and answer from every document in a multi-user result', async () => {
      await seedUser({ email: 'x@test.com' });
      await seedUser({ email: 'y@test.com' });

      const users = await userModel.find({}).select('-password -answer');

      users.forEach((u) => {
        expect(u.password).toBeUndefined();
        expect(u.answer).toBeUndefined();
      });
    });

  });

  describe('test integration with getAllUsersController', () => {

    it('returns all users in the collection', async () => {
      await seedUser({ email: 'a@test.com' });
      await seedUser({ email: 'b@test.com' });
      await seedAdmin({ email: 'c@test.com' });

      const res = makeRes();
      await getAllUsersController(makeReq(), res);

      const payload = getPayload(res);
      expect(payload).toHaveLength(3);
    });

    it('returns an empty array when no users exist', async () => {
      const res = makeRes();
      await getAllUsersController(makeReq(), res);

      const payload = getPayload(res);
      expect(payload).toEqual([]);
    });

    it('should not include password from every returned user', async () => {
      await seedUser({ email: 'a@test.com' });
      await seedUser({ email: 'b@test.com' });

      const res = makeRes();
      await getAllUsersController(makeReq(), res);

      getPayload(res).forEach((u) => {
        expect(u.password).toBeUndefined();
      });
    });

    it('should not include answer from every returned user', async () => {
      await seedUser({ email: 'a@test.com' });

      const res = makeRes();
      await getAllUsersController(makeReq(), res);

      getPayload(res).forEach((u) => {
        expect(u.answer).toBeUndefined();
      });
    });

    it('returns the four fields Users.js renders for each user', async () => {
      await seedUser({ name: 'Alice', email: 'alice@test.com', phone: '88888888' });

      const res = makeRes();
      await getAllUsersController(makeReq(), res);

      const [user] = getPayload(res);
      expect(user.name).toBe('Alice');
      expect(user.email).toBe('alice@test.com');
      expect(user.phone).toBe('88888888');
      expect(user.role).toBe(0);
    });

    it('returns role: 1 for an admin user so Users.js renders "Admin"', async () => {
      await seedAdmin({ name: 'Bob', email: 'bob@test.com' });

      const res = makeRes();
      await getAllUsersController(makeReq(), res);

      const [user] = getPayload(res);
      expect(user.role).toBe(1);
    });

    it('returns a mix of regular users and admins when both exist', async () => {
      await seedUser({ email: 'user@test.com' });
      await seedAdmin({ email: 'admin@test.com' });

      const res = makeRes();
      await getAllUsersController(makeReq(), res);

      const payload = getPayload(res);
      const roles = payload.map((u) => u.role).sort();
      expect(roles).toEqual([0, 1]);
    });

  });

  describe('test integration with middleware API', () => {

    // requireSignIn rejections

    it('returns 401 when the Authorization header is absent', async () => {
      const res = await request(app).get('/api/v1/auth/users');

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
        .get('/api/v1/auth/users')
        .set('Authorization', expiredToken);

      expect(res.status).toBe(401);
    });

    it('returns 401 when the token signature is tampered', async () => {
      const { token } = await seedAdmin();

      const res = await request(app)
        .get('/api/v1/auth/users')
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

    it('returns 200 and an empty array when no users exist', async () => {
      const { token } = await seedAdmin();

      const res = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 200 and all users when the admin token is valid', async () => {
      const { token } = await seedAdmin({ email: 'admin@test.com' });
      await seedUser({ email: 'u1@test.com' });
      await seedUser({ email: 'u2@test.com' });

      const res = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });

    it('returns the fields Users.js renders for each user', async () => {
      const { token } = await seedAdmin({ email: 'admin@test.com' });
      await seedUser({ name: 'Alice', email: 'alice@test.com', phone: '88888888' });

      const res = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      const alice = res.body.find((u) => u.email === 'alice@test.com');

      expect(alice.name).toBe('Alice');
      expect(alice.email).toBe('alice@test.com');
      expect(alice.phone).toBe('88888888');
      expect(alice.role).toBe(0);
    });

    it('omits password and answer from every user in the response', async () => {
      const { token } = await seedAdmin({ email: 'admin@test.com' });
      await seedUser({ email: 'u@test.com' });

      const res = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      res.body.forEach((u) => {
        expect(u.password).toBeUndefined();
        expect(u.answer).toBeUndefined();
      });
    });

  });

});