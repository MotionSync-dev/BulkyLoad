import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import connectDB from "./config/database.js";
import authRoutes from "./routes/auth.js";
import downloadRoutes from "./routes/download.js";
import userRoutes from "./routes/user.js";
import subscriptionRoutes from "./routes/subscription.js";
import gumroadWebhookRoutes from "./routes/gumroad-webhook.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Render hosting (fixes X-Forwarded-For header issue)
app.set("trust proxy", 1);

// Connect to MongoDB
connectDB();

// Security middleware
const corsOrigins =
  process.env.NODE_ENV === "production"
    ? [
        process.env.CORS_ORIGIN,
        // Add your actual Vercel domain here
        // "https://your-actual-domain.vercel.app",
      ].filter(Boolean)
    : ["http://localhost:5173", "http://localhost:3000"];

console.log("CORS Origins:", corsOrigins);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("CORS_ORIGIN env var:", process.env.CORS_ORIGIN);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Handle preflight requests explicitly
app.options("*", cors());

// Rate limiting - updated for Render hosting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use X-Forwarded-For header from Render
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
});
app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/download", downloadRoutes);
app.use("/api/user", userRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/gumroad-webhook", gumroadWebhookRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(
    `🔑 GUMROAD_PRODUCT_ID: ${process.env.GUMROAD_PRODUCT_ID || "NOT SET"}`
  );
  console.log(
    `🔑 GUMROAD_SELLER_ID: ${process.env.GUMROAD_SELLER_ID || "NOT SET"}`
  );
});
