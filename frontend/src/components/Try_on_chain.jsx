import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

// Placement settings per chain type
// widthScale : visible jewellery width relative to face width (ear to ear)
// offsetY    : distance below the chin, relative to face width
// maxHeight  : cap on jewellery height, relative to face width
//
// TUNING: if it looks too small/large change widthScale,
// if it sits too high/low change offsetY (steps of 0.05).
const CHAIN_CONFIG = {
  choker:   { widthScale: 0.80, offsetY: 0.22, maxHeight: 0.60 },
  chain:    { widthScale: 0.95, offsetY: 0.35, maxHeight: 1.10 },
  necklace: { widthScale: 1.05, offsetY: 0.42, maxHeight: 1.40 },
  haram:    { widthScale: 1.40, offsetY: 0.55, maxHeight: 2.60 },
};

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
        // Alpha above 12 counts as visible
        if (data[(y * w + x) * 4 + 3] > 12) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Fully transparent or nothing to trim
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
    // If reading pixels fails, fall back to the original image
    console.warn("Could not trim image:", err);
    return image;
  }
}

const TryOnChain = forwardRef(function TryOnChain({ necklaceImage }, ref) {
  const imageRef = useRef(null);

  useEffect(() => {
    imageRef.current = null;

    if (!necklaceImage) return;

    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (cancelled) return;
      imageRef.current = trimTransparent(image);
      window.dispatchEvent(new Event("necklace-image-loaded"));
    };

    image.onerror = () => {
      console.error("Necklace image failed to load:", necklaceImage);
    };

    image.src = necklaceImage;

    return () => {
      cancelled = true;
      imageRef.current = null;
    };
  }, [necklaceImage]);

  useImperativeHandle(ref, () => ({
    drawNecklace(ctx, landmarks, width, height, chainType = "necklace") {
      const image = imageRef.current;
      if (!ctx || !image) return;

      const srcW = image.naturalWidth || image.width;
      const srcH = image.naturalHeight || image.height;
      if (!srcW || !srcH) return;

      if (!landmarks || landmarks.length < 455) return;

      const config = CHAIN_CONFIG[chainType] || CHAIN_CONFIG.necklace;

      const leftJaw = landmarks[234];
      const rightJaw = landmarks[454];
      const chin = landmarks[152];

      // Mirror landmarks to match the mirrored canvas
      const leftX = (1 - rightJaw.x) * width;
      const rightX = (1 - leftJaw.x) * width;
      const leftY = rightJaw.y * height;
      const rightY = leftJaw.y * height;

      const chinY = chin.y * height;

      const faceWidth = Math.hypot(rightX - leftX, rightY - leftY);

      let drawWidth = faceWidth * config.widthScale;
      let drawHeight = drawWidth * (srcH / srcW);

      // Keep very tall jewellery (haram) from becoming too long
      const maxH = faceWidth * config.maxHeight;
      if (drawHeight > maxH) {
        const ratio = maxH / drawHeight;
        drawHeight = maxH;
        drawWidth *= ratio;
      }

      const centerX = (leftX + rightX) / 2;
      const centerY = chinY + faceWidth * config.offsetY;
      const angle = Math.atan2(rightY - leftY, rightX - leftX);

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      ctx.drawImage(image, -drawWidth / 2, 0, drawWidth, drawHeight);
      ctx.restore();
    },
  }));

  return null;
});

export default TryOnChain;