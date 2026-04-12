/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import { render, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import Products from "../../../pages/admin/Products";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("@components/Layout", () => ({ children, ...props }) => (
  <div {...props}>{children}</div>
));

jest.mock("@components/AdminMenu", () => () => <div>Admin Menu</div>);

describe("Products admin page", () => {
  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render products correctly", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        products: [
          {
            _id: "1",
            slug: "fake-book-slug",
            name: "Book",
            description: "A fake book",
            price: 29.99,
          },
          {
            _id: "2",
            slug: "fake-laptop-slug",
            name: "Laptop",
            description: "A fake laptop",
            price: 999.99,
          },
        ],
      },
    });

    const { getByAltText, getByText, queryAllByRole } = render(<Products />);

    await waitFor(async () => {
      expect(axios.get).toHaveBeenCalled();
      expect(await queryAllByRole("link")).toHaveLength(2);
    });
    expect(
      getByText("Book", { selector: "h5", exact: true }),
    ).toBeInTheDocument();
    expect(
      getByText("A fake book", { selector: "p", exact: true }),
    ).toBeInTheDocument();
    expect(getByAltText("Book", { selector: "img" })).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/1",
    );
    expect(
      getByText("Laptop", { selector: "h5", exact: true }),
    ).toBeInTheDocument();
    expect(
      getByText("A fake laptop", { selector: "p", exact: true }),
    ).toBeInTheDocument();
    expect(getByAltText("Laptop", { selector: "img" })).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/2",
    );
  });

  it("should render empty products correctly", async () => {
    axios.get.mockResolvedValueOnce({
      data: { products: [] },
    });

    const { getByAltText, getByText, queryAllByRole } = render(<Products />);

    await waitFor(async () => {
      expect(axios.get).toHaveBeenCalled();
      expect(await queryAllByRole("link")).toHaveLength(0);
    });
    expect(
      getByText("No products found", { selector: "p", exact: true }),
    ).toBeInTheDocument();
  });

  it("should render empty products if get products fails (application error)", async () => {
    axios.get.mockResolvedValueOnce({ data: {} });

    const { getByAltText, getByText, queryAllByRole } = render(<Products />);

    await waitFor(async () => {
      expect(axios.get).toHaveBeenCalled();
      expect(await queryAllByRole("link")).toHaveLength(0);
    });
    expect(
      getByText("No products found", { selector: "p", exact: true }),
    ).toBeInTheDocument();
  });

  it("should prompt error if get products fails (server error)", async () => {
    axios.get.mockRejectedValue(new Error("Get products error"));

    const { getByAltText, getByText, queryAllByRole } = render(<Products />);

    await waitFor(async () => {
      expect(axios.get).toHaveBeenCalled();
      expect(await queryAllByRole("link")).toHaveLength(0);
    });
    expect(
      getByText("No products found", { selector: "p", exact: true }),
    ).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });
});
