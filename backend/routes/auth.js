import express from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PendingUser from '../models/PendingUser.js';
import { validateRegistration, validateLogin } from '../middleware/auth.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const router = express.Router();

// CORS middleware for auth routes
const authCorsOptions = {
  origin: process.env.NODE_ENV === "production"
    ? [process.env.CORS_ORIGIN].filter(Boolean)
    : ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 204
};

router.use(cors(authCorsOptions));
router.options("*", cors(authCorsOptions));

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  // Add connection timeout
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,   // 10 seconds
  socketTimeout: 10000      // 10 seconds
});

// Helper function to send verification email
const sendVerificationEmail = async (email, verificationCode) => {
  const mailOptions = {
    from: process.env.MAIL_FROM || 'no-reply@bulkyload.app',
    to: email,
    subject: 'Your BulkyLoad verification code',
    text: `Hi!\n\nYour verification code is: ${verificationCode}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nThe BulkyLoad Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to BulkyLoad! 🎉</h2>
        <p>Hi <strong>${email.split('@')[0]}</strong>,</p>
        <p>Your verification code is:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 4px;">${verificationCode}</h1>
        </div>
        <p><strong>⚠️ This code expires in 15 minutes.</strong></p>
        <p>Enter this code in the app to complete your registration and start downloading images!</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          If you didn't request this code, please ignore this email.<br>
          Best regards,<br>
          The BulkyLoad Team
        </p>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send verification email to ${email}:`, error);
  }
};

// Helper function to send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.MAIL_FROM || 'no-reply@bulkyload.app',
    to: email,
    subject: 'Your BulkyLoad password reset code',
    text: `Hi!\n\nYour password reset code is: ${resetToken}\n\nThis code expires in 1 hour.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nThe BulkyLoad Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hi <strong>${email.split('@')[0]}</strong>,</p>
        <p>You requested a password reset for your BulkyLoad account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't request a password reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          Best regards,<br>
          The BulkyLoad Team
        </p>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send password reset email to ${email}:`, error);
    return false;
  }
};

// Register user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.email === email ? 'Email already registered' : 'Username already taken' 
      });
    }

    // Generate verification code
    const verificationCode = (Math.floor(100000 + Math.random() * 900000)).toString();
    
    // Create pending user
    const pendingUser = new PendingUser({
      username,
      email,
      password,
      verificationCode,
      verificationCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      sessionId: req.body.sessionId || null
    });

    await pendingUser.save();

    // Send verification email (asynchronous)
    sendVerificationEmail(email, verificationCode);

    res.status(201).json({ 
      message: 'Registration successful! Please check your email for verification code.',
      requiresVerification: true,
      pendingUserId: pendingUser._id,
      email: email,
      username: username
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify email
router.post('/verify', async (req, res) => {
  try {
    const { pendingUserId, code } = req.body;

    const pendingUser = await PendingUser.findById(pendingUserId);

    if (!pendingUser) {
      return res.status(400).json({ error: 'Invalid verification request' });
    }

    if (pendingUser.verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Check if code matches
    if (pendingUser.verificationCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Check if code is expired (15 minutes)
    const now = new Date();
    if (pendingUser.verificationCodeExpiresAt < now) {
      await PendingUser.findByIdAndDelete(pendingUser._id);
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Create verified user
    const user = new User({
      username: pendingUser.username,
      email: pendingUser.email,
      password: pendingUser.password,
      emailVerified: true,
      sessionId: pendingUser.sessionId
    });

    await user.save();
    await PendingUser.findByIdAndDelete(pendingUser._id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Email verified successfully!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Resend verification code
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;

    const pendingUser = await PendingUser.findOne({ email, verified: false });
    if (!pendingUser) {
      return res.status(400).json({ error: 'No pending verification found for this email' });
    }

    // Generate new verification code
    const newVerificationCode = (Math.floor(100000 + Math.random() * 900000)).toString();
    pendingUser.verificationCode = newVerificationCode;
    pendingUser.verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await pendingUser.save();

    // Send new verification email (asynchronous)
    sendVerificationEmail(email, newVerificationCode);

    res.json({ message: 'New verification code sent to your email' });
  } catch (error) {
    console.error('Resend code error:', error);
    res.status(500).json({ error: 'Failed to resend verification code' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(email, resetToken);
    
    if (emailSent) {
      res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } else {
      res.status(500).json({ error: 'Failed to send password reset email' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(8);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Clear reset token
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.updatedAt = new Date();
    
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new token
    const newToken = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Debug endpoint - list all users (remove in production)
router.get('/debug/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username email emailVerified createdAt');
    const pendingUsers = await PendingUser.find({}, 'username email createdAt');
    
    res.json({
      users: users.map(u => ({
        id: u._id,
        username: u.username,
        email: u.email,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt
      })),
      pendingUsers: pendingUsers.map(u => ({
        id: u._id,
        username: u.username,
        email: u.email,
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: 'Failed to get debug info' });
  }
});

export default router; 