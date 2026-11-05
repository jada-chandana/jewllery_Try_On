
import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

const TryOnChain = forwardRef(function TryOnChain(
  { necklaceImage },
  ref
) {
  const imageRef = useRef(null);
  const [unused] = [];

  useEffect(() => {
    console.log("========== NECKLACE IMAGE ==========");
    console.log("Image path:", necklaceImage);

    imageRef.current = null;

    if (!necklaceImage) {
      console.warn("No necklace image selected.");
      return;
    }

    const image = new Image();

    image.onload = () => {
      imageRef.current = image;

      console.log("Necklace image loaded!");
      console.log("Width:", image.naturalWidth);
      console.log("Height:", image.naturalHeight);

      // Notify the parent that the overlay is ready.
      window.dispatchEvent(new Event("necklace-image-loaded"));
    };

    image.onerror = (error) => {
      console.error("NECKLACE IMAGE ERROR:", error);
      console.error("Check public image path:", necklaceImage);
    };

    image.src = necklaceImage;

    return () => {
      imageRef.current = null;
    };
  }, [necklaceImage]);

  useImperativeHandle(ref, () => ({
    drawNecklace(ctx, landmarks, width, height) {
      console.log("========== DRAW NECKLACE ==========");

      const image = imageRef.current;

      if (!ctx) {
        console.error("Canvas context is missing.");
        return;
      }

      if (!image || !image.complete || !image.naturalWidth) {
        console.warn("Necklace image is not ready.");
        return;
      }

      if (!landmarks || landmarks.length < 455) {
        console.warn("Face landmarks are incomplete.");
        return;
      }

      const leftJaw = landmarks[234];
      const rightJaw = landmarks[454];
      const chin = landmarks[152];

      // Mirror the landmark positions to match the mirrored canvas.
      const leftX = (1 - rightJaw.x) * width;
      const rightX = (1 - leftJaw.x) * width;

      const leftY = rightJaw.y * height;
      const rightY = leftJaw.y * height;

      const chinX = (1 - chin.x) * width;
      const chinY = chin.y * height;

      const faceWidth = Math.hypot(
        rightX - leftX,
        rightY - leftY
      );

      const necklaceWidth = faceWidth * 1.65;
      const necklaceHeight =
        necklaceWidth * (image.naturalHeight / image.naturalWidth);

      const centerX = (leftX + rightX) / 2;
      const centerY = chinY + faceWidth * 0.30;

      const angle = Math.atan2(
        rightY - leftY,
        rightX - leftX
      );

      console.log("Necklace position:", centerX, centerY);
      console.log("Necklace dimensions:", necklaceWidth, necklaceHeight);

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);

      ctx.drawImage(
        image,
        -necklaceWidth / 2,
        0,
        necklaceWidth,
        necklaceHeight
      );

      ctx.restore();

      console.log("Necklace rendered successfully.");
    },
  }));

  return null;
});

export default TryOnChain;
