/* Name: Mahadhir Bin Mohd Ismail
 * Student No: A0252808B
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import userModel from "../../models/userModel.js";
import request from 'supertest';
import app from '../../server.js';

describe("Integration tests with frontend API calls", () => {
    let mongoServer;
    let mock_user0;

    beforeAll(async () => {
        // Set up mongo server for testing
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);

        // Silence console log
        jest.spyOn(global.console, 'log').mockImplementation(() => {});
    });

    beforeEach(async () => {
        mock_user0 = await new userModel({
            name: 'Existing User',
            email: 'existuser@gmail.com',
            phone: '1234567890',
            address: 'existaddr',
            password: 'existhashedpassword',
            answer: 'existanswer',
        }).save();
    });

    afterEach(async () => {
        await userModel.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();

        jest.restoreAllMocks();
    });

    it("should return error if user is already registered", async () => {
        const res = await request(app)
            .post('/api/v1/auth/register/')
            .send({
                name: 'Existing User',
                email: 'existuser@gmail.com',
                phone: '1234567890',
                address: 'existaddr',
                password: 'existhashedpassword',
                answer: 'existanswer',
            });

        expect(await userModel.countDocuments()).toEqual(1);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('User is already registered. Please login.');
    });

    it("should return 500 if database has errors", async () => {
        try {
            await mongoose.disconnect();
            const res = await request(app)
                .post('/api/v1/auth/register/')
                .send({
                    name: 'New User',
                    email: 'newuser@gmail.com',
                    phone: '1234567890',
                    address: 'newaddr',
                    password: 'newpassword',
                    answer: 'newanswer',
                });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Error in Registration');
        } finally {
            // Reset db connection
            await mongoose.connect(mongoServer.getUri());
        }
    });

    it("should register user successfully", async () => {
        const res = await request(app)
            .post('/api/v1/auth/register/')
            .send({
                name: 'New User',
                email: 'newuser@gmail.com',
                phone: '1234567890',
                address: 'newaddr',
                password: 'newpassword',
                answer: 'newanswer',
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('User registered successfully');
        expect(res.body.user).toMatchObject({
            name: 'New User',
            email: 'newuser@gmail.com',
            phone: '1234567890',
            address: 'newaddr',
            answer: 'newanswer',
            role: 0,
        });

        // Verify if db saves user
        expect(await userModel.countDocuments()).toEqual(2);

        const savedUser = await userModel.findOne({ email: 'newuser@gmail.com' });
        expect(savedUser).toBeTruthy();
        expect(savedUser.name).toBe('New User');
        expect(savedUser.email).toBe('newuser@gmail.com');
        expect(savedUser.phone).toBe('1234567890');
        expect(savedUser.address).toBe('newaddr');
        expect(savedUser.answer).toBe('newanswer');
        expect(savedUser.role).toBe(0);
        expect(savedUser.password).not.toBe('newpassword'); // Should be hashed
    });
});