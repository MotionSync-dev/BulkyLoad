import axios from "axios";

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to auth
      localStorage.removeItem("token");
      window.location.href = "/auth";
    }

    // Log error for debugging
    console.error("API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  download: {
    images: "/api/download/images",
    remaining: "/api/download/remaining",
    validate: "/api/download/validate",
    history: "/api/download/history",
  },
  user: {
    stats: "/api/user/stats",
    profile: "/api/user/profile",
  },
  subscription: {
    status: "/api/subscription/status",
    gumroadProduct: "/api/subscription/gumroad/product",
  },
  auth: {
    profile: "/api/auth/profile",
  },
};

export default api;
