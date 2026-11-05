import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

// Placement settings per bangle type
// widthScale : bangle width relative to the hand size (palm width)
// offset     : distance from the wrist towards the elbow, relative to hand size
const BANGLE_CONFIG = {
  thin:     { widthScale: 0.95, offset: 0.12 },
  set:      { widthScale: 0.95, offset: 0.14 },
  kada:     { widthScale: 1.00, offset: 0.16 },
  bracelet: { widthScale: 0.92, offset: 0.10 },
};

// Hand landmark indexes (MediaPipe Hands)
const WRIST = 0;
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;
const PINKY_MCP = 17;

// Set to true to draw dots on the wrist anchor while tuning
const DEBUG_POINTS = false;

// Crop fully transparent edges so sizing depends only on the visible jewellery
function trimTransparent(image) {
  try {
    const w = image.naturalWidth;
    const h = image.naturalHeight;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);

    const { data } = ctx.getImageData(0, 0, w, h);

    let minX = w, minY = h, maxX = -1, maxY = -1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 12) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < 0) return image;
    if (minX === 0 && minY === 0 && maxX === w - 1 && maxY === h - 1) {
      return image;
    }

    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;

    const out = document.createElement("canvas");
    out.width = cw;
    out.height = ch;
    out.getContext("2d").drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);

    return out;
  } catch (err) {
    console.warn("Could not trim image:", err);
    return image;
  }
}

const TryOnBangles = forwardRef(function TryOnBangles({ bangleImage }, ref) {
  const imageRef = useRef(null);

  useEffect(() => {
    imageRef.current = null;

    if (!bangleImage) return;

    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (cancelled) return;
      imageRef.current = trimTransparent(image);
      window.dispatchEvent(new Event("bangle-image-loaded"));
    };

    image.onerror = () => {
      console.error("Bangle image failed to load:", bangleImage);
    };

    image.src = bangleImage;

    return () => {
      cancelled = true;
      imageRef.current = null;
    };
  }, [bangleImage]);

  useImperativeHandle(ref, () => ({
    // hands: array of landmark arrays, one per detected hand
    drawBangles(ctx, hands, width, height, bangleType = "thin") {
      const image = imageRef.current;
      if (!ctx || !image || !hands || hands.length === 0) return;

      const srcW = image.naturalWidth || image.width;
      const srcH = image.naturalHeight || image.height;
      if (!srcW || !srcH) return;

      const config = BANGLE_CONFIG[bangleType] || BANGLE_CONFIG.thin;

      for (const hand of hands) {
        if (!hand || hand.length < 21) continue;

        // Mirror x to match the mirrored canvas
        const point = (index) => ({
          x: (1 - hand[index].x) * width,
          y: hand[index].y * height,
        });

        const wrist = point(WRIST);
        const indexMcp = point(INDEX_MCP);
        const middleMcp = point(MIDDLE_MCP);
        const pinkyMcp = point(PINKY_MCP);

        // Hand size: palm width, or palm length when the hand is turned sideways
        const palmWidth = Math.hypot(
          indexMcp.x - pinkyMcp.x,
          indexMcp.y - pinkyMcp.y
        );
        const palmLength = Math.hypot(
          wrist.x - middleMcp.x,
          wrist.y - middleMcp.y
        );
        const handSize = Math.max(palmWidth, palmLength * 0.75);

        if (handSize < 10) continue;

        // Direction from the hand towards the elbow
        const elbowX = (wrist.x - middleMcp.x) / Math.max(palmLength, 1);
        const elbowY = (wrist.y - middleMcp.y) / Math.max(palmLength, 1);

        // The bangle runs across the wrist, parallel to the knuckle line
        const angle = Math.atan2(
          pinkyMcp.y - indexMcp.y,
          pinkyMcp.x - indexMcp.x
        );

        // After rotating, the image's "down" direction is (-sin, cos).
        // Flip it if needed so the front arc bulges towards the elbow.
        const downX = -Math.sin(angle);
        const downY = Math.cos(angle);
        const flip = downX * elbowX + downY * elbowY < 0 ? -1 : 1;

        const drawWidth = handSize * config.widthScale;
        const drawHeight = drawWidth * (srcH / srcW);

        const centerX = wrist.x + elbowX * handSize * config.offset;
        const centerY = wrist.y + elbowY * handSize * config.offset;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        ctx.scale(1, flip);
        ctx.drawImage(image, -drawWidth / 2, 0, drawWidth, drawHeight);
        ctx.restore();

        if (DEBUG_POINTS) {
          ctx.fillStyle = "red";
          ctx.beginPath();
          ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
  }));

  return null;
});

export default TryOnBangles;