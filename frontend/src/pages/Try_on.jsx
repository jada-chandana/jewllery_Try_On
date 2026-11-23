
import {
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";

import { useLocation } from "react-router-dom";
import TryOnChain from "../components/Try_on_chain";
import { removeBackground } from "../utils/removeBackground";
import "./Try_on.css";

// Only supported jewellery categories
const CHAIN_CATEGORIES = [
  "Chains",
  "Necklaces",
  "Chokers",
  "Harams",
];

const CATEGORY_TO_CHAIN_TYPE = {
  Chains: "chain",
  Necklaces: "necklace",
  Chokers: "choker",
  Harams: "haram",
};

// MediaPipe initialization queue
let initQueue = Promise.resolve();

function enqueueInit(task) {
  const run = initQueue.then(task);
  initQueue = run.catch(() => {});
  return run;
}

// Shared FaceMesh instance
let sharedFaceMesh = null;
let sharedFaceMeshInit = null;

function getSharedFaceMesh() {
  if (!sharedFaceMesh) {
    sharedFaceMesh = new window.FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    sharedFaceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    sharedFaceMeshInit = enqueueInit(() =>
      sharedFaceMesh.initialize()
    );
  }

  return {
    faceMesh: sharedFaceMesh,
    ready: sharedFaceMeshInit,
  };
}

function TryOn() {
  const location = useLocation();

  // Element references
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const faceMeshRef = useRef(null);
  const chainRef = useRef(null);

  // Processing references
  const animationRef = useRef(null);
  const processingRef = useRef(false);
  const fileInputRef = useRef(null);
  const lastSourceRef = useRef(null);
  const lastLandmarksRef = useRef(null);
  const uploadedObjectUrlRef = useRef(null);

  // Selected product
  const [selectedProduct, setSelectedProduct] = useState(
    location.state?.product || null
  );

  const [selectedCategory, setSelectedCategory] = useState(
    location.state?.product?.category || "Chokers"
  );

  // Application states
  const [cameraActive, setCameraActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [mediaPipeReady, setMediaPipeReady] = useState(false);
  const [faceMeshReady, setFaceMeshReady] = useState(false);
  const [showJewellery, setShowJewellery] = useState(true);
  const [error, setError] = useState("");

  // Stable references
  const selectedProductRef = useRef(selectedProduct);
  const showJewelleryRef = useRef(showJewellery);
  const cameraActiveRef = useRef(false);

  useEffect(() => {
    selectedProductRef.current = selectedProduct;
  }, [selectedProduct]);

  useEffect(() => {
    showJewelleryRef.current = showJewellery;
  }, [showJewellery]);

  // Supported categories
  const categories = [
    "Chokers",
    "Chains",
    "Necklaces",
    "Harams",
  ];

  // Sample products
  const sampleProducts = [
    {
      id: 1,
      name: "Pearl Choker",
      category: "Chokers",
      chainType: "choker",
      price: "₹1,499",
      image: "/jewellery/pearl-choker.webp",
      overlayImage: "/jewellery/pearl-choker.webp",
    },
    {
      id: 2,
      name: "Gold Chain",
      category: "Chains",
      chainType: "chain",
      price: "₹1,999",
      image: "/jewellery/gold-chain.webp",
      overlayImage: "/jewellery/gold-chain.webp",
    },
    {
      id: 3,
      name: "Royal Pearl Necklace",
      category: "Necklaces",
      chainType: "necklace",
      price: "₹2,499",
      image: "/jewellery/royal-pearl-necklace.webp",
      overlayImage: "/jewellery/royal-pearl-necklace.webp",
    },
    {
      id: 4,
      name: "Temple Haram",
      category: "Harams",
      chainType: "haram",
      price: "₹4,999",
      image: "/jewellery/temple-haram.webp",
      overlayImage: "/jewellery/temple-haram.webp",
    },
  ];

  // Seller website integration
  const searchParams = new URLSearchParams(location.search);

  const sellerMode =
    searchParams.has("productName") ||
    searchParams.has("productImage");

  useEffect(() => {
    if (!sellerMode) return;

    let active = true;
    let processedImageUrl = null;

    const sellerName =
      searchParams.get("productName") || "Seller Product";

    const sellerCategory =
      searchParams.get("category") || "";

    const sellerImage =
      searchParams.get("productImage") || "";

    const sellerId =
      searchParams.get("productId") || "seller-product";

    const normalizeCategory = (value) => {
      const category = value.toLowerCase();

      if (/choker/.test(category)) return "Chokers";
      if (/haram/.test(category)) return "Harams";
      if (/chain/.test(category)) return "Chains";
      if (/necklace/.test(category)) return "Necklaces";

      return "";
    };

    const category = normalizeCategory(sellerCategory);

    if (!CHAIN_CATEGORIES.includes(category)) {
      setSelectedProduct(null);
      selectedProductRef.current = null;
      setError(
        "Only Chains, Necklaces, Chokers and Harams are supported."
      );
      return;
    }

    if (!sellerImage) {
      setError("Seller product image is missing.");
      return;
    }

    const product = {
      id: sellerId,
      name: sellerName,
      category,
      chainType: CATEGORY_TO_CHAIN_TYPE[category],
      image: sellerImage,
      overlayImage: null,
    };

    setSelectedProduct(product);
    selectedProductRef.current = product;
    setSelectedCategory(category);

    setShowJewellery(true);
    showJewelleryRef.current = true;

    const prepareProductImage = async () => {
      try {
        setError("Removing product image background...");

        const transparentImage = await removeBackground(
          sellerImage,
          ({ progress }) => {
            if (active) {
              setError(
                `Preparing jewellery image... ${Math.round(
                  (progress || 0) * 100
                )}%`
              );
            }
          }
        );

        if (!active) {
          URL.revokeObjectURL(transparentImage);
          return;
        }

        processedImageUrl = transparentImage;

        const readyProduct = {
          ...product,
          overlayImage: transparentImage,
        };

        setSelectedProduct(readyProduct);
        selectedProductRef.current = readyProduct;

        setError("");

        console.log(
          "AURELLE transparent seller product:",
          readyProduct
        );
      } catch (err) {
        console.error("Background removal error:", err);

        if (active) {
          setError(
            err.message || "Unable to remove product background."
          );
        }
      }
    };

    prepareProductImage();

    return () => {
      active = false;

      if (processedImageUrl) {
        URL.revokeObjectURL(processedImageUrl);
      }
    };
  }, [location.search, sellerMode]);

  // Check supported product
  const isChainSelected =
    !!selectedProduct &&
    CHAIN_CATEGORIES.includes(selectedProduct.category);

  const canStartCamera = faceMeshReady;

  // Filter products
  const filteredProducts = sampleProducts.filter(
    (product) => product.category === selectedCategory
  );

  // Load FaceMesh script
  useEffect(() => {
    let active = true;

    const handleLoad = () => {
      if (active && window.FaceMesh) {
        setMediaPipeReady(true);
      }
    };

    const handleError = () => {
      if (active) {
        setError(
          "Unable to load FaceMesh. Check your internet connection."
        );
      }
    };

    if (window.FaceMesh) {
      setMediaPipeReady(true);

      return () => {
        active = false;
      };
    }

    let script = document.querySelector(
      'script[data-mediapipe="face-mesh"]'
    );

    if (!script) {
      script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
      script.async = true;
      script.dataset.mediapipe = "face-mesh";
      document.body.appendChild(script);
    }

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    if (window.FaceMesh) handleLoad();

    return () => {
      active = false;
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
  }, []);

  // Draw camera/photo and supported jewellery
  const drawFrame = useCallback((source, landmarks = null) => {
    const canvas = canvasRef.current;

    if (!canvas || !source) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width =
      source.videoWidth ||
      source.naturalWidth ||
      source.width;

    const height =
      source.videoHeight ||
      source.naturalHeight ||
      source.height;

    if (!width || !height) return;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    // Mirror preview
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, 0, 0, width, height);
    ctx.restore();

    const product = selectedProductRef.current;

    // Strict category restriction
    if (
      !showJewelleryRef.current ||
      !product ||
      !CHAIN_CATEGORIES.includes(product.category) ||
      !landmarks
    ) {
      return;
    }

    const chainType =
      CATEGORY_TO_CHAIN_TYPE[product.category];

    chainRef.current?.drawNecklace(
      ctx,
      landmarks,
      width,
      height,
      chainType
    );
  }, []);

  // FaceMesh result handler
  const handleFaceResults = useCallback(
    (results) => {
      const source = lastSourceRef.current;
      if (!source) return;

      const landmarks =
        results.multiFaceLandmarks?.[0] || null;

      lastLandmarksRef.current = landmarks;
      setFaceDetected(!!landmarks);

      drawFrame(source, landmarks);
    },
    [drawFrame]
  );

  // Initialize FaceMesh
  useEffect(() => {
    if (!mediaPipeReady || !window.FaceMesh) return;

    let cancelled = false;

    const init = async () => {
      try {
        const { faceMesh, ready } = getSharedFaceMesh();

        faceMesh.onResults(handleFaceResults);

        await ready;

        if (cancelled) return;

        faceMeshRef.current = faceMesh;
        setFaceMeshReady(true);
      } catch (err) {
        console.error("FaceMesh initialization error:", err);

        if (!cancelled) {
          setError(
            err.message || "FaceMesh initialization failed."
          );
        }
      }
    };

    init();

    return () => {
      cancelled = true;

      if (sharedFaceMesh) {
        sharedFaceMesh.onResults(() => {});
      }
    };
  }, [mediaPipeReady, handleFaceResults]);

  // Run detector
  const detect = useCallback(
    async (source) => {
      if (!source) return;

      lastSourceRef.current = source;

      const engine = faceMeshRef.current;

      if (!engine) {
        drawFrame(source, null);
        return;
      }

      await engine.send({ image: source });
    },
    [drawFrame]
  );

  // Webcam processing loop
  const processVideo = useCallback(async () => {
    if (
      !cameraActiveRef.current ||
      !videoRef.current ||
      !faceMeshRef.current
    ) {
      return;
    }

    if (processingRef.current) {
      animationRef.current =
        requestAnimationFrame(processVideo);
      return;
    }

    if (videoRef.current.readyState >= 2) {
      try {
        processingRef.current = true;
        await detect(videoRef.current);
      } catch (err) {
        console.error("Video processing error:", err);
      } finally {
        processingRef.current = false;
      }
    }

    if (cameraActiveRef.current) {
      animationRef.current =
        requestAnimationFrame(processVideo);
    }
  }, [detect]);

  // Animation loop
  useEffect(() => {
    if (cameraActive) {
      animationRef.current =
        requestAnimationFrame(processVideo);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [cameraActive, processVideo]);

  // Stop camera
  const stopCamera = () => {
    cameraActiveRef.current = false;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  // Start camera
  const startCamera = async () => {
    try {
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera API is not supported in this browser."
        );
      }

      if (!faceMeshReady || !faceMeshRef.current) {
        throw new Error(
          "Face detection is still loading. Please try again."
        );
      }

      stopCamera();

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: 1280,
            height: 720,
          },
          audio: false,
        });

      streamRef.current = stream;

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      lastSourceRef.current = videoRef.current;
      lastLandmarksRef.current = null;

      setFaceDetected(false);
      setUploadedImage(null);

      cameraActiveRef.current = true;
      setCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);
      setError(err.message || "Unable to start camera.");
    }
  };

  // Wait for processing
  const waitForIdle = async () => {
    while (processingRef.current) {
      await new Promise((resolve) =>
        setTimeout(resolve, 20)
      );
    }
  };

  // Upload photo
  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    event.target.value = "";

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must be below 10 MB.");
      return;
    }

    if (!faceMeshReady || !faceMeshRef.current) {
      setError(
        "Face detection is still loading. Please try again."
      );
      return;
    }

    cameraActiveRef.current = false;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    await waitForIdle();
    stopCamera();

    setError("");
    setFaceDetected(false);
    lastLandmarksRef.current = null;

    if (uploadedObjectUrlRef.current) {
      URL.revokeObjectURL(uploadedObjectUrlRef.current);
    }

    const imageUrl = URL.createObjectURL(file);
    uploadedObjectUrlRef.current = imageUrl;

    setUploadedImage(imageUrl);

    const image = new Image();

    image.onload = async () => {
      try {
        const MAX_SIZE = 1280;

        const scale = Math.min(
          1,
          MAX_SIZE /
            Math.max(
              image.naturalWidth,
              image.naturalHeight
            )
        );

        const source = document.createElement("canvas");

        source.width = Math.round(
          image.naturalWidth * scale
        );

        source.height = Math.round(
          image.naturalHeight * scale
        );

        source
          .getContext("2d")
          .drawImage(
            image,
            0,
            0,
            source.width,
            source.height
          );

        await waitForIdle();

        processingRef.current = true;

        try {
          await detect(source);
        } finally {
          processingRef.current = false;
        }
      } catch (err) {
        console.error("Photo processing error:", err);

        setError(
          err.message || "Unable to process uploaded photo."
        );
      }
    };

    image.onerror = () => {
      setError("Unable to load the uploaded image.");
    };

    image.src = imageUrl;
  };

  // Capture photo
  const capturePhoto = () => {
    if (!canvasRef.current || !cameraActiveRef.current) return;

    const imageUrl =
      canvasRef.current.toDataURL("image/png");

    setUploadedImage(imageUrl);
    stopCamera();
  };

  // Download result
  const downloadPhoto = () => {
    if (!canvasRef.current) return;

    const link = document.createElement("a");

    link.download = "aurelle-virtual-try-on.png";
    link.href =
      canvasRef.current.toDataURL("image/png");

    link.click();
  };

  // Re-run detector on uploaded photo
  const rerunOnStillImage = async () => {
    const source = lastSourceRef.current;

    if (!source || cameraActiveRef.current) return;

    await waitForIdle();

    processingRef.current = true;

    try {
      await detect(source);
    } catch (err) {
      console.error("Detection error:", err);
    } finally {
      processingRef.current = false;
    }
  };

  // Select category
  const handleCategoryChange = (category) => {
    if (!CHAIN_CATEGORIES.includes(category)) return;

    setSelectedCategory(category);
    setSelectedProduct(null);
    selectedProductRef.current = null;

    setShowJewellery(true);
    showJewelleryRef.current = true;

    setFaceDetected(false);

    if (lastSourceRef.current) {
      drawFrame(lastSourceRef.current, null);
    }
  };

  // Select product
  const handleProductSelect = (product) => {
    if (
      !product ||
      !CHAIN_CATEGORIES.includes(product.category)
    ) {
      return;
    }

    setSelectedProduct(product);
    selectedProductRef.current = product;

    setSelectedCategory(product.category);

    setShowJewellery(true);
    showJewelleryRef.current = true;

    if (lastSourceRef.current) {
      drawFrame(
        lastSourceRef.current,
        lastLandmarksRef.current
      );

      if (!cameraActiveRef.current) {
        rerunOnStillImage();
      }
    }
  };

  // Toggle jewellery visibility
  const toggleJewellery = () => {
    const nextValue = !showJewelleryRef.current;

    showJewelleryRef.current = nextValue;
    setShowJewellery(nextValue);

    if (lastSourceRef.current) {
      drawFrame(
        lastSourceRef.current,
        lastLandmarksRef.current
      );
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      cameraActiveRef.current = false;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }

      if (uploadedObjectUrlRef.current) {
        URL.revokeObjectURL(uploadedObjectUrlRef.current);
      }
    };
  }, []);

  return (
    <div className="tryon-page">
      <div className="tryon-header">
        <h1>AURELLE VIRTUAL TRY-ON</h1>
        <p>Experience jewellery before you buy.</p>
      </div>

      <div className="tryon-container">

        {/* Preview */}
        <div className="tryon-preview">

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ display: "none" }}
          />

          <canvas
            ref={canvasRef}
            className="capture-canvas"
            style={{
              width: "100%",
              maxWidth: "700px",
              display: "block",
              background: "#eee",
            }}
          />

          {!cameraActive && !uploadedImage && (
            <div className="preview-placeholder">
              <h2>Virtual Jewellery Try-On</h2>
              <p>Start your camera or upload a photo.</p>
            </div>
          )}

          {/* Only Chains, Necklaces, Chokers and Harams */}
          <TryOnChain
            ref={chainRef}
            necklaceImage={
              isChainSelected
                ? selectedProduct?.overlayImage
                : null
            }
          />

          <div className="camera-status">
            {cameraActive
              ? "Camera Active"
              : uploadedImage
              ? "Photo Uploaded"
              : "Camera Inactive"}
          </div>

          <div className="face-status">
            {faceDetected
              ? "Face detected"
              : "Face not detected"}
          </div>

        </div>

        {error && (
          <p className="tryon-error">{error}</p>
        )}

        {!faceMeshReady && (
          <p>Loading face detection...</p>
        )}

        {/* Controls */}
        <div className="tryon-controls">

          <button
            onClick={startCamera}
            disabled={!canStartCamera}
          >
            Start Camera
          </button>

          <button
            onClick={capturePhoto}
            disabled={!cameraActive}
          >
            Capture Photo
          </button>

          <button onClick={stopCamera}>
            Stop Camera
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!canStartCamera}
          >
            Upload Photo
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhotoUpload}
          />

          <button
            onClick={downloadPhoto}
            disabled={!cameraActive && !uploadedImage}
          >
            Download Result
          </button>

          <button onClick={toggleJewellery}>
            {showJewellery
              ? "Hide Jewellery"
              : "Show Jewellery"}
          </button>

        </div>

        {/* Catalogue hidden in seller mode */}
        {!sellerMode && (
          <div className="product-section">

            <h2>Select Jewellery</h2>

            <div className="category-list">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() =>
                    handleCategoryChange(category)
                  }
                  className={
                    selectedCategory === category
                      ? "active"
                      : ""
                  }
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="product-list">

              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <div
                    className="product-card"
                    key={product.id}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      width="120"
                    />

                    <h3>{product.name}</h3>
                    <p>{product.price}</p>

                    <button
                      onClick={() =>
                        handleProductSelect(product)
                      }
                    >
                      Select Product
                    </button>
                  </div>
                ))
              ) : (
                <p>
                  No {selectedCategory.toLowerCase()} products available yet.
                </p>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default TryOn;
