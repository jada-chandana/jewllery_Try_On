
import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";

import TryOn from "./pages/Try_on";
import CategoryCard from "./components/CategoryCard";
import ProductCard from "./components/Product_card";
import VirtualTryOnBanner from "./components/Virtual_Try_on_banners";

import "./App.css";

// CATEGORY DATA
const categories = [
  {
    name: "Necklaces",
    image:
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=700",
    description: "Elegant pieces for every occasion",
  },
  {
    name: "Earrings",
    image:
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=700",
    description: "Details that make you shine",
  },
  {
    name: "Bangles",
    image:
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=700",
    description: "Traditional charm, modern style",
  },
  {
    name: "Rings",
    image:
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=700",
    description: "A little sparkle, a lot of meaning",
  },
];

// PRODUCT DATA
const products = [
  {
    id: 1,
    name: "Royal Pearl Necklace",
    category: "Necklaces",
    price: "1,499",
    image:
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=700",
    tag: "BESTSELLER",
  },
  {
    id: 2,
    name: "Golden Drop Earrings",
    category: "Earrings",
    price: "899",
    image:
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=700",
    tag: "NEW ARRIVAL",
  },
  {
    id: 3,
    name: "Classic Gold Bangles",
    category: "Bangles",
    price: "1,299",
    image:
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=700",
    tag: "POPULAR",
  },
  {
    id: 4,
    name: "Elegant Diamond Ring",
    category: "Rings",
    price: "999",
    image:
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=700",
    tag: "TRENDING",
  },
  {
    id: 5,
    name: "Luxury Gold Necklace",
    category: "Necklaces",
    price: "1,899",
    image:
      "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=700",
    tag: "EXCLUSIVE",
  },
  {
    id: 6,
    name: "Premium Fashion Earrings",
    category: "Earrings",
    price: "749",
    image:
      "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=700",
    tag: "CUSTOMER FAVOURITE",
  },
];

// HOME PAGE
function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const navigate = useNavigate();

  // FILTER PRODUCTS
  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter(
          (product) => product.category === selectedCategory
        );

  // NAVIGATE TO TRY-ON WITH SELECTED PRODUCT
  const handleTryOn = (product) => {
    navigate("/try-on", {
      state: { product },
    });
  };

  // PRODUCT DETAILS
  const handleViewDetails = (product) => {
    alert(
      `${product.name}\nCategory: ${product.category}\nPrice: ₹${product.price}`
    );
  };

  return (
    <div className="store">

      {/* ANNOUNCEMENT */}
      <div className="announcement">
        DISCOVER YOUR STYLE · EXPERIENCE VIRTUAL TRY-ON
      </div>

      {/* NAVBAR */}
      <header className="navbar">

        <Link className="brand" to="/">
          <span className="brand-icon">✦</span>

          <span>
            AURELLE
            <small>JEWELLERY STUDIO</small>
          </span>
        </Link>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#categories">Collections</a>
          <a href="#featured">New Arrivals</a>
          <a href="#about">Our Story</a>
        </nav>

        <button
          className="nav-try-button"
          onClick={() => navigate("/try-on")}
        >
          ✧ Try Jewellery
        </button>

      </header>

      <main>

        {/* HERO SECTION */}
        <section className="hero" id="home">

          <div className="hero-content">

            <p className="eyebrow">
              THE ART OF ADORNMENT
            </p>

            <h1>
              Elegance,
              <br />
              <em>reimagined.</em>
            </h1>

            <p className="hero-description">
              Discover jewellery that tells your story.
              Explore timeless designs and see how they
              look on you with our virtual try-on experience.
            </p>

            <div className="hero-actions">

              <a href="#categories" className="primary-button">
                Explore Collection <span>→</span>
              </a>

              <button
                className="text-button"
                onClick={() => navigate("/try-on")}
              >
                Discover Virtual Try-On ↗
              </button>

            </div>

            <div className="hero-note">
              <span>✧</span>
              A little sparkle. A lasting impression.
            </div>

          </div>

          <div className="hero-visual">

            <img
              src="https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=1200"
              alt="Elegant jewellery collection"
            />

            <div className="hero-image-label">
              <span>THE SIGNATURE COLLECTION</span>
              <strong>Made to be remembered.</strong>
            </div>

            <div className="floating-seal">
              <span>✦</span>
              <small>YOUR STYLE</small>
              <strong>YOUR WAY</strong>
            </div>

          </div>

        </section>

        {/* BENEFITS */}
        <section className="benefits">

          <div>
            <span>✧</span>
            <p>Curated Designs</p>
          </div>

          <div>
            <span>◎</span>
            <p>Virtual Try-On Experience</p>
          </div>

          <div>
            <span>◇</span>
            <p>Style With Confidence</p>
          </div>

        </section>

        {/* CATEGORIES */}
        <section className="categories-section" id="categories">

          <div className="section-heading">

            <div>
              <p className="eyebrow">
                FIND YOUR SIGNATURE
              </p>

              <h2>
                Explore our <em>collections</em>
              </h2>
            </div>

            <p className="section-description">
              The perfect finishing touch for every moment.
            </p>

          </div>

          <div className="category-grid">

            {categories.map((category) => (
              <CategoryCard
                key={category.name}
                name={category.name}
                image={category.image}
                description={category.description}
                onClick={() => {
                  setSelectedCategory(category.name);

                  document
                    .getElementById("featured")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }}
              />
            ))}

          </div>

        </section>

        {/* VIRTUAL TRY-ON BANNER */}
        <VirtualTryOnBanner
          onTryOn={() => navigate("/try-on")}
        />

        {/* FEATURED PRODUCTS */}
        <section className="featured-section" id="featured">

          <div className="section-heading">

            <div>
              <p className="eyebrow">
                HANDPICKED FOR YOU
              </p>

              <h2>
                Featured <em>pieces</em>
              </h2>
            </div>

            <a href="#categories" className="view-all">
              View all collections →
            </a>

          </div>

          {/* FILTER BUTTONS */}
          <div className="product-filters">

            {["All", ...categories.map((item) => item.name)].map(
              (category) => (
                <button
                  key={category}
                  className={
                    selectedCategory === category
                      ? "filter-button active"
                      : "filter-button"
                  }
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              )
            )}

          </div>

          {/* PRODUCT CARDS */}
          <div className="product-grid">

            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onTryOn={handleTryOn}
                onViewDetails={handleViewDetails}
              />
            ))}

          </div>

          {filteredProducts.length === 0 && (
            <p className="empty-products">
              No products available in this collection.
            </p>
          )}

        </section>

        {/* CLOSING SECTION */}
        <section className="closing-section" id="about">

          <p className="eyebrow">
            YOUR MOMENT. YOUR STYLE.
          </p>

          <h2>
            Every detail tells a story.
          </h2>

          <p>
            Find the piece that feels like you.
          </p>

          <button
            className="primary-button"
            onClick={() => navigate("/try-on")}
          >
            Find Your Jewellery <span>→</span>
          </button>

        </section>

      </main>

      {/* FOOTER */}
      <footer className="footer">

        <Link className="brand footer-brand" to="/">
          <span className="brand-icon">✦</span>

          <span>
            AURELLE
            <small>JEWELLERY STUDIO</small>
          </span>
        </Link>

        <p>
          Elegance, made personal.
        </p>

        <span>
          © 2026 AURELLE. All rights reserved.
        </span>

      </footer>

    </div>
  );
}

// MAIN APP ROUTER
function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/try-on"
          element={<TryOn />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;
