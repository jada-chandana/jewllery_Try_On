
import { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import "./Facescan.css";

export default function Facescan({ selectedProduct }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const faceMeshRef = useRef(null);
  const imageRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [error, setError] = useState("");

  // Draw the camera frame and face landmarks
  const onResults = (results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw live video
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const landmarks = results.multiFaceLandmarks?.[0];

    if (!landmarks) {
      setFaceDetected(false);
      return;
    }

    setFaceDetected(true);

    // Draw face tracking points for testing
    ctx.fillStyle = "#D4AF70";

    landmarks.forEach((point) => {
      ctx.beginPath();
      ctx.arc(
        point.x * canvas.width,
        point.y * canvas.height,
        1.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Jewellery overlay will be connected here next.
  };

  // Initialize Face Mesh
  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);
    faceMeshRef.current = faceMesh;

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }

      faceMesh.close();
      faceMeshRef.current = null;
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      setError("");

      if (!videoRef.current || !faceMeshRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: 640,
          height: 480,
        },
        audio: false,
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current && videoRef.current) {
            await faceMeshRef.current.send({
              image: videoRef.current,
            });
          }
        },
        width: 640,
        height: 480,
      });

      cameraRef.current = camera;
      camera.start();
      setCameraOn(true);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please allow camera permission.");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    const stream = videoRef.current?.srcObject;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    const ctx = canvasRef.current?.getContext("2d");

    if (ctx && canvasRef.current) {
      ctx.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
    }

    setCameraOn(false);
    setFaceDetected(false);
  };

  // Upload photo
  const handleUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    stopCamera();
    setError("");

    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);

    const image = new Image();

    image.onload = async () => {
      imageRef.current = image;

      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);

      try {
        await faceMeshRef.current.send({ image });
      } catch (err) {
        console.error("Photo face tracking error:", err);
        setError("Unable to process this photo.");
      }
    };

    image.src = imageUrl;
  };

  // Download preview
  const downloadImage = () => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "jewellery-tryon.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="facescan-container">
      <div className="facescan-heading">
        <span>VIRTUAL TRY-ON STUDIO</span>
        <h2>See how it looks on you</h2>
        <p>
          Position your face inside the frame to preview your jewellery.
        </p>
      </div>

      <div className="facescan-preview">
        <video
          ref={videoRef}
          className="facescan-hidden-video"
          playsInline
          muted
        />

        <canvas ref={canvasRef} className="facescan-canvas" />

        {!cameraOn && !uploadedImage && (
          <div className="facescan-placeholder">
            <div className="facescan-camera-icon">◎</div>
            <h3>Your preview appears here</h3>
            <p>Start your camera or upload a photo</p>
          </div>
        )}

        {cameraOn && (
          <div className="facescan-status">
            <span className={faceDetected ? "status-dot active" : "status-dot"} />
            {faceDetected ? "Face detected" : "Looking for your face..."}
          </div>
        )}
      </div>

      {selectedProduct && (
        <p className="facescan-product">
          Selected jewellery: <strong>{selectedProduct.name}</strong>
        </p>
      )}

      <div className="facescan-actions">
        {!cameraOn ? (
          <button onClick={startCamera} className="facescan-primary">
            ◎ Start Camera
          </button>
        ) : (
          <button onClick={stopCamera} className="facescan-stop">
            Stop Camera
          </button>
        )}

        <label className="facescan-upload">
          ↑ Upload Photo
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            hidden
          />
        </label>

        <button onClick={downloadImage} className="facescan-download">
          ↓ Download
        </button>
      </div>

      {error && <p className="facescan-error">{error}</p>}
    </div>
  );
}
