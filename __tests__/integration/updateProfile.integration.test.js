/*
  * Name: Lim Jin Yin
  * Student ID: A0256976H
*/

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../server'; // app is exported for tests
import userModel from '../../models/userModel';
import { hashPassword, comparePassword } from '../../helpers/authHelper';
import JWT from 'jsonwebtoken';

let mongoServer;

describe('Update Profile Integration Test', () => {
  let testUser;
  let token;

  jest.spyOn(console, 'log').mockImplementation(() => {});

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await userModel.deleteMany({});
    const hashedPassword = await hashPassword('password123');
    testUser = await new userModel({
      name: 'Original Name',
      email: 'test@test.com',
      password: hashedPassword,
      phone: '12345678',
      address: 'Old Address',
      answer: 'test-answer',
    }).save();

    token = JWT.sign({ _id: testUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  });

  it('should update the user in the database and return the updated object', async () => {
    const updatedData = {
      name: 'Updated Name',
      email: 'test@test.com',
      password: 'newpassword123',
      phone: '99999999',
      address: 'New Street',
    };

    const response = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send(updatedData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.updatedUser.name).toBe('Updated Name');

    const userInDb = await userModel.findById(testUser._id);
    expect(userInDb.name).toBe('Updated Name');
    expect(userInDb.address).toBe('New Street');
    expect(userInDb.phone).toBe('99999999');
  });

  it('should not update when no fields are changed', async () => {
    const response = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send({
        name: 'Original Name',
        email: 'test@test.com',
        password: 'password123',
        phone: '12345678',
        address: 'Old Address',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.updatedUser.name).toBe('Original Name');

    const userInDb = await userModel.findById(testUser._id);
    expect(userInDb.name).toBe('Original Name');
  });

  it('should fail if the authorization token is missing', async () => {
    const response = await request(app)
      .put('/api/v1/auth/profile')
      .send({ name: 'Unauthorised' });

    expect(response.status).toBe(401);
  });

  it('should return 401 with an expired token', async () => {
    const expiredToken = JWT.sign(
        { _id: testUser._id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1ms' }
    );
    await new Promise((r) => setTimeout(r, 10));

    const response = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', expiredToken)
      .send({ name: 'Unauthorised' });

    expect(response.status).toBe(401);
  });

  it('should return 401 with an invalid token', async () => {
    const invalidToken = token + 'invalid';
    
    const response = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', invalidToken)
      .send({ name: 'Unauthorised' });

    expect(response.status).toBe(401);
  });

  it('accepts a password length of 6 and updates password', async () => {
    const updatedData = {
      name: 'Name',
      email: 'test@test.com',
      password: 'abc123', // length 6
      phone: '88888888',
      address: 'Boundary St',
    };

    const response = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send(updatedData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const userInDb = await userModel.findById(testUser._id);
    expect(userInDb.name).toBe('Name');
    const matches = await comparePassword('abc123', userInDb.password);
    expect(matches).toBe(true);
  });

  it('rejects a password shorter than 6 characters and does not update', async () => {
    const updatedData = {
      name: 'ShortPwd',
      email: 'test@test.com',
      password: '12345', // length 5 - invalid
      phone: '77777777',
      address: 'Short St',
    };

    const response = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send(updatedData);

    // controller returns validation as JSON with an `error` field (no 4xx status)
    expect(response.body).toHaveProperty('error');

    const userInDb = await userModel.findById(testUser._id);
    expect(userInDb.name).toBe('Original Name');
  });

  it('updates other fields but leaves email unchanged when email is sent in payload (equivalence partition)', async () => {
    const updatedData = {
      name: 'EmailAttempt',
      email: 'newemail@example.com', // controller does not update email
      phone: '44444444',
      address: 'Email Ave',
    };

    const response = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send(updatedData);

    expect(response.status).toBe(200);
    const userInDb = await userModel.findById(testUser._id);
    expect(userInDb.name).toBe('EmailAttempt');
    expect(userInDb.email).toBe('test@test.com');
  });

  it('returns 404 when the user no longer exists', async () => {
    // simulate user deletion after token issuance
    await userModel.findByIdAndDelete(testUser._id);

    const response = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send({ name: 'AfterDelete' });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message');
  });
});
