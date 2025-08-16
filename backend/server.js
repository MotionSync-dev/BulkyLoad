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

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (corsOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With",
    "Cache-Control",
    "Pragma",
    "Accept",
    "Origin"
  ],
  exposedHeaders: ["Content-Length", "X-Requested-With"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // Cache preflight response for 24 hours
};

app.use(cors(corsOptions));

// Enhanced security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://gumroad.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: "deny" },
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// Additional security headers
app.use((req, res, next) => {
  // X-Frame-Options: DENY (clickjacking protection)
  res.setHeader('X-Frame-Options', 'DENY');
  
  // X-Content-Type-Options: nosniff (MIME type sniffing protection)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-XSS-Protection: 1; mode=block (XSS protection)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Permissions-Policy (feature policy)
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
});

// Request logging middleware for production
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer')
      };
      
      // Log in structured format for production
      if (res.statusCode >= 400) {
        console.error('🚨 Error Request:', JSON.stringify(logData));
      } else {
        console.log('📝 Request:', JSON.stringify(logData));
      }
    });
    
    next();
  });
}

// Handle preflight requests explicitly for all API routes
app.options("*", cors(corsOptions));

// Additional preflight handling for specific routes with explicit CORS
app.options("/api/*", cors(corsOptions));
app.options("/api/auth/*", cors(corsOptions));
app.options("/api/download/*", cors(corsOptions));
app.options("/api/subscription/*", cors(corsOptions));
app.options("/api/user/*", cors(corsOptions));
app.options("/api/gumroad-webhook", cors(corsOptions));
app.options("/api/gumroad-webhook/*", cors(corsOptions));

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
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
