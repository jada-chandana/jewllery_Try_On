import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

// Placement settings per earring type
// widthScale : earring width relative to face width (ear to ear)
// offsetY    : extra vertical shift, relative to face width (+ = lower)
// maxHeight  : cap on earring height, relative to face width
// anchor     : 0 = hangs from the top of the image, 0.5 = centred on the lobe
const EARRING_CONFIG = {
  stud:   { widthScale: 0.085, offsetY: 0.00,  maxHeight: 0.12, anchor: 0.5 },
  drop:   { widthScale: 0.100, offsetY: 0.00,  maxHeight: 0.34, anchor: 0 },
  jhumka: { widthScale: 0.170, offsetY: 0.00,  maxHeight: 0.32, anchor: 0 },
  hoop:   { widthScale: 0.200, offsetY: -0.01, maxHeight: 0.22, anchor: 0 },
};

// FaceMesh landmarks used as the earlobe positions (one per side).
// 93 and 323 sit on the jaw line at ear level. If the earrings look too high
// or low on your face, change EAR_OFFSET.y rather than these indexes.
const EAR_POINTS = [93, 323];

// Shift from the landmark to the lobe, relative to face width
// x: outward (away from the face centre), y: downward
const EAR_OFFSET = { x: 0.03, y: 0.05 };

// When the head turns, hide the earring on the side that is turned away.
// 0.30 means: hide when the nose is within 30% of the face edge.
const HIDE_RATIO = 0.3;

// Set to true to draw red dots at the earlobe anchor points while tuning
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

const TryOnEarrings = forwardRef(function TryOnEarrings({ earringImage }, ref) {
  const imageRef = useRef(null);

  useEffect(() => {
    imageRef.current = null;

    if (!earringImage) return;

    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (cancelled) return;
      imageRef.current = trimTransparent(image);
      window.dispatchEvent(new Event("earring-image-loaded"));
    };

    image.onerror = () => {
      console.error("Earring image failed to load:", earringImage);
    };

    image.src = earringImage;

    return () => {
      cancelled = true;
      imageRef.current = null;
    };
  }, [earringImage]);

  useImperativeHandle(ref, () => ({
    drawEarrings(ctx, landmarks, width, height, earringType = "drop") {
      const image = imageRef.current;
      if (!ctx || !image) return;

      const srcW = image.naturalWidth || image.width;
      const srcH = image.naturalHeight || image.height;
      if (!srcW || !srcH) return;

      if (!landmarks || landmarks.length < 455) return;

      const config = EARRING_CONFIG[earringType] || EARRING_CONFIG.drop;

      // Mirror x to match the mirrored canvas
      const edgeA = (1 - landmarks[234].x) * width;
      const edgeB = (1 - landmarks[454].x) * width;
      const leftX = Math.min(edgeA, edgeB);
      const rightX = Math.max(edgeA, edgeB);

      const faceWidth = Math.hypot(
        rightX - leftX,
        (landmarks[454].y - landmarks[234].y) * height
      );

      const centerX = (leftX + rightX) / 2;

      // Where the nose sits between the two face edges (0 = left, 1 = right)
      const noseX = (1 - landmarks[1].x) * width;
      const noseRatio = (noseX - leftX) / Math.max(rightX - leftX, 1);

      let drawWidth = faceWidth * config.widthScale;
      let drawHeight = drawWidth * (srcH / srcW);

      const maxH = faceWidth * config.maxHeight;
      if (drawHeight > maxH) {
        const ratio = maxH / drawHeight;
        drawHeight = maxH;
        drawWidth *= ratio;
      }

      for (const index of EAR_POINTS) {
        const point = landmarks[index];
        if (!point) continue;

        const x = (1 - point.x) * width;
        const y = point.y * height;

        const side = x < centerX ? -1 : 1;

        // Hide the earring on the side hidden by a turned head
        if (side === -1 && noseRatio < HIDE_RATIO) continue;
        if (side === 1 && noseRatio > 1 - HIDE_RATIO) continue;

        const anchorX = x + side * faceWidth * EAR_OFFSET.x;
        const anchorY = y + faceWidth * (EAR_OFFSET.y + config.offsetY);

        ctx.save();
        ctx.translate(anchorX, anchorY);

        // Flip the left-hand earring so the pair is symmetrical
        if (side === -1) ctx.scale(-1, 1);

        ctx.drawImage(
          image,
          -drawWidth / 2,
          -drawHeight * config.anchor,
          drawWidth,
          drawHeight
        );

        ctx.restore();

        if (DEBUG_POINTS) {
          ctx.fillStyle = "red";
          ctx.beginPath();
          ctx.arc(anchorX, anchorY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
  }));

  return null;
});

export default TryOnEarrings;