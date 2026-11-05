import "./Virtual_Try_on_banners.css";
function VirtualTryOnBanner({ onTryOn }) {
  return (
    <section className="try-banner" id="virtual-try-on">
      <div className="try-banner-content">
        <p className="eyebrow">
          A NEW WAY TO DISCOVER JEWELLERY
        </p>

        <h2>
          See it on you.
          <br />
          <em>Love it forever.</em>
        </h2>

        <p>
          Not sure how a design will look? Preview your
          favourite jewellery using our virtual try-on
          experience before making it yours.
        </p>

        <button
          className="light-button"
          onClick={onTryOn}
        >
          Experience Virtual Try-On <span>→</span>
        </button>
      </div>

      <div className="try-banner-decoration">✧</div>
    </section>
  );
}

export default VirtualTryOnBanner;
