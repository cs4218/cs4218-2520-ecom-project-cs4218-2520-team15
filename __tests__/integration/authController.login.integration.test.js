/* Name: Mahadhir Bin Mohd Ismail
 * Student No: A0252808B
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import userModel from "../../models/userModel.js";
import { loginController } from "../../controllers/authController.js";
import { hashPassword } from "../../helpers/authHelper.js";
import JWT from "jsonwebtoken";

describe("Integration tests for login components", () => {
    let mongoServer;
    let mock_user0;
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
        const mockHashedPassword = await hashPassword('existpassword');
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

    describe("Integration between loginController and userModel", () => {
        it("should return error is user is not registered", async () => {
            req.body = {
                email: 'newuser@gmail.com',
                password: 'newpassword',
            };

            await loginController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Email is not registered',
            });
        });

        it("should return 500 if database has errors", async () => {
            await mongoose.disconnect();
            req.body = {
                email: 'existuser@gmail.com',
                password: 'existpassword',
            };

            await loginController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Error in login',
                })
            );

            // Reset db connection
            await mongoose.connect(mongoServer.getUri());
        });
    });

    describe("Integration between loginController, userModel and comparePassword", () => {
        it("should return error if password is incorrect", async () => {
            req.body = {
                email: 'existuser@gmail.com',
                password: 'wrongpassword',
            };

            await loginController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Password is incorrect',
            });
        });
    });

    describe("Integration between backend login components", () => {
        it("should login user successfully", async () => {
            req.body = {
                email: 'existuser@gmail.com',
                password: 'existpassword',
            };
            const token = await JWT.sign({ _id: mock_user0._id }, process.env.JWT_SECRET, {
                expiresIn: "7d",
            });

            await loginController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'login successfully',
                user: {
                    _id: mock_user0._id,
                    name: mock_user0.name,
                    email: mock_user0.email,
                    phone: mock_user0.phone,
                    address: mock_user0.address,
                    role: mock_user0.role,
                },
                token: token,
            });
        });
    })
});