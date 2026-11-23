
import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import TryOn from "./pages/Try_on";
import CategoryCard from "./components/CategoryCard";
import ProductCard from "./components/Product_card";
import VirtualTryOnBanner from "./components/Virtual_Try_on_banners";
import Admin from "./pages/Admin"; 
import "./App.css";

// CATEGORY DATA
const categories = [
  {
    id: 1,
    name: "Royal Pearl Necklace",
    category: "Necklaces",
    price: "1,499",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600",
    tag: "BESTSELLER",
    chainType: "necklace",
    overlayImage: "/jewellery/royal-pearl-necklace.webp",
  },
  // {
  //   id: 2,
  //   name: "Golden Drop Earrings",
  //   category: "Earrings",
  //   price: "899",
  //   image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600",
  //   tag: "NEW ARRIVAL",
  //   earringType: "drop",
  //   overlayImage: "/jewellery/gold-drop-earrings.webp",
  // },
  // {
  //   id: 3,
  //   name: "Classic Gold Bangles",
  //   category: "Bangles",
  //   price: "1,299",
  //   image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600",
  //   tag: "POPULAR",
  //   bangleType: "set",
  //   overlayImage: "/jewellery/gold-bangle-set.webp",
  // },
  // {
  //   id: 4,
  //   name: "Elegant Diamond Ring",
  //   category: "Rings",
  //   price: "999",
  //   image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600",
  //   tag: "TRENDING",
  // },
  {
    id: 5,
    name: "Luxury Gold Necklace",
    category: "Necklaces",
    price: "1,899",
    image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600",
    tag: "EXCLUSIVE",
    chainType: "necklace",
    overlayImage: "/jewellery/royal-pearl-necklace.webp",
  },
  // {
  //   id: 6,
  //   name: "Premium Fashion Earrings",
  //   category: "Earrings",
  //   price: "749",
  //   image: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=600",
  //   tag: "CUSTOMER FAVOURITE",
  //   earringType: "hoop",
  //   overlayImage: "/jewellery/gold-hoop.webp",
  // },
];

// PRODUCT DATA

// PRODUCT DATA
const products = [
  {
    id: 1,
    name: "Royal Pearl Necklace",
    category: "Necklaces",
    price: "1,499",
    image: "/jewellery/royal-pearl-necklace.webp",
    tag: "BESTSELLER",
    chainType: "necklace",
    overlayImage: "/jewellery/royal-pearl-necklace.webp",
  },
  // {
  //   id: 2,
  //   name: "Golden Drop Earrings",
  //   category: "Earrings",
  //   price: "899",
  //   image: "/jewellery/gold-drop-earrings.webp",
  //   tag: "NEW ARRIVAL",
  //   earringType: "drop",
  //   overlayImage: "/jewellery/gold-drop-earrings.webp",
  // },
  // {
  //   id: 3,
  //   name: "Classic Gold Bangles",
  //   category: "Bangles",
  //   price: "1,299",
  //   image: "/jewellery/gold-bangle-set.webp",
  //   tag: "POPULAR",
  //   bangleType: "set",
  //   overlayImage: "/jewellery/gold-bangle-set.webp",
  // },
  {
    id: 4,
    name: "Elegant Diamond Ring",
    category: "Rings",
    price: "999",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=700",
    tag: "TRENDING",
  },
  {
    id: 5,
    name: "Luxury Gold Necklace",
    category: "Necklaces",
    price: "1,899",
    image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=700",
    tag: "EXCLUSIVE",
    chainType: "necklace",
    overlayImage: "/jewellery/royal-pearl-necklace.webp",
  },
  {
    id: 6,
    name: "Premium Fashion Earrings",
    category: "Earrings",
    price: "749",
    image: "/jewellery/gold-bangle-set.webp",
    tag: "CUSTOMER FAVOURITE",
    earringType: "hoop",
    overlayImage: "/jewellery/gold-hoop.webp",
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

  // OPEN TRY-ON WITH SELECTED PRODUCT
  const handleTryOn = (product) => {
    navigate("/try-on", {
      state: { product },
    });
  };

  // OPEN PRODUCT DETAILS
  const handleViewDetails = (product) => {
    navigate(`/product/${product.id}`);
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
            <p className="eyebrow">THE ART OF ADORNMENT</p>

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
              <p className="eyebrow">FIND YOUR SIGNATURE</p>
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
              <p className="eyebrow">HANDPICKED FOR YOU</p>
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
          <p className="eyebrow">YOUR MOMENT. YOUR STYLE.</p>

          <h2>Every detail tells a story.</h2>

          <p>Find the piece that feels like you.</p>

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

        <p>Elegance, made personal.</p>

        <span>© 2026 AURELLE. All rights reserved.</span>
      </footer>
    </div>
  );
}

// PRODUCT DETAILS PAGE
function ProductDetailsPage() {
  const { productId } = useParams();
  const navigate = useNavigate();

  const [addedToCart, setAddedToCart] = useState(false);

  const product = products.find(
    (item) => item.id === Number(productId)
  );

  // PRODUCT NOT FOUND
  if (!product) {
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        <h2>Product not found</h2>
        <Link to="/">Back to Home</Link>
      </div>
    );
  }

  // CHECK TRY-ON SUPPORT
  const isTryOnSupported = [
    "Necklaces",
    "Earrings",
    "Bangles",
  ].includes(product.category);

  // OPEN TRY-ON WITH THIS PRODUCT
  const handleTryOn = () => {
    navigate("/try-on", {
      state: { product },
    });
  };

  // DEMO ADD TO CART
  const handleAddToCart = () => {
    setAddedToCart(true);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 6%",
        background: "#faf8f5",
      }}
    >
      <Link
        to="/"
        style={{
          display: "inline-block",
          marginBottom: "30px",
          color: "#555",
          textDecoration: "none",
        }}
      >
        ← Back to collection
      </Link>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "50px",
          alignItems: "center",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* PRODUCT IMAGE */}
        <div>
          <img
            src={product.image}
            alt={product.name}
            style={{
              width: "100%",
              maxHeight: "600px",
              objectFit: "cover",
              borderRadius: "12px",
            }}
          />
        </div>

        {/* PRODUCT INFORMATION */}
        <div>
          <p
            style={{
              color: "#98764b",
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            {product.category}
          </p>

          <h1
            style={{
              fontSize: "36px",
              color: "#29231e",
              marginBottom: "15px",
            }}
          >
            {product.name}
          </h1>

          <h2 style={{ fontSize: "28px" }}>
            ₹{product.price}
          </h2>

          <p style={{ color: "#777", lineHeight: "1.7" }}>
            Discover this beautiful jewellery piece from
            the AURELLE collection.
          </p>

          {/* ADD TO CART */}
          <button
            onClick={handleAddToCart}
            style={{
              width: "100%",
              padding: "15px",
              marginTop: "25px",
              background: "#29231e",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            {addedToCart ? "Added to Cart ✓" : "Add to Cart"}
          </button>

          {/* AURELLE TRY-ON */}
          <button
            onClick={handleTryOn}
            disabled={!isTryOnSupported}
            style={{
              width: "100%",
              padding: "15px",
              marginTop: "12px",
              background: "transparent",
              color: isTryOnSupported ? "#29231e" : "#999",
              border: "1px solid #29231e",
              borderRadius: "6px",
              cursor: isTryOnSupported ? "pointer" : "not-allowed",
              fontSize: "16px",
            }}
          >
            {isTryOnSupported
              ? "✧ Try On with AURELLE"
              : "Try-On Coming Soon"}
          </button>

          {addedToCart && (
            <p style={{ color: "green", marginTop: "12px" }}>
              Product added to the demo cart.
            </p>
          )}
        </div>
      </div>
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
          path="/product/:productId"
          element={<ProductDetailsPage />}
        />

        <Route
          path="/try-on"
          element={<TryOn />}
        />
        <Route
  path="/seller"
  element={<Admin />}
/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
