/* Name: Mahadhir Bin Mohd Ismail
 * Student No: A0252808B
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import userModel from "../../models/userModel.js";
import { registerController } from "../../controllers/authController.js";

describe("Integration tests for registration components", () => {
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
        mock_user0 = await new userModel({
            name: 'Existing User',
            email: 'existuser@gmail.com',
            phone: '1234567890',
            address: 'existaddr',
            password: 'existhashedpassword',
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

    describe("Integration between registerController and userModel", () => {
        it("should return error if user already exists", async () => {
            req.body = {
                name: 'Existing User',
                email: 'existuser@gmail.com',
                phone: '1234567890',
                address: 'existaddr',
                password: 'existhashedpassword',
                answer: 'existanswer',
            };

            await registerController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "User is already registered. Please login.",
            });
        });

        it("should return 500 if database has errors", async () => {
            await mongoose.disconnect();
            req.body = {
                name: 'New User',
                email: 'newuser@gmail.com',
                phone: '1234567890',
                address: 'newaddr',
                password: 'newpassword',
                answer: 'newanswer',
            };

            await registerController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Error in Registration',
                })
            );

            // Reset db connection
            await mongoose.connect(mongoServer.getUri());
        });
    });

    describe("Integration between registerController, userModel and hashPassword", () => {
        it("should register user successfully", async () => {
            req.body = {
                name: 'New User',
                email: 'newuser@gmail.com',
                phone: '1234567890',
                address: 'newaddr',
                password: 'newpassword',
                answer: 'newanswer',
            };

            await registerController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "User registered successfully",
                user: expect.objectContaining({
                    name: 'New User',
                    email: 'newuser@gmail.com',
                    phone: '1234567890',
                    address: 'newaddr',
                    answer: 'newanswer',
                    role: 0,
                }),
            });

            // Verify if db saves user
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
});