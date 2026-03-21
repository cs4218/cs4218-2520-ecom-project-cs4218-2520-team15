/* Name: Tan Qin Xu
 * Student No: A0213002J
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import Categories from '../../pages/Categories';
import useCategory from '../../hooks/useCategory';

jest.mock('axios');

jest.mock('../../components/Layout', () => {
  return function Layout({ children, title }) {
    return (
      <div data-testid="layout">
        <title>{title}</title>
        {children}
      </div>
    );
  };
});

describe('Integration Test: useCategory Hook + Categories Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch categories via useCategory and render links in Categories page', async () => {
    const mockCategories = [
      { _id: '1', name: 'Electronics', slug: 'electronics' },
      { _id: '2', name: 'Books', slug: 'books' },
      { _id: '3', name: 'Clothing', slug: 'clothing' }
    ];

    axios.get.mockResolvedValueOnce({
      data: { category: mockCategories }
    });

    render(
      <BrowserRouter>
        <Categories />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    });

    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Books')).toBeInTheDocument();
    expect(screen.getByText('Clothing')).toBeInTheDocument();

    const electronicsLink = screen.getByText('Electronics').closest('a');
    expect(electronicsLink).toHaveAttribute('href', '/category/electronics');

    const booksLink = screen.getByText('Books').closest('a');
    expect(booksLink).toHaveAttribute('href', '/category/books');

    const clothingLink = screen.getByText('Clothing').closest('a');
    expect(clothingLink).toHaveAttribute('href', '/category/clothing');

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
  });

  test('should render without errors when API returns empty category list', async () => {
    axios.get.mockResolvedValueOnce({
      data: { category: [] }
    });

    render(
      <BrowserRouter>
        <Categories />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    const links = screen.queryAllByRole('link');
    const categoryLinks = links.filter(link => 
      link.getAttribute('href')?.startsWith('/category/')
    );
    expect(categoryLinks).toHaveLength(0);

    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  test('should handle null/undefined category data gracefully', async () => {
    axios.get.mockResolvedValueOnce({
      data: { category: null }
    });

    render(
      <BrowserRouter>
        <Categories />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    const links = screen.queryAllByRole('link');
    const categoryLinks = links.filter(link => 
      link.getAttribute('href')?.startsWith('/category/')
    );
    expect(categoryLinks).toHaveLength(0);

    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  test('should render without errors when API call fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network error'));

    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    render(
      <BrowserRouter>
        <Categories />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    expect(consoleLogSpy).toHaveBeenCalled();

    const links = screen.queryAllByRole('link');
    const categoryLinks = links.filter(link => 
      link.getAttribute('href')?.startsWith('/category/')
    );
    expect(categoryLinks).toHaveLength(0);

    expect(screen.getByTestId('layout')).toBeInTheDocument();

    consoleLogSpy.mockRestore();
  });

  test('should render correct number of category links matching API data', async () => {
    const mockCategories = [
      { _id: '1', name: 'Electronics', slug: 'electronics' },
      { _id: '2', name: 'Books', slug: 'books' },
      { _id: '3', name: 'Clothing', slug: 'clothing' },
      { _id: '4', name: 'Home & Garden', slug: 'home-garden' },
      { _id: '5', name: 'Sports', slug: 'sports' }
    ];

    axios.get.mockResolvedValueOnce({
      data: { category: mockCategories }
    });

    render(
      <BrowserRouter>
        <Categories />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    });

    const categoryLinks = screen.getAllByRole('link').filter(link => 
      link.getAttribute('href')?.startsWith('/category/')
    );
    expect(categoryLinks).toHaveLength(5);

    mockCategories.forEach(category => {
      const categoryElement = screen.getByText(category.name);
      expect(categoryElement).toBeInTheDocument();
      expect(categoryElement.closest('a')).toHaveAttribute('href', `/category/${category.slug}`);
    });
  });

  test('should render categories with special characters correctly', async () => {
    const mockCategories = [
      { _id: '1', name: 'Home & Garden', slug: 'home-garden' },
      { _id: '2', name: 'Arts & Crafts', slug: 'arts-crafts' },
      { _id: '3', name: 'Health/Beauty', slug: 'health-beauty' }
    ];

    axios.get.mockResolvedValueOnce({
      data: { category: mockCategories }
    });

    render(
      <BrowserRouter>
        <Categories />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Home & Garden')).toBeInTheDocument();
    });

    expect(screen.getByText('Home & Garden')).toBeInTheDocument();
    expect(screen.getByText('Arts & Crafts')).toBeInTheDocument();
    expect(screen.getByText('Health/Beauty')).toBeInTheDocument();

    const homeLink = screen.getByText('Home & Garden').closest('a');
    expect(homeLink).toHaveAttribute('href', '/category/home-garden');
  });

  test('should render Categories within Layout with correct title', async () => {
    const mockCategories = [
      { _id: '1', name: 'Electronics', slug: 'electronics' }
    ];

    axios.get.mockResolvedValueOnce({
      data: { category: mockCategories }
    });

    render(
      <BrowserRouter>
        <Categories />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    });

    expect(screen.getByTestId('layout')).toBeInTheDocument();

    const titleElement = document.querySelector('title');
    expect(titleElement).toHaveTextContent('All Categories');
  });

  test('should only call API once when component mounts', async () => {
    const mockCategories = [
      { _id: '1', name: 'Electronics', slug: 'electronics' }
    ];

    axios.get.mockResolvedValueOnce({
      data: { category: mockCategories }
    });

    const { rerender } = render(
      <BrowserRouter>
        <Categories />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    });

    expect(axios.get).toHaveBeenCalledTimes(1);

    rerender(
      <BrowserRouter>
        <Categories />
      </BrowserRouter>
    );

    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});