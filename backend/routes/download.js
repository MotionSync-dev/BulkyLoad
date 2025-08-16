import express from "express";
import axios from "axios";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";
import User from "../models/User.js";
import AnonymousSession from "../models/AnonymousSession.js";

const router = express.Router();

// Download images endpoint
router.post("/images", optionalAuth, async (req, res) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res
        .status(400)
        .json({ error: "Please provide an array of image URLs" });
    }

    // Dynamic URL limit based on user type
    let maxUrlsPerRequest = 5; // Default for anonymous users
    
    if (req.user) {
      maxUrlsPerRequest = 10; // Registered users: 10 URLs per request
    }

    if (urls.length > maxUrlsPerRequest) {
      const userType = req.user ? 'registered' : 'anonymous';
      const limitText = req.user ? '10 URLs' : '5 URLs';
        
      return res.status(400).json({
        error: `Maximum ${limitText} allowed per request. You requested ${urls.length} URLs.`,
        maxAllowed: maxUrlsPerRequest,
        requested: urls.length,
        userType: userType
      });
    }

    // Check download limits for authenticated users
    if (req.user) {
      const user = await User.findById(req.user.userId);
      if (user) {
        const limitCheck = await user.canDownload(urls.length);

        if (!limitCheck.canDownload) {
          const errorMessage =
            limitCheck.userType === "registered"
              ? "Registered users can download up to 10 images per day. Subscribe for unlimited downloads."
              : "Download limit exceeded";

          return res.status(403).json({
            error: errorMessage,
            userType: limitCheck.userType,
            limits: {
              current: limitCheck.current,
              remaining: limitCheck.remaining,
              limit: limitCheck.limit,
              requested: urls.length,
            },
          });
        }

        // Note: Download count will be updated after successful downloads at the end of the function
      }
    } else {
      // For unauthenticated users, use session-based tracking
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          error: "Session ID required for anonymous users",
        });
      }

      // Get or create anonymous user session by session ID
      let anonymousSession = await AnonymousSession.findOne({ sessionId });

      if (!anonymousSession) {
        anonymousSession = new AnonymousSession({
          sessionId,
          dailyDownloads: { count: 0, resetDate: new Date() },
        });
      }

      // Check if it's a new day and reset count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const resetDate = new Date(anonymousSession.dailyDownloads.resetDate);
      resetDate.setHours(0, 0, 0, 0);

      if (today.getTime() !== resetDate.getTime()) {
        anonymousSession.dailyDownloads.count = 0;
        anonymousSession.dailyDownloads.resetDate = new Date();
      }

      const currentCount = anonymousSession.dailyDownloads.count;
      const limit = 5; // Anonymous users: 5 downloads per day

      if (currentCount + urls.length > limit) {
        return res.status(403).json({
          error:
            "Anonymous users can only download up to 5 images per day. Please sign up for 10 downloads per day or subscribe for unlimited downloads.",
          userType: "anonymous",
          limit: limit,
          current: currentCount,
          remaining: Math.max(0, limit - currentCount),
          requested: urls.length,
        });
      }

      // Note: Anonymous download count will be updated after successful downloads
    }

    const results = [];
    const successfulDownloads = [];

    // Download images
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        console.log(`Processing URL ${i + 1}/${urls.length}: ${url}`);

        // Check if it's an SVG file
        const isSvg = url.toLowerCase().endsWith(".svg");
        let response;

        // First try direct download
        try {
          response = await axios.get(url, {
            responseType: isSvg ? "text" : "arraybuffer",
            timeout: 30000,
            maxContentLength: 10 * 1024 * 1024, // 10MB limit
            headers: {
              Accept: isSvg
                ? "image/svg+xml,text/plain"
                : "image/*,application/octet-stream",
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              Referer: url,
            },
            // Follow redirects for image URLs
            maxRedirects: 5,
            validateStatus: function (status) {
              return status >= 200 && status < 400; // Accept redirects
            },
          });
        } catch (downloadError) {
          console.error(`Failed to download ${url}:`, downloadError.message);
          results.push({
            url,
            success: false,
            error: "Failed to download image",
          });
          continue;
        }

        // Process the downloaded image
        if (response.status === 200) {
          let contentType = response.headers["content-type"] || "";
          let contentLength = response.headers["content-length"];

          console.log(`Processing ${url}:`, {
            contentType,
            contentLength,
            responseSize: response.data.length || response.data.byteLength,
            isSvg,
          });

          // Handle SVG files
          if (isSvg) {
            if (
              typeof response.data === "string" &&
              response.data.includes("<svg")
            ) {
              // Valid SVG content
              const filename =
                url.split("/").pop().split("?")[0] || "image.svg";
              if (!filename.endsWith(".svg")) {
                filename = filename + ".svg";
              }

              successfulDownloads.push({
                filename,
                size: response.data.length,
                dataUrl: `data:image/svg+xml;base64,${Buffer.from(
                  response.data
                ).toString("base64")}`,
                isSvg: true,
              });

              results.push({
                url,
                success: true,
                filename,
                size: response.data.length,
                contentType: "image/svg+xml",
              });
            } else {
              results.push({
                url,
                success: false,
                error: "Invalid SVG content",
              });
            }
            continue;
          }

          // Enhanced content type detection for all image formats
          let isImage = false;
          let detectedType = "";

          // Check content type header first
          if (contentType.startsWith("image/")) {
            isImage = true;
            detectedType = contentType;
          } else if (contentType.includes("octet-stream")) {
            // Generic binary content - need to detect image type
            isImage = false;
            detectedType = "application/octet-stream";
          } else {
            // Try to detect if it's actually an image by checking the first few bytes
            const firstBytes = response.data.slice(0, 8);

            // BMP signature: BM (42 4D)
            const isBMP = firstBytes[0] === 0x42 && firstBytes[1] === 0x4d;

            // JPEG signature: FF D8 FF
            const isJPEG =
              firstBytes[0] === 0xff &&
              firstBytes[1] === 0xd8 &&
              firstBytes[2] === 0xff;

            // PNG signature: 89 50 4E 47 0D 0A 1A 0A
            const isPNG =
              firstBytes[0] === 0x89 &&
              firstBytes[1] === 0x50 &&
              firstBytes[2] === 0x4e &&
              firstBytes[3] === 0x47 &&
              firstBytes[4] === 0x0d &&
              firstBytes[5] === 0x0a &&
              firstBytes[6] === 0x1a &&
              firstBytes[7] === 0x0a;

            // GIF signature: GIF87a or GIF89a
            const isGIF =
              firstBytes[0] === 0x47 &&
              firstBytes[1] === 0x49 &&
              firstBytes[2] === 0x46 &&
              firstBytes[3] === 0x38 &&
              (firstBytes[4] === 0x37 || firstBytes[4] === 0x39) &&
              firstBytes[5] === 0x61;

            // WebP signature: RIFF....WEBP
            const isWebP =
              firstBytes[0] === 0x52 &&
              firstBytes[1] === 0x49 &&
              firstBytes[2] === 0x46 &&
              firstBytes[3] === 0x57 &&
              firstBytes[4] === 0x45 &&
              firstBytes[5] === 0x42 &&
              firstBytes[6] === 0x50;

            // TIFF signature: II (Intel) or MM (Motorola)
            const isTIFF =
              (firstBytes[0] === 0x49 && firstBytes[1] === 0x49) ||
              (firstBytes[0] === 0x4d && firstBytes[1] === 0x4d);

            if (isBMP || isJPEG || isPNG || isGIF || isWebP || isTIFF) {
              isImage = true;

              // Set the correct content type based on detection
              if (isBMP) detectedType = "image/bmp";
              else if (isJPEG) detectedType = "image/jpeg";
              else if (isPNG) detectedType = "image/png";
              else if (isGIF) detectedType = "image/gif";
              else if (isWebP) detectedType = "image/webp";
              else if (isTIFF) detectedType = "image/tiff";

              console.log(`Detected image type: ${detectedType} for ${url}`);
            } else {
              console.log(
                `Not an image file: ${url}, first bytes:`,
                firstBytes
                  .slice(0, 4)
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join(" ")
              );
            }
          }

          if (!isImage) {
            results.push({
              url,
              success: false,
              error: "Not an image file",
            });
            continue;
          }

          // Generate filename - handle complex URLs better
          let filename = "";
          const urlPath = url.split("?")[0]; // Remove query parameters
          const pathParts = urlPath.split("/");
          const lastPart = pathParts[pathParts.length - 1];

          if (lastPart && lastPart.includes(".")) {
            filename = lastPart;
          } else if (lastPart && lastPart.length > 0) {
            const extension = detectedType.split("/")[1] || "jpg";
            filename = `${lastPart}.${extension}`;
          } else {
            const extension = detectedType.split("/")[1] || "jpg";
            filename = `image-${i + 1}.${extension}`;
          }

          // Create data URL for the image
          const base64 = Buffer.from(response.data).toString("base64");

          // Validate base64 data
          if (!base64 || base64.length === 0) {
            console.error(`Empty base64 data for ${url}`);
            results.push({
              url,
              success: false,
              error: "Failed to encode image data",
            });
            continue;
          }

          const dataUrl = `data:${detectedType};base64,${base64}`;

          // Validate data URL
          if (!dataUrl.startsWith("data:") || dataUrl.length < 100) {
            console.error(
              `Invalid data URL for ${url}:`,
              dataUrl.substring(0, 100)
            );
            results.push({
              url,
              success: false,
              error: "Failed to create valid data URL",
            });
            continue;
          }

          successfulDownloads.push({
            filename,
            size: response.data.byteLength || response.data.length,
            dataUrl,
            isSvg: false,
          });

          results.push({
            url,
            success: true,
            filename,
            size: response.data.byteLength || response.data.length,
            contentType: detectedType,
          });
        } else {
          results.push({
            url,
            success: false,
            error: `HTTP ${response.status}`,
          });
        }
      } catch (error) {
        console.error(`Error downloading ${url}:`, error.message);
        results.push({
          url,
          success: false,
          error: "Failed to download image",
        });
      }
    }

    // Update download count for anonymous users
    if (!req.user) {
      const { sessionId } = req.body;
      let anonymousSession = await AnonymousSession.findOne({ sessionId });

      if (anonymousSession) {
        const successfulCount = results.filter((r) => r.success).length;

        // Only update count for successful downloads
        if (successfulCount > 0) {
          anonymousSession.dailyDownloads.count += successfulCount;
          await anonymousSession.save();

          console.log("Anonymous download count after update:", {
            sessionId,
            dailyCount: anonymousSession.dailyDownloads.count,
            resetDate: anonymousSession.dailyDownloads.resetDate,
            successfulDownloads: successfulCount,
            remaining: Math.max(0, 5 - anonymousSession.dailyDownloads.count),
          });
        }
      }
    }

    // Update download count and history for authenticated users
    if (req.user) {
      const user = await User.findById(req.user.userId);
      if (user) {
        const successfulCount = results.filter((r) => r.success).length;

        // Only update count for successful downloads
        if (successfulCount > 0) {
          await user.updateDailyCount(successfulCount);
        }

        // Then update history
        await user.updateDownloadHistory({
          urls: urls,
          successCount: successfulCount,
          failedCount: results.filter((r) => !r.success).length,
          totalCount: urls.length,
        });

        // Double-check final counts
        const finalCheck = await user.canDownload(0);
        console.log("Final download counts:", {
          userId: user._id,
          email: user.email,
          dailyCount: user.dailyDownloads.count,
          resetDate: user.dailyDownloads.resetDate,
          remaining: finalCheck.remaining,
          successfulDownloads: successfulCount,
          historyCount: user.downloadHistory.length,
          subscription: user.subscription,
        });
      }
    }

    console.log(
      "Sending response with successful downloads:",
      successfulDownloads.length
    );
    successfulDownloads.forEach((download, index) => {
      console.log(`Download ${index + 1}:`, {
        filename: download.filename,
        size: download.size,
        dataUrlLength: download.dataUrl.length,
      });
    });

    res.json({
      message: "Download completed",
      results,
      summary: {
        total: urls.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
      downloads: successfulDownloads,
    });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Failed to process download request" });
  }
});

// Get download history (authenticated users only)
router.get("/history", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      history: user.downloadHistory || [],
    });
  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({ error: "Failed to fetch download history" });
  }
});

// Clear download history (authenticated users only)
router.delete("/history", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.downloadHistory = [];

    res.json({
      message: "Download history cleared successfully",
    });
  } catch (error) {
    console.error("Clear history error:", error);
    res.status(500).json({ error: "Failed to clear download history" });
  }
});

// Debug endpoint for user download data (remove in production)
router.get("/debug-user/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const downloadCheck = await user.canDownload(0);

    res.json({
      userId: user._id,
      email: user.email,
      subscription: user.subscription,
      dailyDownloads: user.dailyDownloads,
      downloadCheck,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("Debug user error:", error);
    res.status(500).json({ error: "Failed to get user debug info" });
  }
});

// Get remaining downloads endpoint
router.get("/remaining", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const limitCheck = await user.canDownload(0);

    res.json({
      isAuthenticated: true,
      userType: limitCheck.userType,
      current: limitCheck.current,
      remaining: limitCheck.remaining,
      limit: limitCheck.limit,
      resetDate: limitCheck.resetDate,
    });
  } catch (error) {
    console.error("Remaining downloads error:", error);
    res.status(500).json({ error: "Failed to get remaining downloads" });
  }
});

// Get remaining downloads for anonymous users (now using session ID)
router.post("/remaining", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }

    let anonymousSession = await AnonymousSession.findOne({ sessionId });

    if (!anonymousSession) {
      // Create new session if none exists
      anonymousSession = new AnonymousSession({
        sessionId,
        dailyDownloads: { count: 0, resetDate: new Date() },
      });
      await anonymousSession.save();
    }

    // Check if it's a new day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resetDate = new Date(anonymousSession.dailyDownloads.resetDate);
    resetDate.setHours(0, 0, 0, 0);

    if (today.getTime() !== resetDate.getTime()) {
      anonymousSession.dailyDownloads.count = 0;
      anonymousSession.dailyDownloads.resetDate = new Date();
      await anonymousSession.save();
    }

    const limit = 5; // Anonymous limit
    const current = anonymousSession.dailyDownloads.count;
    const remaining = Math.max(0, limit - current);

    console.log("Remaining downloads check for anonymous:", {
      sessionId,
      current,
      remaining,
      limit,
      resetDate: anonymousSession.dailyDownloads.resetDate,
    });

    res.json({
      isAuthenticated: false,
      userType: "anonymous",
      current,
      remaining,
      limit,
    });
  } catch (error) {
    console.error("Remaining downloads error:", error);
    res.status(500).json({ error: "Failed to get remaining downloads" });
  }
});

// Validate image URLs
router.post("/validate", async (req, res) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: "Please provide an array of URLs" });
    }

    const validations = [];

    for (const url of urls) {
      try {
        const response = await axios.head(url, {
          timeout: 10000,
        });

        const contentType = response.headers["content-type"];
        const isValidImage = contentType && contentType.startsWith("image/");
        const contentLength = response.headers["content-length"];

        validations.push({
          url,
          valid: isValidImage,
          contentType,
          contentLength: contentLength ? parseInt(contentLength) : null,
          accessible: true,
        });
      } catch (error) {
        validations.push({
          url,
          valid: false,
          accessible: false,
          error: error.message,
        });
      }
    }

    res.json({
      validations,
      summary: {
        total: urls.length,
        valid: validations.filter((v) => v.valid).length,
        accessible: validations.filter((v) => v.accessible).length,
      },
    });
  } catch (error) {
    console.error("Validation error:", error);
    res.status(500).json({ error: "Failed to validate URLs" });
  }
});

export default router;
