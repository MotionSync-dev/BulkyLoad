import toast from "react-hot-toast";

/**
 * Error types for consistent error handling
 */
export const ErrorTypes = {
  DOWNLOAD_LIMIT: "DOWNLOAD_LIMIT",
  NETWORK_ERROR: "NETWORK_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTH_ERROR: "AUTH_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

/**
 * Error messages for different error types
 */
export const ErrorMessages = {
  [ErrorTypes.DOWNLOAD_LIMIT]: {
    anonymous:
      "Anonymous users can only download up to 5 images per day. Please sign in for 10 downloads per day or subscribe for unlimited downloads.",
    registered: "Daily limit exceeded. Subscribe for unlimited downloads.",
    pro: "Download limit exceeded. Please try again later.",
  },
  [ErrorTypes.NETWORK_ERROR]:
    "Network error. Please check your connection and try again.",
  [ErrorTypes.VALIDATION_ERROR]:
    "Invalid input. Please check your URLs and try again.",
  [ErrorTypes.AUTH_ERROR]: "Authentication error. Please sign in again.",
  [ErrorTypes.UNKNOWN_ERROR]: "An unexpected error occurred. Please try again.",
};

/**
 * Handle API errors and show appropriate user feedback
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @param {Object} options - Additional options for error handling
 */
export const handleError = (error, context = "Unknown", options = {}) => {
  const { showToast = true, logError = true, fallbackMessage } = options;

  // Log error for debugging
  if (logError) {
    console.error(`Error in ${context}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      stack: error.stack,
    });
  }

  // Determine error type
  let errorType = ErrorTypes.UNKNOWN_ERROR;
  let userMessage = fallbackMessage;

  if (error.response?.status === 403) {
    errorType = ErrorTypes.DOWNLOAD_LIMIT;
    const errorData = error.response.data;

    if (errorData.error?.includes("Anonymous users")) {
      userMessage = ErrorMessages[ErrorTypes.DOWNLOAD_LIMIT].anonymous;
    } else if (errorData.error?.includes("Registered users")) {
      userMessage = ErrorMessages[ErrorTypes.DOWNLOAD_LIMIT].registered;
    } else {
      userMessage = ErrorMessages[ErrorTypes.DOWNLOAD_LIMIT].pro;
    }
  } else if (error.response?.status === 401) {
    errorType = ErrorTypes.AUTH_ERROR;
    userMessage = ErrorMessages[ErrorTypes.AUTH_ERROR];
  } else if (
    error.code === "ERR_NETWORK" ||
    error.message.includes("Network Error")
  ) {
    errorType = ErrorTypes.NETWORK_ERROR;
    userMessage = ErrorMessages[ErrorTypes.NETWORK_ERROR];
  } else if (error.response?.status === 400) {
    errorType = ErrorTypes.VALIDATION_ERROR;
    userMessage = ErrorMessages[ErrorTypes.VALIDATION_ERROR];
  }

  // Show toast notification
  if (showToast) {
    toast.error(userMessage);
  }

  return {
    type: errorType,
    message: userMessage,
    originalError: error,
    context,
  };
};

/**
 * Show success toast with consistent styling
 * @param {string} message - Success message
 * @param {Object} options - Toast options
 */
export const showSuccess = (message, options = {}) => {
  toast.success(message, {
    duration: 3000,
    ...options,
  });
};

/**
 * Show error toast with consistent styling
 * @param {string} message - Error message
 * @param {Object} options - Toast options
 */
export const showError = (message, options = {}) => {
  toast.error(message, {
    duration: 5000,
    ...options,
  });
};

/**
 * Validate URLs before processing
 * @param {string[]} urls - Array of URLs to validate
 * @returns {Object} Validation result with valid URLs and errors
 */
export const validateUrls = (urls) => {
  const validUrls = [];
  const errors = [];

  urls.forEach((url, index) => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      return; // Skip empty lines
    }

    try {
      const urlObj = new URL(trimmedUrl);
      if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
        validUrls.push(trimmedUrl);
      } else {
        errors.push(`Invalid protocol for URL ${index + 1}: ${trimmedUrl}`);
      }
    } catch (error) {
      errors.push(`Invalid URL format at line ${index + 1}: ${trimmedUrl}`);
    }
  });

  return { validUrls, errors };
};
