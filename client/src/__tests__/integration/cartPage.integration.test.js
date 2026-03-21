/* Name: Tan Qin Xu
 * Student No: A0213002J
 */


import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from '../../context/cart';
import { AuthProvider } from '../../context/auth';
import CartPage from '../../pages/CartPage';
import '@testing-library/jest-dom';

jest.mock('axios');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => <div data-testid="toaster" />,
}));

jest.mock('braintree-web-drop-in-react', () => {
  return function DropIn() {
    return <div data-testid="braintree-dropin">Payment Gateway</div>;
  };
});

jest.mock('../../hooks/useCategory', () => {
  return jest.fn(() => [
    { _id: '1', name: 'Electronics', slug: 'electronics' },
    { _id: '2', name: 'Clothing', slug: 'clothing' }
  ]);
});

jest.mock('../../components/Form/SearchInput', () => {
  return function SearchInput() {
    return <div data-testid="search-input">Search</div>;
  };
});

const renderCartPageWithProviders = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <CartPage />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Integration Test: CartProvider + AuthProvider + CartPage + Layout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  // Test 1: Integration test for rendering CartPage with non-empty cart
  test('should display correct number of items and total price when CartPage renders with non-empty cart from CartProvider', () => {
    const mockCart = [
      {
        _id: '1',
        name: 'Product 1',
        description: 'Description for product 1',
        price: 100
      },
      {
        _id: '2',
        name: 'Product 2',
        description: 'Description for product 2',
        price: 200
      },
      {
        _id: '3',
        name: 'Product 3',
        description: 'Description for product 3',
        price: 150
      }
    ];

    localStorage.setItem('cart', JSON.stringify(mockCart));

    renderCartPageWithProviders();

    expect(screen.getByText(/You Have 3 items in your cart/i)).toBeInTheDocument();

    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getByText('Product 3')).toBeInTheDocument();

    expect(screen.getByText(/Total : \$450\.00/i)).toBeInTheDocument();

    expect(screen.getByText('Price : 100')).toBeInTheDocument();
    expect(screen.getByText('Price : 200')).toBeInTheDocument();
    expect(screen.getByText('Price : 150')).toBeInTheDocument();
  });

  // Test 2: Integration test for Remove functionality
  test('should remove item from context, localStorage, and DOM when Remove button is clicked', async () => {
    const mockCart = [
      {
        _id: '1',
        name: 'Product 1',
        description: 'Description for product 1',
        price: 100
      },
      {
        _id: '2',
        name: 'Product 2',
        description: 'Description for product 2',
        price: 200
      }
    ];

    localStorage.setItem('cart', JSON.stringify(mockCart));
    const user = userEvent.setup();

    renderCartPageWithProviders();

    expect(screen.getByText(/You Have 2 items in your cart/i)).toBeInTheDocument();
    expect(screen.getByText(/Total : \$300\.00/i)).toBeInTheDocument();

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]); // Remove first product

    await waitFor(() => {
      expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/You Have 1 items in your cart/i)).toBeInTheDocument();

    expect(screen.getByText(/Total : \$200\.00/i)).toBeInTheDocument();

    expect(screen.getByText('Product 2')).toBeInTheDocument();

    const updatedCart = JSON.parse(localStorage.getItem('cart'));
    expect(updatedCart).toEqual([
      {
        _id: '2',
        name: 'Product 2',
        description: 'Description for product 2',
        price: 200
      }
    ]);
  });

  // Test 3: Integration test for empty cart scenario
  test('should display empty cart message and zero total when all items are removed', async () => {
    const mockCart = [
      {
        _id: '1',
        name: 'Last Product',
        description: 'The only product in cart',
        price: 99
      }
    ];

    localStorage.setItem('cart', JSON.stringify(mockCart));
    const user = userEvent.setup();

    renderCartPageWithProviders();

    expect(screen.getByText(/You Have 1 items in your cart/i)).toBeInTheDocument();
    expect(screen.getByText(/Total : \$99\.00/i)).toBeInTheDocument();

    const removeButton = screen.getByRole('button', { name: /remove/i });
    await user.click(removeButton);

    await waitFor(() => {
      expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Total : \$0\.00/i)).toBeInTheDocument();

    expect(screen.queryByText('Last Product')).not.toBeInTheDocument();

    const updatedCart = JSON.parse(localStorage.getItem('cart'));
    expect(updatedCart).toEqual([]);
  });

  // Test 4: Integration test for multiple remove operations
  test('should correctly update cart when removing multiple items sequentially', async () => {
    const mockCart = [
      {
        _id: '1',
        name: 'Product A',
        description: 'Description A',
        price: 50
      },
      {
        _id: '2',
        name: 'Product B',
        description: 'Description B',
        price: 75
      },
      {
        _id: '3',
        name: 'Product C',
        description: 'Description C',
        price: 125
      }
    ];

    localStorage.setItem('cart', JSON.stringify(mockCart));
    const user = userEvent.setup();

    renderCartPageWithProviders();

    expect(screen.getByText(/You Have 3 items in your cart/i)).toBeInTheDocument();
    expect(screen.getByText(/Total : \$250\.00/i)).toBeInTheDocument();

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[1]);

    await waitFor(() => {
      expect(screen.queryByText('Product B')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/You Have 2 items in your cart/i)).toBeInTheDocument();
    expect(screen.getByText(/Total : \$175\.00/i)).toBeInTheDocument();

    const updatedRemoveButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(updatedRemoveButtons[1]);

    await waitFor(() => {
      expect(screen.queryByText('Product C')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/You Have 1 items in your cart/i)).toBeInTheDocument();
    expect(screen.getByText(/Total : \$50\.00/i)).toBeInTheDocument();

    expect(screen.getByText('Product A')).toBeInTheDocument();
  });

  // Test 5: Integration test for CartProvider initialization from localStorage
  test('should initialize CartProvider state from localStorage on mount', () => {
    const mockCart = [
      {
        _id: 'test-1',
        name: 'Stored Product',
        description: 'Product from localStorage',
        price: 299
      }
    ];

    localStorage.setItem('cart', JSON.stringify(mockCart));

    renderCartPageWithProviders();

    expect(screen.getByText('Stored Product')).toBeInTheDocument();
    expect(screen.getByText('Price : 299')).toBeInTheDocument();
    expect(screen.getByText(/You Have 1 items in your cart/i)).toBeInTheDocument();
  });

  // Test 6: Integration test for empty localStorage initialization
  test('should render empty cart when localStorage has no cart data', () => {
    renderCartPageWithProviders();

    expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();

    expect(screen.getByText(/Total : \$0\.00/i)).toBeInTheDocument();

    const removeButtons = screen.queryAllByRole('button', { name: /remove/i });
    expect(removeButtons).toHaveLength(0);
  });

  // Test 7: Integration test for price calculation accuracy
  test('should calculate and display accurate total price for decimal values', () => {
    const mockCart = [
      {
        _id: '1',
        name: 'Product 1',
        description: 'Test product',
        price: 19.99
      },
      {
        _id: '2',
        name: 'Product 2',
        description: 'Test product',
        price: 29.95
      },
      {
        _id: '3',
        name: 'Product 3',
        description: 'Test product',
        price: 15.50
      }
    ];

    localStorage.setItem('cart', JSON.stringify(mockCart));

    renderCartPageWithProviders();

    expect(screen.getByText(/Total : \$65\.44/i)).toBeInTheDocument();
  });

  // Test 8: Integration test with REAL CartProvider and AuthProvider
  test('should display checkout button when user is authenticated with cart items', () => {
    const mockAuthData = {
      user: { name: 'Test User', email: 'test@example.com', address: '123 Test St' },
      token: 'test-token-123'
    };
    
    localStorage.setItem('auth', JSON.stringify(mockAuthData));

    const mockCart = [
      {
        _id: '1',
        name: 'Product 1',
        description: 'Test product',
        price: 50
      }
    ];

    localStorage.setItem('cart', JSON.stringify(mockCart));

    renderCartPageWithProviders();

    expect(screen.getByText(/Hello\s+Test User/i)).toBeInTheDocument();

    expect(screen.getByText('Product 1')).toBeInTheDocument();

    expect(screen.getByText(/Current Address/i)).toBeInTheDocument();
    expect(screen.getByText('123 Test St')).toBeInTheDocument();

    expect(screen.queryByText(/Please Login to checkout/i)).not.toBeInTheDocument();
  });

  // Test 9: Integration test - Header displays cart badge from real CartProvider
  test('should display correct cart count in Header badge when cart has items', () => {
    const mockCart = [
      { _id: '1', name: 'Item 1', description: 'Desc 1', price: 10 },
      { _id: '2', name: 'Item 2', description: 'Desc 2', price: 20 },
      { _id: '3', name: 'Item 3', description: 'Desc 3', price: 30 }
    ];

    localStorage.setItem('cart', JSON.stringify(mockCart));

    renderCartPageWithProviders();

    expect(screen.getByText('🛒 Virtual Vault')).toBeInTheDocument();

    expect(screen.getByText('3')).toBeInTheDocument();

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  // Test 10: Integration test - Footer is rendered via Layout
  test('should render Footer component through Layout', () => {
    localStorage.clear();

    renderCartPageWithProviders();

    expect(screen.getByText(/All Rights Reserved/i)).toBeInTheDocument();
    expect(screen.getByText(/TestingComp/i)).toBeInTheDocument();

    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  // Test 11: Integration test - Header shows guest state when not authenticated
  test('should display Register and Login links in Header when user is not authenticated', () => {
    localStorage.clear();

    renderCartPageWithProviders();

    expect(screen.getByText(/Hello Guest/i)).toBeInTheDocument();

    const registerLinks = screen.getAllByText('Register');
    const loginLinks = screen.getAllByText('Login');
    
    expect(registerLinks.length).toBeGreaterThan(0);
    expect(loginLinks.length).toBeGreaterThan(0);
  });

  // Test 12: Integration test - Full flow with real components
  test('should integrate Layout, Header, Footer, AuthProvider, and CartProvider correctly', () => {
    const mockAuthData = {
      user: { name: 'John Doe', email: 'john@example.com', address: '456 Main St' },
      token: 'valid-token'
    };
    
    const mockCart = [
      { _id: 'product-1', name: 'Laptop', description: 'Gaming laptop', price: 1500 }
    ];

    localStorage.setItem('auth', JSON.stringify(mockAuthData));
    localStorage.setItem('cart', JSON.stringify(mockCart));

    renderCartPageWithProviders();

    expect(screen.getByText('🛒 Virtual Vault')).toBeInTheDocument();
    
    expect(screen.getByText(/Hello\s+John Doe/i)).toBeInTheDocument();
    
    expect(screen.getByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText(/\$1,500\.00/i)).toBeInTheDocument();
    
    expect(screen.getByText(/All Rights Reserved/i)).toBeInTheDocument();
    
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});