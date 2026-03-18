/* Name: Mahadhir Bin Mohd Ismail
 * Student No: A0252808B
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import userModel from "../../models/userModel.js";
import { hashPassword } from "../../helpers/authHelper.js";
import JWT from "jsonwebtoken";
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
        const mockHashedPassword = await hashPassword('existpassword');
        mock_user0 = await new userModel({
            name: 'Existing User',
            email: 'existuser@gmail.com',
            phone: '1234567890',
            address: 'existaddr',
            password: mockHashedPassword,
            answer: 'existanswer',
        }).save();
    });

    afterEach(async () => {
        await userModel.deleteMany({});
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();

        jest.restoreAllMocks();
    });

    it("should return error if user is not registered", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: 'newuser@gmail.com',
                password: 'newpassword',
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Email is not registered');
    });

    it("should return 500 if database has errors", async () => {
        try {
            await mongoose.disconnect();

            const res = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    email: 'existuser@gmail.com',
                    password: 'existpassword',
                });
    
            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Error in login');
        } finally {
            // Reset db connection
            await mongoose.connect(mongoServer.getUri());
        }
    });

    it("should return error if password is incorrect", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: 'existuser@gmail.com',
                password: 'wrongpassword',
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Password is incorrect');
    });

    it("should login user successfully", async () => {
        const token = await JWT.sign({ _id: mock_user0._id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: 'existuser@gmail.com',
                password: 'existpassword',
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('login successfully');
        expect(res.body.user).toMatchObject({
            // _id: mock_user0._id,
            name: mock_user0.name,
            email: mock_user0.email,
            phone: mock_user0.phone,
            address: mock_user0.address,
            role: mock_user0.role,
        });
        expect(res.body.token).toBe(token);
    });
});