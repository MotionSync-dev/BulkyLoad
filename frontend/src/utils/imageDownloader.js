import JSZip from "jszip";
import { saveAs } from "file-saver";

/**
 * Convert SVG content to PNG using canvas
 * @param {string} svgContent - SVG content as string
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {Promise<Blob>} PNG blob
 */
export const convertSvgToPng = (svgContent, width = 800, height = 600) => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      const img = new Image();

      img.onload = () => {
        try {
          // Clear canvas and draw image
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convert to blob
          canvas.toBlob((pngBlob) => {
            if (pngBlob) {
              resolve(pngBlob);
            } else {
              reject(new Error("Failed to convert SVG to PNG"));
            }
          }, "image/png");
        } catch (error) {
          reject(new Error(`SVG to PNG conversion failed: ${error.message}`));
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load SVG as image"));
      };

      // Create blob URL from SVG content
      const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
      const svgUrl = URL.createObjectURL(svgBlob);
      img.src = svgUrl;

      // Clean up the object URL after a delay
      setTimeout(() => URL.revokeObjectURL(svgUrl), 1000);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Process image download data and create ZIP file
 * @param {Array} downloads - Array of download objects from backend
 * @param {Object} summary - Download summary
 * @returns {Promise<Object>} Result with success status and message
 */
export const processImageDownloads = async (downloads, summary) => {
  try {
    if (!downloads || downloads.length === 0) {
      throw new Error("No downloads to process");
    }

    console.log("Creating ZIP with downloads:", downloads);
    const zip = new JSZip();

    // Process downloads sequentially to handle SVG conversion
    for (let index = 0; index < downloads.length; index++) {
      const download = downloads[index];
      console.log(`Processing download ${index + 1}:`, download);

      // Convert data URL back to blob
      const base64Data = download.dataUrl.split(",")[1];
      const mimeType =
        download.dataUrl.match(/data:([^;]+)/)?.[1] || "image/jpeg";

      console.log("MIME type:", mimeType, "Base64 length:", base64Data.length);

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      console.log("Blob created:", { size: blob.size, type: blob.type });

      // Handle SVG conversion to PNG
      if (download.isSvg || mimeType === "image/svg+xml") {
        console.log("Converting SVG to PNG...");

        try {
          const svgContent = atob(base64Data);
          const pngBlob = await convertSvgToPng(svgContent);

          // Generate PNG filename
          let filename = download.filename;
          if (filename.toLowerCase().endsWith(".svg")) {
            filename = filename.replace(/\.svg$/i, ".png");
          } else if (!filename.toLowerCase().endsWith(".png")) {
            filename = `image_${index + 1}.png`;
          }

          // Sanitize filename
          const sanitizedFilename = filename.replace(/[?&=]/g, "_");
          console.log(
            "SVG converted to PNG:",
            sanitizedFilename,
            "Size:",
            pngBlob.size
          );

          zip.file(sanitizedFilename, pngBlob);
        } catch (svgError) {
          console.error("SVG conversion failed:", svgError);
          // Fallback: add original SVG to ZIP
          const sanitizedFilename = download.filename.replace(/[?&=]/g, "_");
          zip.file(sanitizedFilename, blob);
        }
      } else {
        // Regular image - add to ZIP as-is
        const sanitizedFilename = download.filename.replace(/[?&=]/g, "_");
        console.log("Adding to ZIP:", sanitizedFilename, "Size:", blob.size);

        zip.file(sanitizedFilename, blob);
      }
    }

    console.log("Generating ZIP...");
    const zipBlob = await zip.generateAsync({ type: "blob" });
    console.log("ZIP generated:", { size: zipBlob.size, type: zipBlob.type });

    const zipFilename = `bulk-images-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")}.zip`;
    console.log("Downloading ZIP as:", zipFilename);

    saveAs(zipBlob, zipFilename);

    return {
      success: true,
      message: `Successfully downloaded ${summary.successful} images`,
      filename: zipFilename,
      size: zipBlob.size,
    };
  } catch (error) {
    console.error("Error processing image downloads:", error);
    throw error;
  }
};

/**
 * Download single image file
 * @param {Blob} blob - Image blob
 * @param {string} filename - Filename for download
 */
export const downloadSingleImage = (blob, filename) => {
  try {
    saveAs(blob, filename);
    return { success: true, message: `Downloaded ${filename}` };
  } catch (error) {
    console.error("Error downloading single image:", error);

    // Fallback: create download link
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    return {
      success: true,
      message: `Downloaded ${filename} (fallback method)`,
    };
  }
};

/**
 * Create ZIP from multiple image blobs
 * @param {Array} images - Array of { blob, filename } objects
 * @returns {Promise<Object>} Result with success status and message
 */
export const createImageZip = async (images) => {
  try {
    if (!images || images.length === 0) {
      throw new Error("No images to process");
    }

    console.log("Creating ZIP with", images.length, "files");

    const zip = new JSZip();

    // Add each image to the ZIP
    images.forEach((image, index) => {
      const sanitizedFilename = image.filename.replace(/[?&=]/g, "_");
      zip.file(sanitizedFilename, image.blob);
      console.log(`Added to ZIP: ${sanitizedFilename}`);
    });

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ type: "blob" });

    // Download the ZIP file
    const zipFilename = `bulk-images-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")}.zip`;
    saveAs(zipBlob, zipFilename);

    console.log("ZIP download completed:", zipFilename);

    return {
      success: true,
      message: `Successfully created ZIP with ${images.length} images`,
      filename: zipFilename,
      size: zipBlob.size,
    };
  } catch (error) {
    console.error("Error creating ZIP:", error);
    throw error;
  }
};
