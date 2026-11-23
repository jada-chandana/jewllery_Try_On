
(function () {
  "use strict";

  // ==========================================
  // 1. AURELLE CONFIGURATION
  // ==========================================

  const script =
    document.currentScript ||
    document.querySelector("script[data-aurelle]");

  const apiUrl =
    script?.dataset.apiUrl || "http://localhost:5000";

  const widgetUrl =
    script?.dataset.widgetUrl || "http://localhost:5174/try-on";

  const BUTTON_ATTRIBUTE = "data-aurelle-button";
  const MIN_CONFIDENCE = 0.55;

  // Strictly supported categories
  const SUPPORTED_CATEGORIES = [
    "Chains",
    "Necklaces",
    "Chokers",
    "Harams"
  ];

  const classificationCache = new Map();
  const pendingImages = new Map();
  const processedProducts = new Set();

  let scanning = false;
  let rescanRequested = false;
  let scanTimer = null;

  // ==========================================
  // 2. CATEGORY VALIDATION
  // ==========================================

  function normalizeCategory(value) {
    const category = String(value || "")
      .trim()
      .toLowerCase();

    if (/choker/.test(category)) return "Chokers";
    if (/haram/.test(category)) return "Harams";
    if (/chain/.test(category)) return "Chains";
    if (/necklace|mangalsutra/.test(category)) {
      return "Necklaces";
    }

    return null;
  }

  function isSupportedCategory(category) {
    return SUPPORTED_CATEGORIES.includes(category);
  }

  function identifyCategory(text) {
    const value = String(text || "").toLowerCase();

    // Unsupported categories
    if (/earring|jhumka|studs?|hoops?/.test(value)) {
      return "Earrings";
    }

    if (/bangle|bracelet|kada|wristlet/.test(value)) {
      return "Bangles";
    }

    if (/\bring\b|finger ring/.test(value)) {
      return "Rings";
    }

    // Supported categories
    if (/choker/.test(value)) return "Chokers";
    if (/haram/.test(value)) return "Harams";
    if (/chain/.test(value)) return "Chains";

    if (/necklace|mangalsutra/.test(value)) {
      return "Necklaces";
    }

    return null;
  }

  // ==========================================
  // 3. COMMON HELPERS
  // ==========================================

  function normalizeImageUrl(value) {
    if (!value) return "";

    if (typeof value === "object") {
      value = value.url || value.contentUrl || "";
    }

    if (typeof value !== "string") return "";

    try {
      const url = new URL(value, window.location.href);

      if (!["http:", "https:"].includes(url.protocol)) {
        return "";
      }

      return url.href;
    } catch {
      return "";
    }
  }

  function getImageFromElement(element) {
    if (!element) return "";

    const image = element.querySelector("img");

    if (!image) return "";

    return normalizeImageUrl(
      image.currentSrc ||
      image.getAttribute("src") ||
      image.getAttribute("data-src") ||
      image.getAttribute("data-lazy-src") ||
      image.getAttribute("data-original") ||
      image.getAttribute("srcset")
        ?.split(",")[0]
        ?.trim()
        .split(" ")[0] ||
      ""
    );
  }

  function getProductLink(container) {
    const link = container?.querySelector("a[href]");

    if (!link) return window.location.href;

    try {
      return new URL(
        link.getAttribute("href"),
        window.location.href
      ).href;
    } catch {
      return window.location.href;
    }
  }

  function getProductId(container, name, url) {
    return (
      container?.getAttribute("data-product-id") ||
      container?.getAttribute("data-product") ||
      container?.getAttribute("data-id") ||
      container?.getAttribute("data-variant-id") ||
      url ||
      name
    );
  }

  // ==========================================
  // 4. PRODUCT FROM HTML CONTAINER
  // ==========================================

  function getProductFromContainer(container) {
    if (!container || container.nodeType !== 1) {
      return null;
    }

    if (container.hasAttribute(BUTTON_ATTRIBUTE)) {
      return null;
    }

    const heading = container.querySelector(
      "h1, h2, h3, h4, [class*='product-title'], [class*='product-name'], [itemprop='name']"
    );

    const imageElement = container.querySelector("img");

    const name =
      heading?.textContent?.trim() ||
      imageElement?.alt?.trim() ||
      "";

    const image = getImageFromElement(container);

    if (!name || !image) return null;

    const url = getProductLink(container);

    const text = [
      name,
      container.innerText || "",
      imageElement?.alt || ""
    ].join(" ");

    return {
      id: getProductId(container, name, url),
      name,
      image,

      // Product name gets priority over card description
      category:
        identifyCategory(name) ||
        identifyCategory(text),

      url,
      container
    };
  }

  // ==========================================
  // 5. GENERIC PRODUCT CARD DETECTION
  // ==========================================

  function getProductCards() {
    const selectors = [
      ".product-card",
      ".product-item",
      ".product-tile",
      ".product-box",
      ".product-grid-item",
      ".grid__item",
      ".product",
      "[data-product-id]",
      "[data-product]",
      "[itemtype*='Product']",
      "[class*='product-card']",
      "[class*='product-item']",
      "[class*='product-tile']"
    ];

    const candidates = new Set();

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        candidates.add(element);
      });
    });

    return Array.from(candidates).filter((element) => {
      if (!element.querySelector("img")) return false;

      const hasHeading = element.querySelector(
        "h1, h2, h3, h4, [class*='product-title'], [class*='product-name']"
      );

      const hasLink = element.querySelector("a[href]");

      if (!hasHeading && !hasLink) return false;

      const hasSmallerProduct = Array.from(
        element.querySelectorAll(selectors.join(","))
      ).some((child) => {
        return (
          child !== element &&
          child.querySelector("img")
        );
      });

      return !hasSmallerProduct;
    });
  }

  // ==========================================
  // 6. JSON-LD / SCHEMA.ORG DETECTION
  // ==========================================

  function getStructuredProducts() {
    const products = [];

    function inspect(item) {
      if (!item || typeof item !== "object") return;

      if (Array.isArray(item)) {
        item.forEach(inspect);
        return;
      }

      if (item["@graph"]) {
        inspect(item["@graph"]);
      }

      const type = item["@type"];

      const isProduct =
        type === "Product" ||
        (Array.isArray(type) && type.includes("Product"));

      if (isProduct) {
        const imageValue = Array.isArray(item.image)
          ? item.image[0]
          : item.image;

        const image = normalizeImageUrl(imageValue);

        const name = item.name || "";

        if (name && image) {
          const url = item.url
            ? normalizeImageUrl(item.url)
            : window.location.href;

          const category =
            identifyCategory(item.category) ||
            identifyCategory(name) ||
            identifyCategory(item.description);

          products.push({
            id: item.sku || item.productID || url || name,
            name,
            image,
            category,
            url: url || window.location.href,
            container: null
          });
        }
      }

      if (item.mainEntity) inspect(item.mainEntity);

      if (item.itemListElement) {
        inspect(item.itemListElement);
      }

      if (item.item) inspect(item.item);

      if (item.hasVariant) inspect(item.hasVariant);
    }

    document
      .querySelectorAll('script[type="application/ld+json"]')
      .forEach((element) => {
        try {
          inspect(JSON.parse(element.textContent));
        } catch (error) {
          console.warn("AURELLE: Invalid JSON-LD", error);
        }
      });

    return products;
  }

  // ==========================================
  // 7. PRODUCT PAGE METADATA
  // ==========================================

  function getMetaContent(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);

      if (element?.content) {
        return element.content.trim();
      }
    }

    return "";
  }

  function getProductFromMetadata() {
    const name = getMetaContent([
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[property="product:name"]'
    ]);

    const image = normalizeImageUrl(
      getMetaContent([
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'meta[property="product:image"]'
      ])
    );

    if (!name || !image) return null;

    const category =
      identifyCategory(name) ||
      identifyCategory(
        getMetaContent([
          'meta[name="description"]',
          'meta[property="og:description"]'
        ])
      );

    return {
      id: window.location.pathname,
      name,
      image,
      category,
      url: window.location.href,
      container: null
    };
  }

  // ==========================================
  // 8. PRODUCT DETAIL PAGE DETECTION
  // ==========================================

  function getProductFromDetailPage() {
    const container = document.querySelector(
      [
        ".product",
        ".product-details",
        ".product-detail",
        ".product-info",
        ".product__info",
        "[class*='product-detail']",
        "[class*='product-info']",
        "[data-product]"
      ].join(",")
    );

    if (container) {
      const product = getProductFromContainer(container);

      if (product) return product;
    }

    const heading = document.querySelector(
      "main h1, [role='main'] h1, h1"
    );

    const image = normalizeImageUrl(
      document.querySelector(
        'meta[property="og:image"]'
      )?.content
    ) || getImageFromElement(
      document.querySelector("main") || document.body
    );

    const name =
      heading?.textContent?.trim() ||
      getMetaContent(['meta[property="og:title"]']);

    if (!name || !image) return null;

    return {
      id: window.location.pathname,
      name,
      image,
      category: identifyCategory(name),
      url: window.location.href,
      container: container || null
    };
  }

  // ==========================================
  // 9. AI IMAGE CLASSIFICATION
  // ==========================================

  async function classifyProductImage(imageUrl) {
    if (classificationCache.has(imageUrl)) {
      return classificationCache.get(imageUrl);
    }

    if (pendingImages.has(imageUrl)) {
      return pendingImages.get(imageUrl);
    }

    const request = (async () => {
      try {
        console.log(
          "AURELLE: Analysing image:",
          imageUrl
        );

        const response = await fetch(
          `${apiUrl}/api/products/detect-category`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ imageUrl })
          }
        );

        if (!response.ok) {
          throw new Error(
            `AI API error: ${response.status}`
          );
        }

        const result = await response.json();

        if (
          !result.success ||
          !result.category ||
          result.confidence < MIN_CONFIDENCE
        ) {
          classificationCache.set(imageUrl, null);
          return null;
        }

        classificationCache.set(imageUrl, result);

        return result;

      } catch (error) {
        console.error(
          "AURELLE: Classification failed:",
          error
        );

        return null;

      } finally {
        pendingImages.delete(imageUrl);
      }
    })();

    pendingImages.set(imageUrl, request);

    return request;
  }

  // ==========================================
  // 10. FIND BUTTON LOCATION
  // ==========================================

  function findButtonLocation(product) {
    if (product.container?.isConnected) {
      return product.container;
    }

    const addToCart = document.querySelector(
      [
        'button[name="add"]',
        'button[class*="add-to-cart"]',
        'button[id*="add-to-cart"]',
        '[data-testid="add-to-cart"]'
      ].join(",")
    );

    if (addToCart) {
      return addToCart.parentElement || addToCart;
    }

    return (
      document.querySelector("main") ||
      document.querySelector('[role="main"]') ||
      document.body
    );
  }

  // ==========================================
  // 11. OPEN TRY-ON WIDGET
  // ==========================================

  function openWidget(product) {
    if (!isSupportedCategory(product.category)) {
      console.warn(
        "AURELLE: Unsupported category blocked:",
        product.category
      );
      return;
    }

    const modal = document.createElement("div");

    Object.assign(modal.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.75)",
      zIndex: "999999",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "15px"
    });

    const frame = document.createElement("iframe");

    const url = new URL(widgetUrl);

    url.searchParams.set("productId", product.id);
    url.searchParams.set("productName", product.name);
    url.searchParams.set("category", product.category);
    url.searchParams.set("productImage", product.image);
    url.searchParams.set("productUrl", product.url);

    frame.src = url.toString();
    frame.allow = "camera";
    frame.title = "AURELLE Virtual Try-On";

    Object.assign(frame.style, {
      width: "100%",
      maxWidth: "1000px",
      height: "90vh",
      border: "none",
      borderRadius: "14px",
      background: "#fff"
    });

    const close = document.createElement("button");

    close.textContent = "✕";

    Object.assign(close.style, {
      position: "absolute",
      top: "12px",
      right: "15px",
      zIndex: "2",
      border: "none",
      background: "#fff",
      borderRadius: "50%",
      width: "38px",
      height: "38px",
      cursor: "pointer",
      fontSize: "20px"
    });

    function removeModal() {
      modal.remove();
      window.removeEventListener("message", closeWidget);
    }

    function closeWidget(event) {
      if (
        event.origin === url.origin &&
        event.data?.type === "AURELLE_CLOSE"
      ) {
        removeModal();
      }
    }

    close.onclick = removeModal;

    modal.appendChild(frame);
    modal.appendChild(close);

    modal.onclick = (event) => {
      if (event.target === modal) {
        removeModal();
      }
    };

    window.addEventListener("message", closeWidget);

    document.body.appendChild(modal);
  }

  // ==========================================
  // 12. REMOVE AURELLE BUTTONS
  // ==========================================

  function removeButtons(container) {
    if (!container) return;

    container
      .querySelectorAll(`[${BUTTON_ATTRIBUTE}="true"]`)
      .forEach((button) => button.remove());
  }

  // ==========================================
  // 13. ADD TRY-ON BUTTON
  // ==========================================

  function addTryOnButton(product) {

    // Strict category validation
    if (
      !product ||
      !isSupportedCategory(product.category)
    ) {
      if (product?.container) {
        removeButtons(product.container);
      }

      return;
    }

    const location = findButtonLocation(product);

    if (!location) return;

    const productKey = [
      product.id,
      product.name,
      product.image,
      product.url
    ].join("|");

    const existingButton = location.querySelector(
      `[${BUTTON_ATTRIBUTE}="true"]`
    );

    if (
      existingButton?.dataset.productKey === productKey
    ) {
      return;
    }

    existingButton?.remove();

    const button = document.createElement("button");

    button.type = "button";
    button.textContent = "✨ Try On with AURELLE";

    button.setAttribute(BUTTON_ATTRIBUTE, "true");
    button.dataset.productKey = productKey;

    button.style.cssText = `
      display: block;
      width: 100%;
      padding: 12px 18px;
      margin: 12px 0;
      background: #111827;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 15px;
      font-weight: 600;
    `;

    button.addEventListener("click", () => {
      openWidget(product);
    });

    location.appendChild(button);

    console.log(
      "AURELLE: Try On button added:",
      product.name,
      product.category
    );
  }

  // ==========================================
  // 14. PROCESS PRODUCT
  // ==========================================

  async function processProduct(product) {
    if (!product || !product.image || !product.name) {
      return;
    }

    const productKey = [
      product.id,
      product.name,
      product.image,
      product.url
    ].join("|");

    if (processedProducts.has(productKey)) {
      return;
    }

    processedProducts.add(productKey);

    console.log(
      "AURELLE: Product detected:",
      product.name
    );

    let category = product.category;

    // If category is not identified from product text,
    // use AI image classification.
    if (!category) {
      const result = await classifyProductImage(
        product.image
      );

      category = result?.category || null;
    }

    // Normalize category returned by AI
    const normalizedCategory = normalizeCategory(category);

    // Final security/eligibility check
    if (!isSupportedCategory(normalizedCategory)) {

      console.log(
        "AURELLE: Try On not available for:",
        product.name,
        "Category:",
        category
      );

      if (product.container) {
        removeButtons(product.container);
      }

      return;
    }

    product.category = normalizedCategory;

    addTryOnButton(product);
  }

  // ==========================================
  // 15. SCAN WEBSITE
  // ==========================================

  async function scanPage() {
    if (scanning) {
      rescanRequested = true;
      return;
    }

    scanning = true;

    try {
      const cards = getProductCards();

      if (cards.length > 0) {

        const products = cards
          .map(getProductFromContainer)
          .filter(Boolean);

        await Promise.all(
          products.map(processProduct)
        );

      } else {

        const structuredProducts = getStructuredProducts();

        if (structuredProducts.length > 0) {

          const uniqueProducts = [
            ...new Map(
              structuredProducts.map((product) => [
                product.id,
                product
              ])
            ).values()
          ];

          if (uniqueProducts.length === 1) {
            await processProduct(uniqueProducts[0]);
          } else {
            console.log(
              "AURELLE: Multiple structured products found. Looking for product cards."
            );
          }

        } else {

          const product =
            getProductFromDetailPage() ||
            getProductFromMetadata();

          if (product) {
            await processProduct(product);
          } else {
            console.log(
              "AURELLE: No product detected on this page."
            );
          }
        }
      }

    } catch (error) {
      console.error(
        "AURELLE: Scan failed:",
        error
      );

    } finally {
      scanning = false;

      if (rescanRequested) {
        rescanRequested = false;
        scheduleScan();
      }
    }
  }

  // ==========================================
  // 16. WATCH DYNAMIC WEBSITE CONTENT
  // ==========================================

  function scheduleScan() {
    clearTimeout(scanTimer);

    scanTimer = setTimeout(() => {
      scanPage();
    }, 1000);
  }

  function startObserver() {
    const observer = new MutationObserver((mutations) => {

      const hasWebsiteChanges = mutations.some((mutation) => {
        const target = mutation.target;

        if (
          target.nodeType === 1 &&
          (
            target.hasAttribute?.(BUTTON_ATTRIBUTE) ||
            target.closest?.(`[${BUTTON_ATTRIBUTE}="true"]`)
          )
        ) {
          return false;
        }

        return true;
      });

      if (hasWebsiteChanges) {
        scheduleScan();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ==========================================
  // 17. DETECT SPA NAVIGATION
  // ==========================================

  const originalPushState = history.pushState;

  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);

    processedProducts.clear();

    scheduleScan();

    return result;
  };

  const originalReplaceState = history.replaceState;

  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);

    processedProducts.clear();

    scheduleScan();

    return result;
  };

  window.addEventListener("popstate", () => {
    processedProducts.clear();
    scheduleScan();
  });

  window.addEventListener("hashchange", scheduleScan);

  // ==========================================
  // 18. INITIALIZE AURELLE
  // ==========================================

  function initialize() {
    scanPage();

    startObserver();

    console.log(
      "AURELLE Universal Product Detection initialized"
    );

    console.log(
      "Supported categories:",
      SUPPORTED_CATEGORIES.join(", ")
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

})();
