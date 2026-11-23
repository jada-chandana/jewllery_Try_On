
import {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";

const TryOnRINGS = forwardRef(function TryOnRINGS(
  { ringImage },
  ref
) {
  const imageRef = useRef(null);

  // Load ring overlay image
  useEffect(() => {
    imageRef.current = null;

    if (!ringImage) return;

    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (cancelled) return;

      imageRef.current = image;

      window.dispatchEvent(
        new Event("ring-image-loaded")
      );
    };

    image.onerror = () => {
      console.error(
        "Unable to load ring image:",
        ringImage
      );
    };

    image.src = ringImage;

    return () => {
      cancelled = true;
      imageRef.current = null;
    };
  }, [ringImage]);

  useImperativeHandle(ref, () => ({
    drawRings(ctx, hands, width, height) {
      const image = imageRef.current;

      if (!ctx || !image || !hands?.length) return;

      if (!image.complete || !image.naturalWidth) return;

      hands.forEach((landmarks) => {
        if (!landmarks || landmarks.length < 21) return;

        // Correct MediaPipe ring finger landmarks
        const ringMCP = landmarks[13];
        const ringPIP = landmarks[14];

        // Mirror X coordinates to match the preview
        const mcpX = (1 - ringMCP.x) * width;
        const mcpY = ringMCP.y * height;

        const pipX = (1 - ringPIP.x) * width;
        const pipY = ringPIP.y * height;

        // Calculate finger direction
        const dx = pipX - mcpX;
        const dy = pipY - mcpY;

        const fingerLength = Math.hypot(dx, dy);

        if (fingerLength < 5) return;

        const angle = Math.atan2(dy, dx);

        // Estimate ring size from actual finger segment length
        const ringWidth = fingerLength * 0.75;

        const aspectRatio =
          image.naturalHeight / image.naturalWidth;

        const ringHeight = ringWidth * aspectRatio;

        // Position ring close to the base of ring finger
        const position = 0.32;

        const centerX = mcpX + dx * position;
        const centerY = mcpY + dy * position;

        ctx.save();

        ctx.translate(centerX, centerY);

        // Align the ring image with the finger
        ctx.rotate(angle + Math.PI / 2);

        ctx.drawImage(
          image,
          -ringWidth / 2,
          -ringHeight / 2,
          ringWidth,
          ringHeight
        );

        ctx.restore();
      });
    },
  }));

  return null;
});

export default TryOnRINGS;
