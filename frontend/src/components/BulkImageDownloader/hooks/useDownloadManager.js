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
   */
  const downloadViaBackend = useCallback(
    async (urls, onSuccess, onError) => {
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

        const response = await api.post(
          endpoints.download.images,
          {
            urls: urls,
          },
          config
        );

        const { results, summary, downloads } = response.data;

        // Process downloads and create ZIP
        if (downloads && downloads.length > 0) {
          const result = await processImageDownloads(downloads, summary);

          if (result.success) {
            showSuccess(result.message);
            onSuccess?.(result);
          } else {
            throw new Error(result.message || "Failed to process downloads");
          }
        } else {
          throw new Error("No downloads received from server");
        }

        return { results, summary, downloads };
      } catch (error) {
        const errorInfo = handleError(error, "downloadViaBackend", {
          showToast: false,
        });
        setError(errorInfo.message);
        onError?.(errorInfo);

        // Handle specific error types
        if (error.response?.status === 403) {
          const errorData = error.response.data;
          if (errorData.error === "Download limit exceeded") {
            showError(
              `Download limit exceeded. ${
                errorData.limits?.remaining || 0
              } downloads remaining today.`
            );
          } else if (errorData.error?.includes("Anonymous users")) {
            showError(
              `Daily limit exceeded. You have ${
                errorData.remaining || 0
              } downloads remaining. Please sign in for unlimited downloads.`
            );
          } else if (errorData.error?.includes("Registered users")) {
            showError(
              `Daily limit exceeded. You have ${
                errorData.limits?.remaining || 0
              } downloads remaining. Subscribe for unlimited downloads.`
            );
          } else {
            showError(errorData.error || "Download limit exceeded");
          }
        } else {
          showError("Failed to download images via backend");
        }

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
