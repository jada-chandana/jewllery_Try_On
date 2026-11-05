
import {
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";

import { useLocation } from "react-router-dom";
import TryOnChain from "../components/Try_on_chain";
import "./Try_on.css";

function TryOn() {
  const location = useLocation();

  // References
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const faceMeshRef = useRef(null);
  const chainRef = useRef(null);
  const animationRef = useRef(null);
  const processingRef = useRef(false);
  const fileInputRef = useRef(null);
  const lastSourceRef = useRef(null);
  const lastLandmarksRef = useRef(null);
  const uploadedObjectUrlRef = useRef(null);

  // Product selected on homepage
  const [selectedProduct, setSelectedProduct] = useState(
    location.state?.product || null
  );

  const [selectedCategory, setSelectedCategory] = useState(
    location.state?.product?.category || "Necklaces"
  );

  // Application states
  const [cameraActive, setCameraActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [showJewellery, setShowJewellery] = useState(true);
  const [mediaPipeReady, setMediaPipeReady] = useState(false);
  const [error, setError] = useState("");

  // Keep current values available to stable callbacks
  const selectedProductRef = useRef(selectedProduct);
  const showJewelleryRef = useRef(showJewellery);
  const cameraActiveRef = useRef(false);

  useEffect(() => {
    selectedProductRef.current = selectedProduct;
  }, [selectedProduct]);

  useEffect(() => {
    showJewelleryRef.current = showJewellery;
  }, [showJewellery]);

  // Categories
  const categories = [
    "Necklaces",
    "Earrings",
    "Bangles",
    "Rings",
  ];

  // Sample necklace products
  const sampleProducts = [
    {
      id: 1,
      name: "Royal Pearl Necklace",
      category: "Necklaces",
      price: "₹2,499",
      image: "/jewellery/royal-pearl-necklace.webp",
      overlayImage: "/jewellery/royal-pearl-necklace.webp",
    },
    {
      id: 2,
      name: "Elegant Gold Necklace",
      category: "Necklaces",
      price: "₹1,999",
      image: "/jewellery/royal-pearl-necklace.webp",
      overlayImage: "/jewellery/royal-pearl-necklace.webp",
    },
  ];

  const filteredProducts = sampleProducts.filter(
    (product) => product.category === selectedCategory
  );

  // Load MediaPipe from CDN
  useEffect(() => {
    let active = true;

    const handleLoad = () => {
      if (active && window.FaceMesh) {
        console.log("MediaPipe loaded successfully!");
        setMediaPipeReady(true);
      }
    };

    const handleError = () => {
      if (active) {
        setError("Unable to load MediaPipe. Check your internet connection.");
      }
    };

    // Already loaded
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

    // Handle a script that completed loading before listeners were attached
    if (window.FaceMesh) {
      handleLoad();
    }

    return () => {
      active = false;
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
  }, []);

  // Draw video/photo and necklace
  const drawFrame = useCallback((source, landmarks = null) => {
    const canvas = canvasRef.current;

    if (!canvas || !source) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = source.videoWidth || source.naturalWidth;
    const height = source.videoHeight || source.naturalHeight;

    if (!width || !height) return;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    // Mirror the camera/photo preview
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, 0, 0, width, height);
    ctx.restore();

    const product = selectedProductRef.current;

    // Draw necklace when a face is detected
    if (
      showJewelleryRef.current &&
      product?.category === "Necklaces" &&
      landmarks
    ) {
      chainRef.current?.drawNecklace(
        ctx,
        landmarks,
        width,
        height
      );
    }
  }, []);

  // MediaPipe result handler
  const handleFaceResults = useCallback((results) => {
    const source = lastSourceRef.current;

    if (!source) return;

    const landmarks = results.multiFaceLandmarks?.[0];

    if (!landmarks) {
      lastLandmarksRef.current = null;
      setFaceDetected(false);
      drawFrame(source, null);
      return;
    }

    lastLandmarksRef.current = landmarks;
    setFaceDetected(true);

    drawFrame(source, landmarks);
  }, [drawFrame]);

  // Initialize FaceMesh after CDN script loads
  useEffect(() => {
    if (!mediaPipeReady || !window.FaceMesh) return;

    console.log("Initializing FaceMesh...");

    let faceMesh;

    try {
      faceMesh = new window.FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      faceMesh.onResults(handleFaceResults);

      faceMeshRef.current = faceMesh;

      console.log("FaceMesh initialized successfully!");
    } catch (err) {
      console.error("FaceMesh initialization error:", err);
      setError(err.message || "FaceMesh initialization failed.");
    }

    return () => {
      if (faceMesh) {
        faceMesh.close();
      }

      if (faceMeshRef.current === faceMesh) {
        faceMeshRef.current = null;
      }
    };
  }, [mediaPipeReady, handleFaceResults]);

  // Redraw when necklace image finishes loading
  useEffect(() => {
    const redraw = () => {
      if (lastSourceRef.current) {
        drawFrame(
          lastSourceRef.current,
          lastLandmarksRef.current
        );
      }
    };

    window.addEventListener("necklace-image-loaded", redraw);

    return () => {
      window.removeEventListener("necklace-image-loaded", redraw);
    };
  }, [drawFrame]);

  // Process webcam frames
  const processVideo = useCallback(async () => {
    if (
      !cameraActiveRef.current ||
      !videoRef.current ||
      !faceMeshRef.current
    ) {
      return;
    }

    if (processingRef.current) {
      animationRef.current = requestAnimationFrame(processVideo);
      return;
    }

    if (videoRef.current.readyState >= 2) {
      try {
        processingRef.current = true;
        lastSourceRef.current = videoRef.current;

        await faceMeshRef.current.send({
          image: videoRef.current,
        });
      } catch (err) {
        console.error("Video processing error:", err);
      } finally {
        processingRef.current = false;
      }
    }

    if (cameraActiveRef.current) {
      animationRef.current = requestAnimationFrame(processVideo);
    }
  }, []);

  // Start/stop animation loop
  useEffect(() => {
    if (cameraActive) {
      animationRef.current = requestAnimationFrame(processVideo);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [cameraActive, processVideo]);

  // Start camera
  const startCamera = async () => {
    try {
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }

      if (!faceMeshRef.current) {
        throw new Error("MediaPipe is still loading. Please try again.");
      }

      // Stop any previous stream
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
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

      cameraActiveRef.current = true;

      setUploadedImage(null);
      setFaceDetected(false);
      setCameraActive(true);

      console.log("Camera started successfully.");
    } catch (err) {
      console.error("Camera error:", err);
      setError(err.message || "Unable to start camera.");
    }
  };

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

  // Upload photo
  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Allow selecting the same file again
    event.target.value = "";

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must be below 10 MB.");
      return;
    }

    if (!faceMeshRef.current) {
      setError("MediaPipe is not initialized yet.");
      return;
    }

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
      lastSourceRef.current = image;

      try {
        await faceMeshRef.current.send({
          image,
        });
      } catch (err) {
        console.error("Photo processing error:", err);
        setError(err.message || "Unable to process uploaded photo.");
      }
    };

    image.onerror = () => {
      setError("Unable to load the uploaded image.");
    };

    image.src = imageUrl;
  };

  // Capture current canvas result
  const capturePhoto = () => {
    if (!canvasRef.current) return;

    const imageUrl = canvasRef.current.toDataURL("image/png");

    setUploadedImage(imageUrl);
    stopCamera();
  };

  // Download final result
  const downloadPhoto = () => {
    if (!canvasRef.current) return;

    const link = document.createElement("a");

    link.download = "aurelle-virtual-try-on.png";
    link.href = canvasRef.current.toDataURL("image/png");

    link.click();
  };

  // Select category
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedProduct(null);
    setShowJewellery(true);
    lastLandmarksRef.current = null;

    if (lastSourceRef.current) {
      drawFrame(lastSourceRef.current, null);
    }
  };

  // Select product
  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setSelectedCategory(product.category);
    setShowJewellery(true);

    // Redraw current frame with newly selected product
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

          <TryOnChain
            ref={chainRef}
            necklaceImage={selectedProduct?.overlayImage}
          />

          <div className="camera-status">
            {cameraActive
              ? "Camera Active"
              : uploadedImage
              ? "Photo Uploaded"
              : "Camera Inactive"}
          </div>

          <div className="face-status">
            {faceDetected ? "Face detected" : "Face not detected"}
          </div>
        </div>

        {error && (
          <p className="tryon-error">{error}</p>
        )}

        {!mediaPipeReady && (
          <p>Loading face detection...</p>
        )}

        {/* Controls */}
        <div className="tryon-controls">
          <button
            onClick={startCamera}
            disabled={!mediaPipeReady}
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
            disabled={!mediaPipeReady}
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

          <button
            onClick={() => {
              setShowJewellery((previous) => !previous);
            }}
          >
            {showJewellery ? "Hide Jewellery" : "Show Jewellery"}
          </button>
        </div>

        {/* Products */}
        <div className="product-section">
          <h2>Select Jewellery</h2>

          <div className="category-list">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={
                  selectedCategory === category ? "active" : ""
                }
              >
                {category}
              </button>
            ))}
          </div>

          <div className="product-list">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div className="product-card" key={product.id}>
                  <img
                    src={product.image}
                    alt={product.name}
                    width="120"
                  />

                  <h3>{product.name}</h3>
                  <p>{product.price}</p>

                  <button
                    onClick={() => handleProductSelect(product)}
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
      </div>
    </div>
  );
}

export default TryOn;
