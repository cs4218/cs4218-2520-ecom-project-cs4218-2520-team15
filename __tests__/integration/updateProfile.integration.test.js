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
import { hashPassword, comparePassword } from '../../helpers/authHelper';
import { updateProfileController } from '../../controllers/authController';

let mongoServer;

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send   = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (userId, body = {}) => ({ user: { _id: userId }, body });

const getPayload = (res) =>
  res.json.mock.calls[0]?.[0] ?? res.send.mock.calls[0]?.[0];

const seedUser = async (overrides = {}) => {
  const hashed = await hashPassword('password123');
  const testUser = await new userModel({
    name: 'Original Name',
    email: 'test@test.com',
    password: hashed,
    phone: '12345678',
    address: 'Old Address',
    answer: 'test-answer',
    ...overrides,
  }).save();

  const token = JWT.sign(
    { _id: testUser._id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { testUser, token };
};

describe('Update profile integration tests', () => {

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
    await userModel.deleteMany({});
  });

  describe('userModel integration with MongoDB', () => {

    it('persists all required fields on creation', async () => {
      const hashed = await hashPassword('password123');
      const user = await new userModel({
        name: 'Test User',
        email: 'test@test.com',
        password: hashed,
        phone: '12345678',
        address: 'Test Street',
        answer: 'test-answer',
      }).save();

      expect(user._id).toBeDefined();
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@test.com');
      expect(user.phone).toBe('12345678');
      expect(user.address).toBe('Test Street');
    });

    it('findByIdAndUpdate with { new:true } returns the post-update document', async () => {
      const { testUser } = await seedUser();

      const updated = await userModel.findByIdAndUpdate(
        testUser._id,
        { name: 'Updated', phone: '99999999', address: 'New St' },
        { new: true }
      );

      expect(updated.name).toBe('Updated');
      expect(updated.phone).toBe('99999999');
      expect(updated.address).toBe('New St');
      expect(updated.email).toBe('test@test.com'); // unchanged
    });

    it('fields absent from the update payload remain unchanged', async () => {
      const { testUser } = await seedUser();

      await userModel.findByIdAndUpdate(testUser._id, { name: 'Changed' }, { new: true });

      const inDb = await userModel.findById(testUser._id);
      expect(inDb.phone).toBe('12345678');    // unchanged
      expect(inDb.address).toBe('Old Address'); // unchanged
    });

    it('findById returns null after the document is deleted', async () => {
      const { testUser } = await seedUser();

      await userModel.findByIdAndDelete(testUser._id);
      const inDb = await userModel.findById(testUser._id);

      expect(inDb).toBeNull();
    });

    it('stores a bcrypt hash, not the plain-text password', async () => {
      const { testUser } = await seedUser();

      expect(testUser.password).not.toBe('password123');
      expect(testUser.password.startsWith('$2')).toBe(true);
    });

  });

  describe('test integration with updateProfileController', () => {

    it('rejects a password shorter than 6 characters and leaves the DB unchanged', async () => {
      const { testUser } = await seedUser();
      const res = makeRes();

      await updateProfileController(
        makeReq(testUser._id, { name: 'New Name', password: '12345', phone: '99999999' }),
        res
      );

      expect(getPayload(res)).toHaveProperty('error');

      const inDb = await userModel.findById(testUser._id);
      expect(inDb.name).toBe('Original Name');
    });

    it('accepts a password of exactly 6 characters and hashes it', async () => {
      const { testUser } = await seedUser();
      const res = makeRes();

      await updateProfileController(
        makeReq(testUser._id, { name: 'Name', password: 'abc123', phone: '88888888' }),
        res
      );

      const inDb = await userModel.findById(testUser._id);
      expect(await comparePassword('abc123', inDb.password)).toBe(true);
      expect(inDb.password).not.toBe('abc123'); // must be hashed
    });

    it('accepts a password of more than 6 characters and hashes it', async () => {
      const { testUser } = await seedUser();
      const res = makeRes();

      await updateProfileController(
        makeReq(testUser._id, { name: 'Name', password: 'abcd1234', phone: '88888888' }),
        res
      );

      const inDb = await userModel.findById(testUser._id);
      expect(await comparePassword('abcd1234', inDb.password)).toBe(true);
      expect(inDb.password).not.toBe('abcd1234'); // must be hashed
    });

    it('does not update email even when a new email is in the payload', async () => {
      const { testUser } = await seedUser();
      const res = makeRes();

      await updateProfileController(
        makeReq(testUser._id, {
          name: 'EmailAttempt',
          email: 'newemail@example.com',
        }),
        res
      );

      const inDb = await userModel.findById(testUser._id);
      expect(inDb.email).toBe('test@test.com');  // unchanged
      expect(inDb.name).toBe('EmailAttempt');    // other fields do update
    });

    it('updates a single field and leaves all others unchanged', async () => {
      const { testUser } = await seedUser();
      const res = makeRes();

      await updateProfileController(
        makeReq(testUser._id, { name: 'Only Name Changed' }),
        res
      );

      const inDb = await userModel.findById(testUser._id);
      expect(inDb.name).toBe('Only Name Changed');
      expect(inDb.phone).toBe('12345678');      // untouched
      expect(inDb.address).toBe('Old Address'); // untouched
    });

    it('updates multiple fields in a single call', async () => {
      const { testUser } = await seedUser();
      const res = makeRes();

      await updateProfileController(
        makeReq(testUser._id, { name: 'Multi', phone: '55555555', address: 'Multi St' }),
        res
      );

      const inDb = await userModel.findById(testUser._id);
      expect(inDb.name).toBe('Multi');
      expect(inDb.phone).toBe('55555555');
      expect(inDb.address).toBe('Multi St');
    });

    it('returns success:true and the updatedUser in the response payload', async () => {
      const { testUser } = await seedUser();
      const res = makeRes();

      await updateProfileController(
        makeReq(testUser._id, { name: 'Response Check' }),
        res
      );

      const payload = getPayload(res);
      expect(payload.success).toBe(true);
      expect(payload.updatedUser.name).toBe('Response Check');
    });

    it('responds with 404 when the user no longer exists in the DB', async () => {
      const { testUser } = await seedUser();
      await userModel.findByIdAndDelete(testUser._id);
      const res = makeRes();

      await updateProfileController(makeReq(testUser._id, { name: 'Ghost' }), res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

  });

  describe('test integration with API requests', () => {

    it('returns 401 when the Authorization header is absent', async () => {
      const res = await request(app)
        .put('/api/v1/auth/profile')
        .send({ name: 'No Token' });

      expect(res.status).toBe(401);
    });

    it('returns 401 when the token has expired', async () => {
      const { testUser } = await seedUser();
      const expiredToken = JWT.sign(
        { _id: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '1ms' }
      );
      await new Promise((r) => setTimeout(r, 10));

      const res = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', expiredToken)
        .send({ name: 'Expired' });

      expect(res.status).toBe(401);
    });

    it('returns 401 when the token signature is tampered', async () => {
      const { token } = await seedUser();

      const res = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', token + 'tampered')
        .send({ name: 'Tampered' });

      expect(res.status).toBe(401);
    });

    it('returns 200 when only one field is updated in a single call', async () => {
      const { testUser, token } = await seedUser();

      const res = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', token)
        .send({ name: 'Updated Name', phone: '12345678' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.updatedUser.name).toBe('Updated Name');

      const inDb = await userModel.findById(testUser._id);
      expect(inDb.name).toBe('Updated Name');
      expect(inDb.phone).toBe('12345678');
    });

    it('returns 200 when multiple fields are updated in a single call', async () => {
      const { testUser, token } = await seedUser();

      const res = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', token)
        .send({ name: 'Full Update', password: 'newpassword123', phone: '55555555', address: 'New Street' });

      expect(res.status).toBe(200);

      const inDb = await userModel.findById(testUser._id);
      expect(inDb.name).toBe('Full Update');
      expect(inDb.phone).toBe('55555555');
      expect(inDb.address).toBe('New Street');
    });

    it('returns 404 when the authenticated user no longer exists in the database', async () => {
      const { testUser, token } = await seedUser();
      await userModel.findByIdAndDelete(testUser._id);

      const res = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', token)
        .send({ name: 'Ghost' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message');
    });

  });

});