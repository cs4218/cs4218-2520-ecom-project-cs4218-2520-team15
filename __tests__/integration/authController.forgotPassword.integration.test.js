/* Name: Mahadhir Bin Mohd Ismail
 * Student No: A0252808B
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import userModel from "../../models/userModel.js";
import { hashPassword } from "../../helpers/authHelper.js";
import { forgotPasswordController } from "../../controllers/authController.js";

describe("Integration tests for forgot password components", () => {
    let mongoServer;
    let mock_user0, mockHashedPassword;
    let req, res;

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

        req = {
            body: {}
        };
        res = {
            send: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
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

    describe("Integration between forgotPasswordController and userModel", () => {
        it("should return error if answer is incorrect", async () => {
            req.body = {
                email: 'existuser@gmail.com',
                password: 'newpassword',
                answer: 'wronganswer',
            };

            await forgotPasswordController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Answer is incorrect',
            });
        });

        it("should return 500 if database has errors", async () => {
            try {
                req.body = {
                    email: 'existuser@gmail.com',
                    password: 'newpassword',
                    answer: 'existanswer',
                };
                
                await mongoose.disconnect();
                await forgotPasswordController(req, res);
    
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        message: 'Error in resetting password',
                    })
                );
            } finally {
                // Reset db connection
                await mongoose.connect(mongoServer.getUri());
            }
        })
    });

    describe("Integration between forgotPasswordController, userModel and hashPassword", () => {
        it("should reset password successfully", async () => {
            req.body = {
                email: 'existuser@gmail.com',
                password: 'newpassword',
                answer: 'existanswer',
            };

            await forgotPasswordController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'Password Reset Successfully',
            });

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
});