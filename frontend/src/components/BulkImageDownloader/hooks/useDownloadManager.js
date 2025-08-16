import { useState, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import api, { endpoints } from "../../../utils/api";
import {
  handleError,
  showSuccess,
  showError,
} from "../../../utils/errorHandler";
import { processImageDownloads } from "../../../utils/imageDownloader";

/**
 * Custom hook for managing download operations
 * @returns {Object} Download manager state and methods
 */
export const useDownloadManager = () => {
  const { isAuthenticated } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [error, setError] = useState("");

  /**
   * Download images via backend API
   * @param {Array} urls - Array of image URLs to download
   * @param {Function} onSuccess - Callback function called on successful download
   * @param {Function} onError - Callback function called on error
   * @param {string} anonymousSessionId - Session ID for anonymous users
   */
  const downloadViaBackend = useCallback(
    async (urls, onSuccess, onError, anonymousSessionId = null) => {
      if (!urls || urls.length === 0) {
        const errorMsg = "Please enter at least one URL";
        setError(errorMsg);
        showError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      setIsDownloading(true);
      setDownloadProgress({});
      setError("");

      try {
        console.log("🚀 Starting download for", urls.length, "URLs");
        console.log("📋 URLs:", urls);
        console.log("🔐 Authenticated:", isAuthenticated);
        console.log("🆔 Anonymous Session ID:", anonymousSessionId);

        // Prepare request payload
        const payload = { urls };
        
        // Include session ID for anonymous users
        if (!isAuthenticated && anonymousSessionId) {
          payload.sessionId = anonymousSessionId;
        }

        // Include auth token if user is authenticated
        const config = {};
        if (isAuthenticated) {
          const token = localStorage.getItem("token");
          if (token) {
            config.headers = {
              Authorization: `Bearer ${token}`,
            };
          }
        }

        console.log("📤 Sending request to backend:", {
          endpoint: endpoints.download.images,
          payload,
          config
        });

        const response = await api.post(
          endpoints.download.images,
          payload,
          config
        );

        console.log("📥 Backend response received:", {
          status: response.status,
          data: response.data,
          results: response.data?.results?.length || 0,
          downloads: response.data?.downloads?.length || 0,
          summary: response.data?.summary
        });

        const { results, summary, downloads } = response.data;

        // Validate response structure
        if (!results || !Array.isArray(results)) {
          throw new Error("Invalid response structure: missing or invalid results array");
        }

        if (!summary || typeof summary !== 'object') {
          throw new Error("Invalid response structure: missing or invalid summary object");
        }

        // Check if we have any successful downloads
        const successfulCount = summary.successful || 0;
        const failedCount = summary.failed || 0;
        const totalCount = summary.total || 0;

        console.log("📊 Download summary:", {
          total: totalCount,
          successful: successfulCount,
          failed: failedCount
        });

        // Process downloads and create ZIP if we have successful downloads
        if (downloads && downloads.length > 0) {
          console.log("📦 Processing", downloads.length, "downloads for ZIP creation");
          
          const result = await processImageDownloads(downloads, summary);

          if (result.success) {
            console.log("✅ ZIP creation successful:", result.message);
            onSuccess?.({ results, summary, downloads, processResult: result });
          } else {
            throw new Error(result.message || "Failed to process downloads");
          }
        } else if (successfulCount > 0) {
          // We have successful downloads but no downloads array (shouldn't happen)
          console.warn("⚠️ No downloads array but successful count > 0:", successfulCount);
          onSuccess?.({ results, summary, downloads: [], processResult: { success: true, message: "Downloads processed" } });
        } else {
          // No successful downloads at all
          console.log("❌ No successful downloads found");
          
          // Check if all downloads failed
          if (failedCount === totalCount) {
            const failedResults = results.filter(r => !r.success);
            const errorMessages = failedResults.map(r => `${r.url}: ${r.error}`).join('; ');
            throw new Error(`All downloads failed: ${errorMessages}`);
          } else {
            throw new Error("No downloads received from server");
          }
        }

        return { results, summary, downloads };
      } catch (error) {
        console.error("❌ Error in downloadViaBackend:", error);
        
        let errorMessage = "Failed to download images";
        let errorDetails = {};

        if (error.response) {
          // Server responded with error status
          const { status, data } = error.response;
          errorDetails = { status, data };
          
          if (status === 403) {
            const errorData = data;
            if (errorData.error === "Download limit exceeded") {
              errorMessage = `Download limit exceeded. ${
                errorData.limits?.remaining || 0
              } downloads remaining today.`;
            } else if (errorData.error?.includes("Anonymous users")) {
              errorMessage = `Daily limit exceeded. You have ${
                errorData.remaining || 0
              } downloads remaining. Please sign in for unlimited downloads.`;
            } else if (errorData.error?.includes("Registered users")) {
              errorMessage = `Daily limit exceeded. You have ${
                errorData.limits?.remaining || 0
              } downloads remaining. Subscribe for unlimited downloads.`;
            } else {
              errorMessage = errorData.error || "Download limit exceeded";
            }
          } else if (status === 400) {
            errorMessage = data.error || "Bad request";
          } else if (status === 500) {
            errorMessage = "Server error occurred";
          } else {
            errorMessage = `Server error (${status}): ${data.error || 'Unknown error'}`;
          }
        } else if (error.request) {
          // Request was made but no response received
          errorMessage = "No response from server. Please check your connection.";
          errorDetails = { type: 'NO_RESPONSE' };
        } else {
          // Something else happened
          errorMessage = error.message || "Unknown error occurred";
          errorDetails = { type: 'UNKNOWN_ERROR', originalError: error };
        }

        setError(errorMessage);
        onError?.({ type: 'UNKNOWN_ERROR', message: errorMessage, originalError: error, details: errorDetails });

        // Show error toast
        showError(errorMessage);

        throw error;
      } finally {
        setIsDownloading(false);
        setDownloadProgress({});
      }
    },
    [isAuthenticated]
  );

  /**
   * Update download progress for a specific URL
   * @param {number} index - Index of the URL
   * @param {number} progress - Progress percentage (0-100)
   */
  const updateProgress = useCallback((index, progress) => {
    setDownloadProgress((prev) => ({
      ...prev,
      [index]: Math.min(100, Math.max(0, progress)),
    }));
  }, []);

  /**
   * Clear download progress
   */
  const clearProgress = useCallback(() => {
    setDownloadProgress({});
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError("");
  }, []);

  /**
   * Get overall download progress
   * @returns {number} Average progress percentage
   */
  const getOverallProgress = useCallback(() => {
    const progressValues = Object.values(downloadProgress);
    if (progressValues.length === 0) return 0;

    const total = progressValues.reduce((sum, progress) => sum + progress, 0);
    return Math.round(total / progressValues.length);
  }, [downloadProgress]);

  /**
   * Check if download is in progress
   * @returns {boolean} True if download is in progress
   */
  const isInProgress = useCallback(() => {
    return isDownloading && Object.keys(downloadProgress).length > 0;
  }, [isDownloading, downloadProgress]);

  /**
   * Get progress information for display
   * @returns {Object} Progress information object
   */
  const getProgressInfo = useCallback(() => {
    const total = Object.keys(downloadProgress).length;
    const completed = Object.values(downloadProgress).filter(
      (p) => p === 100
    ).length;
    const inProgress = total - completed;
    const overallProgress = getOverallProgress();

    return {
      total,
      completed,
      inProgress,
      overallProgress,
      isComplete: completed === total && total > 0,
    };
  }, [downloadProgress, getOverallProgress]);

  return {
    // State
    isDownloading,
    downloadProgress,
    error,

    // Methods
    downloadViaBackend,
    updateProgress,
    clearProgress,
    clearError,

    // Computed values
    overallProgress: getOverallProgress(),
    progressInfo: getProgressInfo(),
    isInProgress: isInProgress(),
    hasError: !!error,
    hasProgress: Object.keys(downloadProgress).length > 0,
  };
};
