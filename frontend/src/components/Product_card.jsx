import "./Product_card.css";
function ProductCard({ product, onTryOn, onViewDetails }) {
  return (
    <article className="product-card">
      <div className="product-image">
        <img src={product.image} alt={product.name} />

        <span className="product-tag">
          {product.tag || "CURATED PICK"}
        </span>

        <button
          className="product-try-button"
          onClick={() => onTryOn?.(product)}
        >
          ✧ Try On
        </button>
      </div>

      <div className="product-info">
        <div>
          <p className="product-category">
            {product.category}
          </p>

          <h3>{product.name}</h3>

          <strong>₹{product.price}</strong>
        </div>

        <button
          className="product-action"
          onClick={() => onViewDetails?.(product)}
          aria-label={`View ${product.name}`}
        >
          ↗
        </button>
      </div>
    </article>
  );
}

export default ProductCard;
