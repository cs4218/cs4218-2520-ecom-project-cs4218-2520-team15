import React, { useState, useEffect } from "react";
import { Prices } from "../components/Prices";
import Layout from "../components/Layout";
import { useCart } from "../context/cart";
import { useNavigate } from "react-router-dom";
import "../styles/Homepages.css";
import axios from "axios";
import toast from "react-hot-toast";
import { Checkbox, Radio } from "antd";

const HomePage = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [checked, setChecked] = useState([]);
  const [radio, setRadio] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [filterPage, setFilterPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const isFiltering = checked.length > 0 || radio.length > 0;

  // --------------- INITIALISATION ---------------
  useEffect(() => {
    getAllCategory();
    getTotal();
  }, []);

  // get all categories
  const getAllCategory = async () => {
    try {
      const { data } = await axios.get("/api/v1/category/get-category");
      if (data?.success) {
        setCategories(data?.category);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get total count of all products
  const getTotal = async () => {
    try {
      const { data } = await axios.get("/api/v1/product/product-count");
      if (data?.success) {
        setTotal(data?.total)
      };
    } catch (error) {
      console.log(error);
    }
  };

  // --------------- UNFILTERED PRODUCT FETCHING ---------------
  // get all products
  const getAllProducts = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/v1/product/product-list/${page}`);
      if (data?.success) {
        if (page === 1) {
          setProducts(data?.products);
        } else {
          setProducts((prev) => [...prev, ...data?.products]);
        }
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.log(error);
    }
  };

  // When filters are cleared, reset unfiltered pagination and fetch from page 1
  useEffect(() => {
    if (!checked.length && !radio.length) {
      setFilteredTotal(0);
      setFilterPage(1);
      setPage(1);
      getAllProducts();
    };
  }, [checked.length, radio.length]);

  // Load next unfiltered page whenever `page` increments (but not on first render and not while filters are active)
  useEffect(() => {
    if (page === 1) return;
    getAllProducts();
  }, [page]);

  // --------------- FILTERED PRODUCT FETCHING ---------------
  // Whenever the filter criteria themselves change, restart from page 1
  useEffect(() => {
    if (isFiltering) {
      setFilterPage(1);
      filterProduct();
    };
  }, [checked, radio]);

  // When filterPage increments (Load More pressed while filtering), append next page
  useEffect(() => {
    if (!isFiltering) return;
    filterProduct();
  }, [filterPage]);

  // get filtered products
  const filterProduct = async () => {
    try {
      setLoading(true);
      const { data } = await axios.post("/api/v1/product/product-filters", {
        checked,
        radio,
        page: filterPage,
      });

      if (data?.success) {
        if (filterPage === 1) {
          setProducts(data?.products);
        } else {
          setProducts((prev) => [...prev, ...data?.products]);
        }
        setFilteredTotal(data?.total);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.log(error);
    }
  };

  // --------------- CHECKBOX HANDLER ---------------
  // filter by category
  const handleFilter = (value, id) => {
    let all = [...checked];
    if (value) {
      all.push(id);
    } else {
      all = all.filter((c) => c !== id);
    }
    setChecked(all);
  };

  // --------------- LOAD MORE LOGIC ---------------
  // Show Load More when there are still more products to fetch, regardless of whether in filtered or unfiltered mode
  const showLoadMore = isFiltering
    ? products.length < filteredTotal
    : products.length < total;
  
  const handleLoadMore = (e) => {
    e.preventDefault();
    if (isFiltering) {
      setFilterPage((prev) => prev + 1);
    } else {
      setPage((prev) => prev + 1);
    }
  }

  // --------------- RENDER ---------------
  return (
    <Layout title={"All Products - Best offers"}>
      {/* banner image */}
      <img
        src="/images/Virtual.png"
        className="banner-img"
        alt="bannerimage"
        width={"100%"}
      />

      {/* category filter */}
      <div className="container-fluid row mt-3 home-page">
        <div className="col-md-3 filters">
          <h4 className="text-center">Filter By Category</h4>
          <div className="d-flex flex-column">
            {categories?.map((c) => (
              <div key={c._id}>
                <Checkbox
                  key={c._id}
                  onChange={(e) => handleFilter(e.target.checked, c._id)}
                >
                  {c.name}
                </Checkbox>
              </div>
            ))}
          </div>

          {/* price filter */}
          <h4 className="text-center mt-4">Filter By Price</h4>
          <div className="d-flex flex-column">
            <Radio.Group onChange={(e) => setRadio(e.target.value)}>
              {Prices?.map((p) => (
                <div key={p._id}>
                  <Radio value={p.array}>{p.name}</Radio>
                </div>
              ))}
            </Radio.Group>
          </div>

          <div className="d-flex flex-column">
            <button
              className="btn btn-danger"
              onClick={() => window.location.reload()}
            >
              RESET FILTERS
            </button>
          </div>
        </div>

        <div className="col-md-9">
          <h1 className="text-center">All Products</h1>

          <div className="d-flex flex-wrap">
            {products?.map((p) => (
              <div className="card m-2" key={p._id}>
                <img
                  src={`/api/v1/product/product-photo/${p._id}`}
                  className="card-img-top"
                  alt={p.name}
                />
                <div className="card-body">
                  <div className="card-name-price">
                    <h5 className="card-title">{p.name}</h5>
                    <h5 className="card-title card-price">
                      {p.price.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </h5>
                  </div>
                  <p className="card-text">
                    {p.description.substring(0, 60)}...
                  </p>
                  <div className="card-name-price">
                    <button
                      className="btn btn-info ms-1"
                      onClick={() => navigate(`/product/${p.slug}`)}
                    >
                      More Details
                    </button>
                    <button
                      className="btn btn-dark ms-1"
                      onClick={() => {
                        setCart([...cart, p]);
                        localStorage.setItem(
                          "cart",
                          JSON.stringify([...cart, p])
                        );
                        toast.success("Item Added to cart");
                      }}
                    >
                      ADD TO CART
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* No results message */}
          {isFiltering && !loading && products.length === 0 && (
            <div className="text-center mt-4">
              <p className="text-muted fs-5">
                No products found for this filter.
              </p>
            </div>
          )}

          {/* Load More — works for both filtered and unfiltered browsing */}
          <div className="m-2 p-3">
            {showLoadMore && (
              <button
                className="btn loadmore"
                onClick={handleLoadMore}
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;