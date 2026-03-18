/* Name: Mahadhir Bin Mohd Ismail
 * Student No: A0252808B
 */

import JWT from "jsonwebtoken";
import userModel from "../../models/userModel";
import { isAdmin, requireSignIn } from "../../middlewares/authMiddleware";

jest.mock("../../models/userModel.js");
jest.mock("jsonwebtoken");

describe("authMiddleware Tests", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: { authorization: 'mockToken' },
            user: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
        };
        next = jest.fn();

        jest.spyOn(console, 'log').mockImplementation(() => {});
    })

    afterEach(() => {
        jest.resetAllMocks();
        console.log.mockRestore();
    })

    describe("requireSignIn", () => {
        it("should call next() if valid JWT", async () => {
            const mockUser = {
                _id: 1,
                name: 'Test',
                email: 'test@gmail.com',
                password: 'testpassword',
                phone: '123',
                address: 'test',
                answer: 'test',
            }
            JWT.verify.mockReturnValue(mockUser);

            await requireSignIn(req, res, next);

            expect(JWT.verify).toHaveBeenCalledWith('mockToken', 'mockJWTSecret');
            expect(req.user).toBe(mockUser);
            expect(next).toHaveBeenCalled();
        });

        it("should return 401 if internal error is thrown", async () => {
            const mockError = new Error("mock-error");
            JWT.verify.mockImplementation(() => { throw mockError });

            await requireSignIn(req, res, next);

            expect(console.log).toHaveBeenCalledWith(mockError);
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({ success: false, error: mockError, message: "Invalid or expired token" });
            JWT.verify.mockReset();
        });
    });

    describe("isAdmin", () => {
        beforeEach(() => {
            req.user = {
                _id: 1,
                name: 'Test',
                email: 'test@gmail.com',
                password: 'testpassword',
                phone: '123',
                address: 'test',
                answer: 'test',
            };
        })

        it("should return error if user is not admin", async () => {
            userModel.findById.mockResolvedValue({...req.user, role: 23});

            await isAdmin(req, res, next);

            expect(userModel.findById).toHaveBeenCalledWith(1);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({ success: false, message: "Unauthorized Access" });
        });

        it("should call next() if user is admin", async () => {
            userModel.findById.mockResolvedValue({...req.user, role: 1});

            await isAdmin(req, res, next);

            expect(userModel.findById).toHaveBeenCalledWith(1);
            expect(next).toHaveBeenCalled();
        });

        it("should return 500 if internal error is thrown", async() => {
            const mockError = new Error("mock-error");
            userModel.findById.mockImplementation(() => { throw mockError });

            await isAdmin(req, res, next);

            expect(console.log).toHaveBeenCalledWith(mockError);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ success: false, error: mockError, message: "Error in admin middleware" });
            userModel.findById.mockReset();
        });
    });
});