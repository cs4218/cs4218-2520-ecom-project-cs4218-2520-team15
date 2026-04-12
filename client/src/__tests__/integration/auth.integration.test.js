/* Name: Mahadhir Bin Mohd Ismail
 * Student No: A0252808B
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../context/auth";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Login from "../../pages/Auth/Login";
import { toast } from "react-hot-toast";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("@context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]), // Mock useCart hook to return null state and a mock function
}));

jest.mock("@context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]), // Mock useSearch hook to return null state and a mock function
}));

const mockUser = {
    name: "John Doe", 
    email: "test@example.com",
    password: "test",
    phone: "123456789",
    address: "test",
    answer: "test",
    role: 0
};

const mockToken = "mock-jwt-token";

const renderLoginPage = () => {
    return render(
        <AuthProvider>
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path='/' element={<div />} />
                </Routes>
            </MemoryRouter>
        </AuthProvider>
    );
};

const AuthConsumer = () => {
    const [auth, setAuth] = useAuth();

    const handleSubmit = () => {
        setAuth({
        ...auth,  
        user: mockUser,
        token: "mockToken",
        });
    };

    return (
        <div>
        <span data-testid="auth-value">{JSON.stringify(auth)}</span>
        <button data-testid="auth-button" onClick={handleSubmit}>
            Test Auth
        </button>
        </div>
    );
};

describe("Integration tests for frontend authentication components", () => {
    beforeAll(() => {
        jest.spyOn(global.console, 'log').mockImplementation(() => {});
    })
    
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    afterAll(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    describe("Integration between auth context and localStorage", () => {
        it("should provide null user and empty token when localStorage is empty", async () => {
            render(
                <AuthProvider>
                    <AuthConsumer />
                </AuthProvider>
            )

            expect(screen.getByTestId("auth-value").textContent).toBe(
                JSON.stringify({ user: null, token: "" })
            );
        });

        it("should initialize auth data from localStorage if valid data is present", async () => {
            localStorage.setItem("auth", JSON.stringify({ user: mockUser, token: mockToken }));

            render(
                <AuthProvider>
                    <AuthConsumer />
                </AuthProvider>
            )

            expect(screen.getByTestId("auth-value").textContent).toBe(
                JSON.stringify({ user: mockUser, token: mockToken })
            );
        });
    });

    describe("Integration between auth context, localStorage and Login page", () => {
        beforeEach(() => {
            axios.get.mockResolvedValue({ data: { category: [] } });
        });
        
        it("should succesfully login user and update localStorage", async () => {
            axios.post.mockResolvedValueOnce({ 
                data: {
                    success: true,
                    message: "login successfully",
                    user: mockUser,
                    token: mockToken,
                } 
            });

            renderLoginPage();

            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: mockUser.email },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
                target: { value: mockUser.password },
            });
            fireEvent.click(screen.getByText("LOGIN"));

            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
                    email: mockUser.email,
                    password: mockUser.password,
                });
                expect(toast.success).toHaveBeenCalledWith("login successfully", {
                    duration: 5000,
                    icon: "🙏",
                    style: {
                        background: "green",
                        color: "white",
                    },
                });
            });

            const storedAuth = JSON.parse(localStorage.getItem("auth"));
            expect(storedAuth.user).toMatchObject(mockUser);
            expect(storedAuth.token).toMatch(mockToken);
            
            await waitFor(() => {
                expect(axios.defaults.headers.common["Authorization"]).toBe(mockToken);
            });
        });

        it("should display error message on failed login", async () => {
            axios.post.mockResolvedValueOnce({ 
                data: {
                    success: false,
                    message: "Invalid credentials" 
                }
            });

            renderLoginPage();

            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: 'wrongemail@gmail.com' },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
                target: { value: 'wrongpassword' },
            });
            fireEvent.click(screen.getByText("LOGIN"));

            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
                    email: 'wrongemail@gmail.com',
                    password: 'wrongpassword',
                });
                expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
            });

            expect(localStorage.getItem("auth")).toBeNull();
        });

        it("should display error on internal error", async () => {
            axios.post.mockImplementation(() => { throw new Error("mockError"); });

            renderLoginPage();

            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: mockUser.email },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
                target: { value: mockUser.password },
            });
            fireEvent.click(screen.getByText("LOGIN"));

            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
                    email: mockUser.email,
                    password: mockUser.password,
                });
                expect(console.log).toHaveBeenCalledWith(new Error("mockError"));
                expect(toast.error).toHaveBeenCalledWith("Something went wrong");
            });

            expect(localStorage.getItem("auth")).toBeNull();
        });
    });
});