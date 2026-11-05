import {
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";

import { useLocation } from "react-router-dom";
import TryOnChain from "../components/Try_on_chain";
import TryOnEarrings from "../components/Try_on_earrings";
import TryOnBangles from "../components/Try_on_bangles";
import "./Try_on.css";

// Categories that are drawn as chains on the neck.
// Defined outside the component so drawFrame stays stable.
const CHAIN_CATEGORIES = ["Chokers", "Chains", "Necklaces", "Harams"];

// Maps a category to a chain type, used as a fallback when a product
// (for example one passed from the homepage) has no chainType set.
const CATEGORY_TO_CHAIN_TYPE = {
  Chokers: "choker",
  Chains: "chain",
  Necklaces: "necklace",
  Harams: "haram",
};

// Category drawn on the ears
const EARRING_CATEGORY = "Earrings";

// Category drawn on the wrist (uses hand detection)
const BANGLE_CATEGORY = "Bangles";

// MediaPipe's legacy solutions (FaceMesh, Hands) share one global WASM loader.
// If two of them start downloading at the same time, one picks up the other's
// files and crashes. This queue makes their initialize() calls run one by one.
let initQueue = Promise.resolve();

function enqueueInit(task) {
  const run = initQueue.then(task);
  // Keep the queue moving even if one initialization fails
  initQueue = run.catch(() => {});
  return run;
}

// One shared FaceMesh instance for the whole page. Creating/closing several
// instances (React dev mode mounts effects twice) can crash the WASM engine.
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

    // Downloads the model files; resolves when the engine is ready
    sharedFaceMeshInit = enqueueInit(() => sharedFaceMesh.initialize());
  }

  return { faceMesh: sharedFaceMesh, ready: sharedFaceMeshInit };
}

// One shared Hands instance, for the same reason as FaceMesh above
let sharedHands = null;
let sharedHandsInit = null;

function getSharedHands() {
  if (!sharedHands) {
    sharedHands = new window.Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    sharedHands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    sharedHandsInit = enqueueInit(() => sharedHands.initialize());
  }

  return { hands: sharedHands, ready: sharedHandsInit };
}

function TryOn() {
  const location = useLocation();

  // References
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const faceMeshRef = useRef(null);
  const chainRef = useRef(null);
  const earringRef = useRef(null);
  const bangleRef = useRef(null);
  const handsRef = useRef(null);
  const lastHandsRef = useRef(null);
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
    location.state?.product?.category || "Chokers"
  );

  // Application states
  const [cameraActive, setCameraActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [handsScriptReady, setHandsScriptReady] = useState(false);
  const [handsReady, setHandsReady] = useState(false);
  const [showJewellery, setShowJewellery] = useState(true);
  const [mediaPipeReady, setMediaPipeReady] = useState(false);
  const [faceMeshReady, setFaceMeshReady] = useState(false);
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
    "Chokers",
    "Chains",
    "Necklaces",
    "Harams",
    "Earrings",
    "Bangles",
    "Rings",
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
    {
      id: 5,
      name: "Pearl Stud Earrings",
      category: "Earrings",
      earringType: "stud",
      price: "₹899",
      image: "/jewellery/pearl-stud.webp",
      overlayImage: "/jewellery/pearl-stud.webp",
    },
    {
      id: 6,
      name: "Gold Drop Earrings",
      category: "Earrings",
      earringType: "drop",
      price: "₹1,299",
      image: "/jewellery/gold-drop-earrings.webp",
      overlayImage: "/jewellery/gold-drop-earrings.webp",
    },
    {
      id: 7,
      name: "Temple Jhumka",
      category: "Earrings",
      earringType: "jhumka",
      price: "₹1,799",
      image: "/jewellery/temple-jhumka.webp",
      overlayImage: "/jewellery/temple-jhumka.webp",
    },
    {
      id: 8,
      name: "Gold Hoop Earrings",
      category: "Earrings",
      earringType: "hoop",
      price: "₹1,099",
      image: "/jewellery/gold-hoop.webp",
      overlayImage: "/jewellery/gold-hoop.webp",
    },
    {
      id: 9,
      name: "Slim Gold Bangle",
      category: "Bangles",
      bangleType: "thin",
      price: "₹1,199",
      image: "/jewellery/thin-bangle.webp",
      overlayImage: "/jewellery/thin-bangle.webp",
    },
    {
      id: 10,
      name: "Gold Bangle Set",
      category: "Bangles",
      bangleType: "set",
      price: "₹3,499",
      image: "/jewellery/gold-bangle-set.webp",
      overlayImage: "/jewellery/gold-bangle-set.webp",
    },
    {
      id: 11,
      name: "Ruby Emerald Kada",
      category: "Bangles",
      bangleType: "kada",
      price: "₹5,999",
      image: "/jewellery/kada-bangle.webp",
      overlayImage: "/jewellery/kada-bangle.webp",
    },
    {
      id: 12,
      name: "Pearl Bracelet",
      category: "Bangles",
      bangleType: "bracelet",
      price: "₹1,699",
      image: "/jewellery/pearl-bracelet.webp",
      overlayImage: "/jewellery/pearl-bracelet.webp",
    },
  ];

  // Only pass each overlay to the component that draws it
  const isChainSelected =
    !!selectedProduct && CHAIN_CATEGORIES.includes(selectedProduct.category);
  const isEarringSelected =
    !!selectedProduct && selectedProduct.category === EARRING_CATEGORY;
  const isBangleSelected =
    !!selectedProduct && selectedProduct.category === BANGLE_CATEGORY;

  const filteredProducts = sampleProducts.filter(
    (product) => product.category === selectedCategory
  );

  // Load MediaPipe from CDN
  useEffect(() => {
    let active = true;

    const handleLoad = () => {
      if (active && window.FaceMesh) {
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

  // Load the MediaPipe Hands script from CDN
  useEffect(() => {
    let active = true;

    const handleLoad = () => {
      if (active && window.Hands) {
        setHandsScriptReady(true);
      }
    };

    const handleError = () => {
      if (active) {
        setError("Unable to load hand detection. Bangles need it to work.");
      }
    };

    if (window.Hands) {
      setHandsScriptReady(true);
      return () => {
        active = false;
      };
    }

    let script = document.querySelector('script[data-mediapipe="hands"]');

    if (!script) {
      script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
      script.async = true;
      script.dataset.mediapipe = "hands";
      document.body.appendChild(script);
    }

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    if (window.Hands) {
      handleLoad();
    }

    return () => {
      active = false;
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
  }, []);

  // Draw video/photo and chain
  const drawFrame = useCallback((source, landmarks = null, hands = null) => {
    const canvas = canvasRef.current;

    if (!canvas || !source) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = source.videoWidth || source.naturalWidth || source.width;
    const height = source.videoHeight || source.naturalHeight || source.height;

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

    // Draw chain (choker / chain / necklace / haram) when a face is detected
    if (
      showJewelleryRef.current &&
      product &&
      CHAIN_CATEGORIES.includes(product.category) &&
      landmarks
    ) {
      const chainType =
        product.chainType ||
        CATEGORY_TO_CHAIN_TYPE[product.category] ||
        "necklace";

      chainRef.current?.drawNecklace(
        ctx,
        landmarks,
        width,
        height,
        chainType
      );
    }

    // Draw earrings when a face is detected
    if (
      showJewelleryRef.current &&
      product &&
      product.category === EARRING_CATEGORY &&
      landmarks
    ) {
      earringRef.current?.drawEarrings(
        ctx,
        landmarks,
        width,
        height,
        product.earringType || "drop"
      );
    }

    // Draw bangles on the wrist when a hand is detected
    if (
      showJewelleryRef.current &&
      product &&
      product.category === BANGLE_CATEGORY &&
      hands
    ) {
      bangleRef.current?.drawBangles(
        ctx,
        hands,
        width,
        height,
        product.bangleType || "thin"
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

  // Initialize FaceMesh after the CDN script loads, and wait for its models
  useEffect(() => {
    if (!mediaPipeReady || !window.FaceMesh) return;

    let cancelled = false;

    const init = async () => {
      try {
        const { faceMesh, ready } = getSharedFaceMesh();

        // Send results to this component's handler
        faceMesh.onResults(handleFaceResults);

        await ready;

        if (cancelled) return;

        faceMeshRef.current = faceMesh;
        setFaceMeshReady(true);
      } catch (err) {
        console.error("FaceMesh initialization error:", err);
        if (!cancelled) {
          setError(err.message || "FaceMesh initialization failed.");
        }
      }
    };

    init();

    return () => {
      cancelled = true;

      // Do not close() the shared instance; just detach this handler
      if (sharedFaceMesh) {
        sharedFaceMesh.onResults(() => {});
      }
    };
  }, [mediaPipeReady, handleFaceResults]);

  // Hand detection result handler
  const handleHandResults = useCallback((results) => {
    const source = lastSourceRef.current;

    if (!source) return;

    const hands = results.multiHandLandmarks || [];

    lastHandsRef.current = hands.length > 0 ? hands : null;
    setHandDetected(hands.length > 0);

    drawFrame(source, null, lastHandsRef.current);
  }, [drawFrame]);

  // Initialize Hands after its CDN script loads, and wait for its models
  useEffect(() => {
    if (!handsScriptReady || !window.Hands) return;

    let cancelled = false;

    const init = async () => {
      try {
        const { hands, ready } = getSharedHands();

        hands.onResults(handleHandResults);

        await ready;

        if (cancelled) return;

        handsRef.current = hands;
        setHandsReady(true);
      } catch (err) {
        console.error("Hands initialization error:", err);
        if (!cancelled) {
          setError(err.message || "Hand detection initialization failed.");
        }
      }
    };

    init();

    return () => {
      cancelled = true;

      if (sharedHands) {
        sharedHands.onResults(() => {});
      }
    };
  }, [handsScriptReady, handleHandResults]);

  // Redraw when the chain image finishes loading
  useEffect(() => {
    const redraw = () => {
      if (lastSourceRef.current) {
        drawFrame(
          lastSourceRef.current,
          lastLandmarksRef.current,
          lastHandsRef.current
        );
      }
    };

    window.addEventListener("necklace-image-loaded", redraw);
    window.addEventListener("earring-image-loaded", redraw);
    window.addEventListener("bangle-image-loaded", redraw);

    return () => {
      window.removeEventListener("necklace-image-loaded", redraw);
      window.removeEventListener("earring-image-loaded", redraw);
      window.removeEventListener("bangle-image-loaded", redraw);
    };
  }, [drawFrame]);

  // Run the detector the selected product needs:
  // hands for bangles, face for everything else
  const detect = useCallback(async (source) => {
    if (!source) return;

    const wantsHands =
      selectedProductRef.current?.category === BANGLE_CATEGORY;

    const engine = wantsHands ? handsRef.current : faceMeshRef.current;

    // Engine not ready yet: just show the plain frame
    if (!engine) {
      drawFrame(source, null, null);
      return;
    }

    lastSourceRef.current = source;
    await engine.send({ image: source });
  }, [drawFrame]);

  // Process webcam frames
  const processVideo = useCallback(async () => {
    if (
      !cameraActiveRef.current ||
      !videoRef.current ||
      (!faceMeshRef.current && !handsRef.current)
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
        await detect(videoRef.current);
      } catch (err) {
        console.error("Video processing error:", err);
      } finally {
        processingRef.current = false;
      }
    }

    if (cameraActiveRef.current) {
      animationRef.current = requestAnimationFrame(processVideo);
    }
  }, [detect]);

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

      if (!faceMeshReady || !faceMeshRef.current) {
        throw new Error("Face detection is still loading. Please try again.");
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

  // Wait until no frame is being processed by FaceMesh
  const waitForIdle = async () => {
    while (processingRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
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

    if (!faceMeshReady || !faceMeshRef.current) {
      setError("Face detection is still loading. Please try again.");
      return;
    }

    // Stop the webcam loop and let any frame in progress finish first.
    // Two simultaneous send() calls crash the MediaPipe engine.
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
        // Downscale large photos; huge images can crash the WASM engine
        const MAX_SIZE = 1280;
        const scale = Math.min(
          1,
          MAX_SIZE / Math.max(image.naturalWidth, image.naturalHeight)
        );

        const source = document.createElement("canvas");
        source.width = Math.round(image.naturalWidth * scale);
        source.height = Math.round(image.naturalHeight * scale);
        source
          .getContext("2d")
          .drawImage(image, 0, 0, source.width, source.height);

        await waitForIdle();

        processingRef.current = true;
        lastSourceRef.current = source;

        try {
          await detect(source);
        } finally {
          processingRef.current = false;
        }
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

  // Re-run detection on a still photo (used when the needed detector changes)
  const rerunOnStillImage = async () => {
    const source = lastSourceRef.current;

    // The webcam loop picks up the change by itself on the next frame
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
    const wasBangle =
      selectedProductRef.current?.category === BANGLE_CATEGORY;

    setSelectedCategory(category);
    setSelectedProduct(null);
    selectedProductRef.current = null;
    setShowJewellery(true);

    // Remove the previous jewellery from the preview right away
    if (lastSourceRef.current) {
      drawFrame(
        lastSourceRef.current,
        lastLandmarksRef.current,
        null
      );

      // Leaving bangles: a still photo needs face detection again
      if (wasBangle) {
        rerunOnStillImage();
      }
    }
  };

  // Select product
  const handleProductSelect = (product) => {
    const wasBangle =
      selectedProductRef.current?.category === BANGLE_CATEGORY;
    const isBangle = product.category === BANGLE_CATEGORY;

    setSelectedProduct(product);
    // Update the ref immediately so the redraw below uses the new product
    selectedProductRef.current = product;
    setSelectedCategory(product.category);
    setShowJewellery(true);
    showJewelleryRef.current = true;

    // Redraw current frame with newly selected product
    if (lastSourceRef.current) {
      drawFrame(
        lastSourceRef.current,
        lastLandmarksRef.current,
        lastHandsRef.current
      );

      // Switching between hand and face products needs a new detection
      if (wasBangle !== isBangle) {
        rerunOnStillImage();
      }
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
            necklaceImage={
              isChainSelected ? selectedProduct.overlayImage : null
            }
          />

          <TryOnEarrings
            ref={earringRef}
            earringImage={
              isEarringSelected ? selectedProduct.overlayImage : null
            }
          />

          <TryOnBangles
            ref={bangleRef}
            bangleImage={
              isBangleSelected ? selectedProduct.overlayImage : null
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
            {isBangleSelected
              ? handDetected
                ? "Hand detected"
                : "Hand not detected"
              : faceDetected
              ? "Face detected"
              : "Face not detected"}
          </div>
        </div>

        {error && (
          <p className="tryon-error">{error}</p>
        )}

        {isBangleSelected && !handsReady && (
          <p>Loading hand detection...</p>
        )}

        {!faceMeshReady && (
          <p>Loading face detection...</p>
        )}

        {/* Controls */}
        <div className="tryon-controls">
          <button
            onClick={startCamera}
            disabled={!faceMeshReady}
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
            disabled={!faceMeshReady}
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