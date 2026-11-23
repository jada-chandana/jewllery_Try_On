
const express = require("express");
const cors = require("cors");
const path = require("path");
const { randomUUID } = require("crypto");
const cheerio = require("cheerio");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ==========================================
// 1. SELLER STORAGE
// ==========================================

const connectedStores = new Map();

// ==========================================
// 2. SERVE AURELLE EMBED SCRIPT
// ==========================================

app.get("/embed.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");

  res.sendFile(path.join(__dirname, "embed.js"), (error) => {
    if (error) {
      console.error("Embed script error:", error);
    }
  });
});

// ==========================================
// 3. URL VALIDATION
// ==========================================

function validateUrl(url) {
  try {
    const parsedUrl = new URL(url);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return null;
    }

    if (parsedUrl.username || parsedUrl.password) {
      return null;
    }

    return parsedUrl;
  } catch {
    return null;
  }
}

// ==========================================
// 4. FETCH WEBSITE
// ==========================================

async function fetchWebsite(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent": "AURELLE-Store-Integration/1.0",
      Accept: "text/html"
    }
  });

  if (!response.ok) {
    throw new Error(`Website returned status ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    throw new Error("URL does not return an HTML webpage");
  }

  const html = await response.text();

  if (html.length > 5 * 1024 * 1024) {
    throw new Error("Website HTML is too large");
  }

  return html;
}

// ==========================================
// 5. HOME
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AURELLE API is running"
  });
});

// ==========================================
// 6. HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    application: "AURELLE"
  });
});

// ==========================================
// 7. CONNECT SELLER STORE
// ==========================================

app.post("/api/stores/connect", async (req, res) => {
  try {
    const { storeUrl } = req.body;

    if (!storeUrl || typeof storeUrl !== "string") {
      return res.status(400).json({
        success: false,
        message: "Store URL is required"
      });
    }

    const parsedUrl = validateUrl(storeUrl);

    if (!parsedUrl) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid HTTP or HTTPS website URL"
      });
    }

    const normalizedUrl = parsedUrl.toString().replace(/\/$/, "");

    console.log("Verifying seller store:", normalizedUrl);

    await fetchWebsite(normalizedUrl);

    const sellerId = randomUUID();

    const seller = {
      sellerId,
      storeUrl: normalizedUrl,
      status: "CONNECTED",
      connectedAt: new Date().toISOString()
    };

    connectedStores.set(sellerId, seller);

    console.log("Store connected:", seller);

    return res.status(201).json({
      success: true,
      message: "Store connected successfully",
      seller
    });

  } catch (error) {
    console.error("Store connection error:", error);

    return res.status(400).json({
      success: false,
      message: "Unable to connect store",
      error: error.message
    });
  }
});

// ==========================================
// 8. GET CONNECTED STORE
// ==========================================

app.get("/api/stores/:sellerId", (req, res) => {
  const seller = connectedStores.get(req.params.sellerId);

  if (!seller) {
    return res.status(404).json({
      success: false,
      message: "Seller store not found"
    });
  }

  return res.json({
    success: true,
    seller
  });
});

// ==========================================
// 9. IMPORT PRODUCTS
// ==========================================

app.post("/api/stores/:sellerId/products/import", async (req, res) => {
  try {
    const { sellerId } = req.params;

    const seller = connectedStores.get(sellerId);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Connected seller not found"
      });
    }

    const html = await fetchWebsite(seller.storeUrl);

    const $ = cheerio.load(html);

    const productElements = $(
      ".product, .product-card, .product-details, [data-product-id]"
    ).filter(function () {
      return $(this).find("img").length > 0;
    });

    const products = [];

    productElements.each(function () {
      const element = $(this);

      const productId =
        element.attr("data-product-id") ||
        element.attr("data-id");

      const name = element
        .find("h1, h2, h3, .product-name")
        .first()
        .text()
        .trim();

      const imageSrc =
        element.find("img").first().attr("src") ||
        element.find("img").first().attr("data-src");

      const price =
        element.find(".price, [data-price]").first().text().trim() ||
        null;

      if (!productId || !name || !imageSrc) {
        return;
      }

      let image;

      try {
        image = new URL(imageSrc, seller.storeUrl).toString();
      } catch {
        return;
      }

      products.push({
        productId,
        name,
        image,
        price,
        category: null
      });
    });

    const uniqueProducts = [
      ...new Map(
        products.map(product => [product.productId, product])
      ).values()
    ];

    return res.json({
      success: true,
      message: "Products imported successfully",
      sellerId,
      totalProducts: uniqueProducts.length,
      products: uniqueProducts
    });

  } catch (error) {
    console.error("Product import error:", error);

    return res.status(400).json({
      success: false,
      message: "Unable to import products",
      error: error.message
    });
  }
});

// ==========================================
// 10. AI CLASSIFIER
// ==========================================

let classifierPromise = null;

async function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");

      return pipeline(
        "zero-shot-image-classification",
        "Xenova/clip-vit-base-patch32"
      );
    })().catch(error => {
      classifierPromise = null;
      throw error;
    });
  }

  return classifierPromise;
}

// ==========================================
// 11. AI CATEGORY DETECTION
// ==========================================

app.post("/api/products/detect-category", async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(400).json({
        success: false,
        message: "Product image URL is required"
      });
    }

    const parsedUrl = validateUrl(imageUrl);

    if (!parsedUrl) {
      return res.status(400).json({
        success: false,
        message: "Invalid image URL"
      });
    }

    console.log("AURELLE analysing image:", imageUrl);

    const classifier = await getClassifier();

    const labels = [
      "a necklace or chain jewellery worn around the neck",
      "a pair of earrings jewellery worn on the ears",
      "a ring jewellery worn on a finger",
      "a bangle or bracelet jewellery worn on the wrist",
      "a non-jewellery product"
    ];

    const predictions = await classifier(imageUrl, labels);

    const bestMatch = predictions[0];

    let category = null;

    if (bestMatch.label === labels[0]) {
      category = "Necklaces";
    } else if (bestMatch.label === labels[1]) {
      category = "Earrings";
    } else if (bestMatch.label === labels[2]) {
      category = "Rings";
    } else if (bestMatch.label === labels[3]) {
      category = "Bangles";
    }

    console.log("AURELLE prediction:", predictions);

    return res.json({
      success: true,
      category,
      confidence: bestMatch.score,
      predictions
    });

  } catch (error) {
    console.error("AURELLE AI error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to analyse product image",
      error: error.message
    });
  }
});

// ==========================================
// 12. START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`AURELLE server running on port ${PORT}`);
});
