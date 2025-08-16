import { useState, useCallback } from "react";

/**
 * Custom hook for managing download history
 * @returns {Object} Download history state and methods
 */
export const useDownloadHistory = () => {
  const [downloadHistory, setDownloadHistory] = useState([]);

  /**
   * Add a new download entry to history
   * @param {Object} downloadData - Download information
   * @param {number} downloadData.totalCount - Total URLs processed
   * @param {number} downloadData.successCount - Successfully downloaded images
   * @param {number} downloadData.failedCount - Failed downloads
   * @param {Array} downloadData.results - Detailed results for each URL
   */
  const addDownloadEntry = useCallback((downloadData) => {
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      totalCount: downloadData.totalCount || 0,
      successCount: downloadData.successCount || 0,
      failedCount: downloadData.failedCount || 0,
      results: downloadData.results || [],
      date: new Date(),
    };

    setDownloadHistory((prev) => [newEntry, ...prev.slice(0, 49)]); // Keep last 50 entries
  }, []);

  /**
   * Clear all download history
   */
  const clearHistory = useCallback(() => {
    setDownloadHistory([]);
  }, []);

  /**
   * Remove a specific download entry
   * @param {number} entryId - ID of the entry to remove
   */
  const removeEntry = useCallback((entryId) => {
    setDownloadHistory((prev) => prev.filter((entry) => entry.id !== entryId));
  }, []);

  /**
   * Get download statistics
   * @returns {Object} Statistics object
   */
  const getStats = useCallback(() => {
    if (downloadHistory.length === 0) {
      return {
        totalDownloads: 0,
        totalImages: 0,
        successRate: 0,
        averageImagesPerDownload: 0,
        lastDownload: null,
      };
    }

    const totalDownloads = downloadHistory.length;
    const totalImages = downloadHistory.reduce(
      (sum, entry) => sum + entry.successCount,
      0
    );
    const totalAttempted = downloadHistory.reduce(
      (sum, entry) => sum + entry.totalCount,
      0
    );
    const successRate =
      totalAttempted > 0
        ? ((totalImages / totalAttempted) * 100).toFixed(1)
        : 0;
    const averageImagesPerDownload =
      totalDownloads > 0 ? (totalImages / totalDownloads).toFixed(1) : 0;
    const lastDownload = downloadHistory[0]?.date || null;

    return {
      totalDownloads,
      totalImages,
      successRate: parseFloat(successRate),
      averageImagesPerDownload: parseFloat(averageImagesPerDownload),
      lastDownload,
    };
  }, [downloadHistory]);

  /**
   * Get recent downloads (last N entries)
   * @param {number} count - Number of recent entries to return
   * @returns {Array} Recent download entries
   */
  const getRecentDownloads = useCallback(
    (count = 10) => {
      return downloadHistory.slice(0, count);
    },
    [downloadHistory]
  );

  /**
   * Get downloads for a specific date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Downloads within the date range
   */
  const getDownloadsByDateRange = useCallback(
    (startDate, endDate) => {
      return downloadHistory.filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });
    },
    [downloadHistory]
  );

  /**
   * Export download history as JSON
   */
  const exportHistory = useCallback(() => {
    try {
      const dataStr = JSON.stringify(downloadHistory, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `download-history-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export download history:", error);
    }
  }, [downloadHistory]);

  return {
    // State
    downloadHistory,

    // Methods
    addDownloadEntry,
    clearHistory,
    removeEntry,
    getStats,
    getRecentDownloads,
    getDownloadsByDateRange,
    exportHistory,

    // Computed values
    stats: getStats(),
    hasHistory: downloadHistory.length > 0,
    totalEntries: downloadHistory.length,
  };
};
