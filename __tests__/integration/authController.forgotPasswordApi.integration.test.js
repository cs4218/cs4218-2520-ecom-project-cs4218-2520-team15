/* Name: Mahadhir Bin Mohd Ismail
 * Student No: A0252808B
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import userModel from "../../models/userModel.js";
import { hashPassword } from "../../helpers/authHelper.js";
import request from 'supertest';
import app from '../../server.js';

describe("Integration tests for forgot password components", () => {
    let mongoServer;
    let mock_user0, mockHashedPassword;

    beforeAll(async () => {
        // Set up mongo server for testing
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);

        // Silence console log
        jest.spyOn(global.console, 'log').mockImplementation(() => {});
    });

    beforeEach(async () => {
        mockHashedPassword = await hashPassword('existpassword');
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

    it("should return error if answer is incorrect", async () => {
        const res = await request(app)
            .post("/api/v1/auth/forgot-password")
            .send({
                email: 'existuser@gmail.com',
                password: 'newpassword',
                answer: 'wronganswer',
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Answer is incorrect');
    });

    it("should return 500 if database has errors", async () => {
        try {
            await mongoose.disconnect();

            const res = await request(app)
                .post("/api/v1/auth/forgot-password")
                .send({
                    email: 'existuser@gmail.com',
                    password: 'newpassword',
                    answer: 'existanswer',
                });
    
            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Error in resetting password');
        } finally {
            // Reset db connection
            await mongoose.connect(mongoServer.getUri());
        }
    })

    it("should reset password successfully", async () => {
        const res = await request(app)
            .post("/api/v1/auth/forgot-password")
            .send({
                email: 'existuser@gmail.com',
                password: 'newpassword',
                answer: 'existanswer',
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Password Reset Successfully');

        // Verify password has changed
        const updatedUser = await userModel.findOne({ email: 'existuser@gmail.com' });
        expect(updatedUser).toBeTruthy();
        expect(updatedUser.name).toBe('Existing User'); // Should match the created user
        expect(updatedUser.email).toBe('existuser@gmail.com');
        expect(updatedUser.phone).toBe('1234567890');
        expect(updatedUser.address).toBe('existaddr');
        expect(updatedUser.answer).toBe('existanswer');
        expect(updatedUser.role).toBe(0);
        expect(updatedUser.password).not.toBe(mockHashedPassword)
        expect(updatedUser.password).not.toBe('newpassword'); // Should be hashed
    });
});