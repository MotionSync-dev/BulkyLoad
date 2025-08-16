import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import api, { endpoints } from "../../../utils/api";
import { handleError, showSuccess } from "../../../utils/errorHandler";

/**
 * Custom hook for managing user data, stats, and subscription information
 * @returns {Object} User data state and methods
 */
export const useUserData = () => {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState(null);
  const [remainingDownloads, setRemainingDownloads] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch user statistics
   */
  const fetchUserStats = useCallback(async () => {
    if (!isAuthenticated) {
      setStats(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("🔄 Fetching user stats...");
      const response = await api.get(endpoints.user.stats);

      console.log("✅ Stats response:", response.data);
      setStats(response.data.stats);
    } catch (error) {
      const errorInfo = handleError(error, "fetchUserStats", {
        showToast: false,
      });
      setError(errorInfo);
      console.error("❌ Failed to fetch user stats:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Fetch remaining downloads for user
   */
  const fetchRemainingDownloads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("=== FETCH REMAINING DOWNLOADS DEBUG ===");
      console.log("isAuthenticated:", isAuthenticated);

      // Reset while fetching to avoid showing stale data
      setRemainingDownloads(null);

      if (isAuthenticated) {
        console.log("Making authenticated API call...");
        const response = await api.get(endpoints.download.remaining);
        console.log("✅ Authenticated user download response:", response.data);
        setRemainingDownloads(response.data);
      } else {
        console.log("Anonymous user, fetching download count");
        const response = await api.get(endpoints.download.remaining);
        console.log("✅ Anonymous user download response:", response.data);
        setRemainingDownloads(response.data);
      }
    } catch (error) {
      const errorInfo = handleError(error, "fetchRemainingDownloads", {
        showToast: false,
      });
      setError(errorInfo);
      console.error("❌ Failed to fetch remaining downloads:", error);

      // Safer defaults on error: never assume Unlimited
      const fallbackData = {
        current: 0,
        remaining: isAuthenticated ? 10 : 5,
        limit: isAuthenticated ? 10 : 5,
        error: true,
      };
      console.log("Setting fallback data:", fallbackData);
      setRemainingDownloads(fallbackData);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Refresh all user data
   */
  const refreshUserData = useCallback(async () => {
    console.log("🔄 Refreshing user data...");
    
    try {
      // Always refresh download limits (works for both authenticated and anonymous users)
      await fetchRemainingDownloads();
      
      // Only fetch user stats for authenticated users
      if (isAuthenticated) {
        await fetchUserStats();
      }
      
      showSuccess("User data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing user data:", error);
      // Don't show error toast for anonymous users
      if (isAuthenticated) {
        showSuccess("User data refreshed successfully");
      }
    }
  }, [fetchRemainingDownloads, fetchUserStats, isAuthenticated]);

  /**
   * Check if user can download specified number of images
   */
  const canDownload = useCallback(
    (urlCount) => {
      if (!remainingDownloads) return false;

      if (remainingDownloads.limit === "Unlimited") return true;

      const remaining = remainingDownloads.remaining;
      return remaining >= urlCount;
    },
    [remainingDownloads]
  );

  /**
   * Get download limit information
   */
  const getDownloadInfo = useCallback(() => {
    if (!remainingDownloads) {
      return {
        canDownload: false,
        remaining: 0,
        limit: "Loading...",
        message: "Loading download information...",
      };
    }

    const { current, remaining, limit } = remainingDownloads;

    if (limit === "Unlimited") {
      return {
        canDownload: true,
        remaining: "Unlimited",
        limit: "∞ Unlimited",
        message: "Unlimited downloads available",
      };
    }

    return {
      canDownload: remaining > 0,
      remaining,
      limit,
      message: `${remaining} downloads remaining today`,
    };
  }, [remainingDownloads]);

  // Fetch data on mount and when authentication changes
  useEffect(() => {
    fetchRemainingDownloads();
    if (isAuthenticated) {
      fetchUserStats();
    }
  }, [isAuthenticated, fetchRemainingDownloads, fetchUserStats]);

  // No automatic periodic refresh - only manual refresh via buttons

  return {
    // State
    stats,
    remainingDownloads,
    loading,
    error,

    // Methods
    fetchUserStats,
    fetchRemainingDownloads,
    refreshUserData,
    canDownload,
    getDownloadInfo,

    // Computed values
    downloadInfo: getDownloadInfo(),
    isProUser: remainingDownloads?.limit === "Unlimited",
    hasError: !!error,
  };
};
