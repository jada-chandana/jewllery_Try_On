
import { removeBackground as removeBg } from "@bg0/browser";

export async function removeBackground(imageUrl, onProgress) {
  if (!imageUrl) {
    throw new Error("Product image URL is required.");
  }

  // Load the seller's original product image
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error("Unable to load seller product image.");
  }

  const imageBlob = await response.blob();

  // Remove background locally in the browser
  const result = await removeBg(imageBlob, {
    quality: "quality",
    onProgress: ({ stage, progress, message }) => {
      console.log("Background removal:", {
        stage,
        progress,
        message,
      });

      onProgress?.({ stage, progress, message });
    },
  });

  if (!result?.blob) {
    throw new Error("Background removal failed.");
  }

  // Return transparent PNG as a browser object URL
  return URL.createObjectURL(result.blob);
}
