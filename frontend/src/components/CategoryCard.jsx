import "./CategoryCard.css";
function CategoryCard({ name, image, description, onClick }) {
  return (
    <button className="category-card" onClick={onClick}>
      <div className="category-image">
        <img src={image} alt={name} />
        <span className="category-arrow">↗</span>
      </div>

      <h3>{name}</h3>
      <p>{description}</p>
    </button>
  );
}

export default CategoryCard;
