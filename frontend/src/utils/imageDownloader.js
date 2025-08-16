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
 * Test ZIP creation with a simple text file to verify functionality
 * @returns {Promise<boolean>} True if ZIP creation works
 */
export const testZipCreation = async () => {
  try {
    console.log("🧪 Testing ZIP creation...");
    
    const zip = new JSZip();
    
    // Add a simple test file
    const testContent = "This is a test file to verify ZIP creation works.";
    zip.file("test.txt", testContent);
    
    // Generate ZIP
    const zipBlob = await zip.generateAsync({ 
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 1 },
      mimeType: "application/zip"
    });
    
    // Validate
    if (zipBlob.size === 0) {
      throw new Error("Test ZIP is empty");
    }
    
    // Test integrity
    const testZip = new JSZip();
    await testZip.loadAsync(zipBlob);
    
    console.log("✅ ZIP creation test passed:", { size: zipBlob.size, type: zipBlob.type });
    return true;
  } catch (error) {
    console.error("❌ ZIP creation test failed:", error);
    return false;
  }
};

/**
 * Sanitize filename to be Windows-compatible and reasonably short
 * @param {string} originalFilename - Original filename
 * @param {number} index - File index for fallback naming
 * @param {string} extension - File extension
 * @returns {string} Sanitized filename
 */
const sanitizeFilename = (originalFilename, index, extension = '') => {
  try {
    // Extract just the filename part (remove path and query params)
    let filename = originalFilename;
    
    // Remove data URL prefix if present
    if (filename.startsWith('data:')) {
      filename = `image_${index + 1}`;
    } else {
      // Remove URL path and query parameters
      filename = filename.split('/').pop() || filename;
      filename = filename.split('?')[0] || filename;
      filename = filename.split('&')[0] || filename;
      
      // Remove invalid characters and limit length
      filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      // If filename is still too long or empty, use index-based naming
      if (filename.length > 50 || !filename || filename === '_') {
        filename = `image_${index + 1}`;
      }
    }
    
    // Ensure we have a valid extension
    if (!extension && filename.includes('.')) {
      const parts = filename.split('.');
      extension = parts.pop();
      filename = parts.join('.');
    }
    
    // Final sanitization and length check
    filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Limit total filename length to 50 characters
    if (filename.length > 50) {
      filename = filename.substring(0, 50);
    }
    
    // Add extension if we have one
    if (extension && !filename.endsWith(`.${extension}`)) {
      filename = `${filename}.${extension}`;
    }
    
    // Final validation - if still invalid, use index-based naming
    if (!filename || filename === '_' || filename.length === 0) {
      filename = `image_${index + 1}${extension ? `.${extension}` : ''}`;
    }
    
    return filename;
  } catch (error) {
    console.warn('Filename sanitization failed, using index-based naming:', error);
    return `image_${index + 1}${extension ? `.${extension}` : ''}`;
  }
};

/**
 * Create a blob from data URL with extensive validation
 * @param {string} dataUrl - Data URL string
 * @returns {Promise<Blob>} Valid blob
 */
const createBlobFromDataUrl = async (dataUrl) => {
  try {
    // Basic validation
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error('Data URL is not a valid string');
    }

    if (!dataUrl.startsWith('data:')) {
      throw new Error('Data URL does not start with "data:"');
    }

    // Parse data URL
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) {
      throw new Error('Data URL missing comma separator');
    }

    const header = dataUrl.substring(0, commaIndex);
    const base64Data = dataUrl.substring(commaIndex + 1);

    if (!base64Data || base64Data.length === 0) {
      throw new Error('Data URL has no base64 content');
    }

    // Extract MIME type
    const mimeMatch = header.match(/^data:([^;]+)/);
    if (!mimeMatch) {
      throw new Error('Could not extract MIME type from data URL');
    }

    const mimeType = mimeMatch[1];
    if (!mimeType.startsWith('image/')) {
      throw new Error(`Invalid MIME type: ${mimeType}`);
    }

    // Validate base64 data
    try {
      // Check if base64 is valid
      if (base64Data.length % 4 !== 0) {
        throw new Error('Invalid base64 length');
      }

      // Try to decode base64
      const binaryString = atob(base64Data);
      if (binaryString.length === 0) {
        throw new Error('Base64 decoded to empty string');
      }

      // Convert to Uint8Array
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob
      const blob = new Blob([bytes], { type: mimeType });
      
      // Final validation
      if (blob.size === 0) {
        throw new Error('Generated blob is empty');
      }

      if (blob.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('Blob size too large (>50MB)');
      }

      return blob;
    } catch (base64Error) {
      throw new Error(`Base64 decoding failed: ${base64Error.message}`);
    }
  } catch (error) {
    console.error('Error creating blob from data URL:', error);
    throw error;
  }
};

/**
 * Validate ZIP creation by creating a test ZIP first
 * @returns {Promise<boolean>} True if ZIP creation is working
 */
const validateZipCreation = async () => {
  try {
    console.log("🧪 Validating ZIP creation capability...");
    
    const testZip = new JSZip();
    
    // Add a simple test file
    testZip.file("test.txt", "ZIP validation test file");
    
    // Generate test ZIP with same settings as main ZIP
    const testZipBlob = await testZip.generateAsync({ 
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 1 },
      mimeType: "application/zip"
    });
    
    // Validate test ZIP
    if (testZipBlob.size === 0) {
      throw new Error("Test ZIP is empty");
    }
    
    if (testZipBlob.size < 100) {
      throw new Error("Test ZIP is too small");
    }
    
    // Test integrity
    const verifyZip = new JSZip();
    await verifyZip.loadAsync(testZipBlob);
    
    console.log("✅ ZIP validation passed:", { size: testZipBlob.size, type: testZipBlob.type });
    return true;
  } catch (error) {
    console.error("❌ ZIP validation failed:", error);
    return false;
  }
};

/**
 * Process image download data and create ZIP file with enhanced reliability
 * @param {Array} downloads - Array of download objects from backend
 * @param {Object} summary - Download summary
 * @returns {Promise<Object>} Result with success status and message
 */
export const processImageDownloads = async (downloads, summary) => {
  try {
    if (!downloads || downloads.length === 0) {
      throw new Error("No downloads to process");
    }

    // Validate ZIP creation capability first
    const zipValidation = await validateZipCreation();
    if (!zipValidation) {
      throw new Error("ZIP creation validation failed - cannot proceed with download");
    }

    console.log("🚀 Starting ZIP creation with", downloads.length, "downloads");
    
    // Create new JSZip instance
    const zip = new JSZip();
    let processedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each download with individual error handling
    for (let index = 0; index < downloads.length; index++) {
      const download = downloads[index];
      console.log(`📁 Processing download ${index + 1}/${downloads.length}: ${download.filename}`);

      try {
        // Validate download object
        if (!download.dataUrl || !download.filename) {
          const error = `Invalid download object: missing dataUrl or filename`;
          console.warn(`⚠️ ${error}`);
          errors.push({ index, filename: download.filename || 'unknown', error });
          errorCount++;
          continue;
        }

        // Create blob with extensive validation
        let blob;
        try {
          blob = await createBlobFromDataUrl(download.dataUrl);
          console.log(`✅ Blob created for ${download.filename}: ${blob.size} bytes, type: ${blob.type}`);
        } catch (blobError) {
          const error = `Blob creation failed: ${blobError.message}`;
          console.error(`❌ ${error}`);
          errors.push({ index, filename: download.filename, error });
          errorCount++;
          continue;
        }

        // Handle SVG conversion
        if (download.isSvg || download.filename.toLowerCase().endsWith('.svg')) {
          console.log(`🔄 Converting SVG to PNG: ${download.filename}`);
          
          try {
            const base64Data = download.dataUrl.split(",")[1];
            const svgContent = atob(base64Data);
            
            const pngBlob = await convertSvgToPng(svgContent);
            
            // Generate PNG filename
            let filename = download.filename;
            if (filename.toLowerCase().endsWith(".svg")) {
              filename = filename.replace(/\.svg$/i, ".png");
            } else if (!filename.toLowerCase().endsWith(".png")) {
              filename = `image_${index + 1}.png`;
            }

            // Sanitize filename with proper extension
            const sanitizedFilename = sanitizeFilename(filename, index, 'png');
            console.log(`✅ SVG converted to PNG: ${sanitizedFilename}, Size: ${pngBlob.size}`);

            zip.file(sanitizedFilename, pngBlob);
            processedCount++;
          } catch (svgError) {
            console.warn(`⚠️ SVG conversion failed for ${download.filename}, using original: ${svgError.message}`);
            // Fallback: add original SVG with sanitized filename
            const sanitizedFilename = sanitizeFilename(download.filename, index, 'svg');
            zip.file(sanitizedFilename, blob);
            processedCount++;
          }
        } else {
          // Regular image - determine extension from MIME type or filename
          let extension = '';
          if (download.filename.includes('.')) {
            const parts = download.filename.split('.');
            extension = parts.pop();
          } else if (blob.type) {
            // Extract extension from MIME type
            const mimeToExt = {
              'image/jpeg': 'jpg',
              'image/jpg': 'jpg',
              'image/png': 'png',
              'image/gif': 'gif',
              'image/bmp': 'bmp',
              'image/webp': 'webp',
              'image/svg+xml': 'svg'
            };
            extension = mimeToExt[blob.type] || '';
          }
          
          // Sanitize filename with proper extension
          const sanitizedFilename = sanitizeFilename(download.filename, index, extension);
          console.log(`✅ Adding to ZIP: ${sanitizedFilename}, Size: ${blob.size}`);

          zip.file(sanitizedFilename, blob);
          processedCount++;
        }
      } catch (error) {
        const errorMsg = `Processing failed: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push({ index, filename: download.filename || 'unknown', error: errorMsg });
        errorCount++;
      }
    }

    // Check if we have any processed files
    if (processedCount === 0) {
      throw new Error("No valid downloads could be processed");
    }

    console.log(`📊 ZIP preparation complete: ${processedCount} files processed, ${errorCount} errors`);

    // Generate ZIP with conservative settings
    console.log("🔧 Generating ZIP file...");
    const zipBlob = await zip.generateAsync({ 
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 1 }, // Use level 1 for better compatibility
      mimeType: "application/zip"
    });
    
    console.log("✅ ZIP generated successfully:", { 
      size: zipBlob.size, 
      type: zipBlob.type,
      fileCount: processedCount 
    });

    // Extensive ZIP validation
    if (zipBlob.size === 0) {
      throw new Error("Generated ZIP file is empty");
    }

    if (zipBlob.size < 100) { // ZIP files should be at least 100 bytes
      throw new Error("Generated ZIP file is too small, likely corrupted");
    }

    // Test ZIP integrity by trying to read it
    try {
      const testZip = new JSZip();
      await testZip.loadAsync(zipBlob);
      console.log("✅ ZIP integrity test passed");
    } catch (integrityError) {
      throw new Error(`ZIP integrity test failed: ${integrityError.message}`);
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const zipFilename = `bulk-images-${timestamp}.zip`;
    
    console.log("💾 Downloading ZIP as:", zipFilename);

    // Save ZIP file
    saveAs(zipBlob, zipFilename);

    return {
      success: true,
      message: `Successfully downloaded ${processedCount} images`,
      filename: zipFilename,
      size: zipBlob.size,
      processedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error("💥 Fatal error in processImageDownloads:", error);
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
      if (!image.blob || !image.filename) {
        console.warn(`Skipping invalid image ${index}:`, image);
        return;
      }

      // Determine extension from MIME type or filename
      let extension = '';
      if (image.filename.includes('.')) {
        const parts = image.filename.split('.');
        extension = parts.pop();
      } else if (image.blob.type) {
        const mimeToExt = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/bmp': 'bmp',
          'image/webp': 'webp',
          'image/svg+xml': 'svg'
        };
        extension = mimeToExt[image.blob.type] || '';
      }

      const sanitizedFilename = sanitizeFilename(image.filename, index, extension);
      zip.file(sanitizedFilename, image.blob);
      console.log(`Added to ZIP: ${sanitizedFilename}`);
    });

    // Generate ZIP blob with conservative compression
    const zipBlob = await zip.generateAsync({ 
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 1 },
      mimeType: "application/zip"
    });

    // Validate ZIP blob
    if (zipBlob.size === 0) {
      throw new Error("Generated ZIP file is empty");
    }

    // Download the ZIP file
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const zipFilename = `bulk-images-${timestamp}.zip`;
    
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
