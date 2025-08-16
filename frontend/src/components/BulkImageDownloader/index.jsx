import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useUserData } from "./hooks/useUserData";
import { useDownloadHistory } from "./hooks/useDownloadHistory";
import { useDownloadManager } from "./hooks/useDownloadManager";
import { showSuccess, showError } from "../../utils/errorHandler";
import api, { endpoints } from "../../utils/api";
import {
  Download,
  Upload,
  FileText,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  History,
  BarChart3,
} from "lucide-react";

/**
 * Main BulkImageDownloader component
 * Handles image URL input, file uploads, and download operations
 */
const BulkImageDownloader = () => {
  const { isAuthenticated } = useAuth();
  const [urls, setUrls] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const fileInputRef = useRef(null);

  // Custom hooks
  const userData = useUserData();
  const downloadHistory = useDownloadHistory();
  const downloadManager = useDownloadManager();

  // Event handlers
  const handleUrlInput = (e) => {
    setUrls(e.target.value);
    downloadManager.clearError();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log(
      "File selected:",
      file.name,
      "Size:",
      file.size,
      "Type:",
      file.type
    );

    // Check file size (max 1MB)
    if (file.size > 1024 * 1024) {
      showError("File too large. Please use a file smaller than 1MB.");
      return;
    }

    // Check file type - be more lenient with file types
    const allowedTypes = ["text/plain", "text/csv", "application/csv", ""];
    const allowedExtensions = [".txt", ".csv", ".list", ".urls"];
    const hasValidType =
      allowedTypes.includes(file.type) ||
      allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidType) {
      showError(
        "Please upload a text file (.txt, .csv, .list, .urls) or a file with URLs."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      console.log("File content loaded, length:", event.target.result.length);
      console.log(
        "Raw content preview:",
        event.target.result.substring(0, 200)
      );

      let content = event.target.result;

      // Handle different line endings (Windows \r\n, Mac \r, Unix \n)
      content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      // Remove empty lines and trim
      content = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("\n");

      console.log("Processed content length:", content.length);
      console.log("Number of non-empty lines:", content.split("\n").length);

      if (content.length === 0) {
        showError(
          "File appears to be empty or contains no valid URLs. Please check the file content."
        );
        return;
      }

      setUrls(content);
      setUploadedFileName(file.name);
      downloadManager.clearError();
      console.log(
        "File uploaded successfully with",
        content.split("\n").length,
        "lines"
      );
    };

    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      showError("Failed to read file. Please try again.");
    };

    // Try to read with UTF-8 encoding first, fallback to other methods
    try {
      reader.readAsText(file, "UTF-8");
    } catch (encodingError) {
      console.log("UTF-8 failed, trying default encoding...");
      reader.readAsText(file);
    }
  };

  const handleDownload = async () => {
    const urlList = urls
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urlList.length === 0) {
      showError("Please enter at least one URL");
      return;
    }

    // Check download limits before starting
    if (!userData.canDownload(urlList.length)) {
      const downloadInfo = userData.getDownloadInfo();
      showError(`Download limit exceeded. ${downloadInfo.message}`);
      return;
    }

    try {
      const result = await downloadManager.downloadViaBackend(
        urlList,
        // Success callback
        (downloadResult) => {
          // Add to download history
          downloadHistory.addDownloadEntry({
            totalCount: urlList.length,
            successCount: downloadResult.summary?.successful || 0,
            failedCount: downloadResult.summary?.failed || 0,
            results: downloadResult.results || [],
            urls: urlList, // Add the URLs to the history
          });

          // Refresh user data (for both authenticated and anonymous users)
          userData.refreshUserData();

          // Show success message - only if we actually have successful downloads
          const successfulCount = downloadResult.summary?.successful || 0;
          if (successfulCount > 0) {
            showSuccess(
              `Download completed! ${successfulCount} images downloaded.`
            );
          }
        },
        // Error callback
        (errorInfo) => {
          console.error("Download failed:", errorInfo);
        },
        // Pass anonymous session ID for anonymous users
        userData.anonymousSessionId
      );

      return result;
    } catch (error) {
      console.error("Download operation failed:", error);
    }
  };

  const validateUrlsLocally = async () => {
    const urlList = urls
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urlList.length === 0) {
      showError("Please enter at least one URL");
      return;
    }

    try {
      const response = await api.post(endpoints.download.validate, {
        urls: urlList,
      });

      const { validations, summary } = response.data;
      const validUrls = validations.filter((v) => v.valid).map((v) => v.url);

      setPreviewUrls(validUrls);
      setShowPreview(true);

      showSuccess(
        `Found ${summary.valid} valid images out of ${summary.total} URLs`
      );
    } catch (error) {
      showError("Failed to validate URLs");
    }
  };

  const openImagesInTabs = () => {
    const urlList = urls
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    urlList.forEach((url) => {
      window.open(url, "_blank");
    });
  };

  // Listen for webhook updates
  useEffect(() => {
    const handleWebhookUpdate = () => {
      console.log("🔄 Webhook update detected, refreshing data...");
      userData.refreshUserData();
    };

    window.addEventListener("subscription-updated", handleWebhookUpdate);

    return () => {
      window.removeEventListener("subscription-updated", handleWebhookUpdate);
    };
  }, [userData]);

  return (
    <div className="space-y-6">
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column - Input */}
        <div className="lg:col-span-2 space-y-6">
          {/* URL Input Section */}
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Enter Image URLs
              </h2>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-sm px-3 py-2 flex items-center justify-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Upload File</span>
                  <span className="sm:hidden">Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,.list,.urls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {uploadedFileName && (
                  <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                    📎 {uploadedFileName}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <textarea
                id="urls"
                value={urls}
                onChange={handleUrlInput}
                placeholder="Enter image URLs here, one per line...&#10;Example:&#10;https://example.com/image1.jpg&#10;https://example.com/image2.png"
                rows={8}
                disabled={downloadManager.isDownloading}
                className="input-field resize-none whitespace-pre overflow-x-auto text-sm sm:text-base"
                wrap="off"
              />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="text-sm text-gray-600">
                  {urls.split("\n").filter((url) => url.trim()).length} URLs
                  entered
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={validateUrlsLocally}
                    disabled={!urls.trim() || downloadManager.isDownloading}
                    className="btn-secondary text-sm px-3 py-2"
                  >
                    Validate URLs
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={!urls.trim() || downloadManager.isDownloading}
                    className="btn-primary text-sm px-3 py-2 flex items-center justify-center space-x-2"
                  >
                    {downloadManager.isDownloading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download All</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Download Progress */}
          {downloadManager.isInProgress && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Download Progress
              </h3>
              <div className="space-y-3">
                {Object.entries(downloadManager.downloadProgress).map(
                  ([index, progress], i) => {
                    const url = urls.split("\n")[parseInt(index)];
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 truncate flex-1">
                            {url}
                          </span>
                          <span className="text-gray-900 ml-2">
                            {progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              progress === 100
                                ? "bg-green-500"
                                : "bg-primary-600"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {downloadManager.hasError && (
            <div className="card border-l-4 border-red-500 bg-red-50">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">
                    {downloadManager.error}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Stats & History */}
        <div className="space-y-6">
          {/* Subscription Status */}
          {isAuthenticated && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Subscription Status
                </h3>
                <button
                  onClick={userData.refreshUserData}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:bg-primary-50 px-2 py-1 rounded transition-colors"
                  title="Refresh subscription status"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current Plan:</span>
                  <span className="font-medium text-primary-600">
                    {userData.isProUser ? "Pro" : "Free"}
                  </span>
                </div>
                {userData.isProUser && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-green-600">Active</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Daily Limit:</span>
                  <span className="font-medium">
                    {userData.downloadInfo.limit}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Download Limits */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Download Limits
              </h3>
              <button
                onClick={userData.refreshUserData}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:bg-primary-50 px-2 py-1 rounded transition-colors"
                title="Refresh download counts"
              >
                🔄 Refresh
              </button>
            </div>
            {userData.remainingDownloads ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Today's Downloads:</span>
                  <span className="font-medium">
                    {userData.remainingDownloads.current}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-medium text-primary-600">
                    {userData.downloadInfo.remaining}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Daily Limit:</span>
                  <span className="font-medium">
                    {userData.downloadInfo.limit}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Loading...</div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={openImagesInTabs}
                disabled={!urls.trim()}
                className="w-full btn-secondary text-sm px-3 py-2 flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in Tabs</span>
              </button>
              <button
                onClick={downloadHistory.clearHistory}
                disabled={!downloadHistory.hasHistory}
                className="w-full btn-error text-sm px-3 py-2 flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear History</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Download History */}
      {downloadHistory.hasHistory && (
        <div className="mt-8">
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
              <h2 className="text-xl font-semibold text-gray-900">
                Download History
              </h2>
              <button
                onClick={downloadHistory.clearHistory}
                className="btn-error text-sm px-3 py-2"
              >
                Clear All
              </button>
            </div>

            <div className="overflow-x-auto">
              <div className="space-y-4">
                {downloadHistory.getRecentDownloads(10).map((item, index) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-900">
                        Download #{item.id}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Download Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                      <div className="text-center">
                        <div className="text-gray-600">Total</div>
                        <div className="font-medium">{item.totalCount}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-600">Success</div>
                        <div className="font-medium text-green-600">
                          {item.successCount}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-600">Failed</div>
                        <div className="font-medium text-red-600">
                          {item.failedCount}
                        </div>
                      </div>
                    </div>

                    {/* Image URLs */}
                    {item.urls && item.urls.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">
                          Downloaded Images:
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {item.urls.map((url, urlIndex) => (
                            <div
                              key={urlIndex}
                              className="text-xs text-gray-600 bg-white p-2 rounded border truncate"
                            >
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary-600 hover:underline break-all"
                                title={url}
                              >
                                {url}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImageDownloader;
