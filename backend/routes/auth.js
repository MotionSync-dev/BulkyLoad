import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PendingUser from '../models/PendingUser.js';
import { validateRegistration, validateLogin } from '../middleware/auth.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const router = express.Router();

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    console.log('🚀 Starting registration for:', { username, email });

    // Check if user already exists (either pending or verified)
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const existingPendingUser = await PendingUser.findByEmail(email);
    if (existingPendingUser) {
      return res.status(400).json({ error: 'Verification email already sent. Please check your email or request a new code.' });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const existingPendingUsername = await PendingUser.findByUsername(username);
    if (existingPendingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Create verification code
    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    console.log('📝 Creating pending user...');

    // Create pending user (not actual user yet)
    const pendingUser = await PendingUser.create({ 
      username, 
      email, 
      password, 
      verificationCode: code,
      verificationCodeExpiresAt: expiresAt
    });

    console.log('✅ Pending user created, sending email asynchronously...');

    // Send email with code ASYNCHRONOUSLY (don't wait for it)
    sendVerificationEmail(email, code, username).catch(error => {
      console.error('❌ Failed to send verification email:', error);
      // Note: We don't delete the pending user here to avoid race conditions
      // The user can still verify with the code they might receive
    });

    // Respond immediately to user
    res.status(201).json({
      message: 'Registration successful! Check your email for verification code.',
      pendingUserId: pendingUser._id,
      email: pendingUser.email,
      username: pendingUser.username,
      requiresVerification: true,
      note: 'If you don\'t receive the email within 2 minutes, check your spam folder or request a new code.'
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Async function to send verification email
async function sendVerificationEmail(email, code, username) {
  try {
    console.log('📧 Sending verification email to:', email);
    
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

    const mailOptions = {
      from: process.env.MAIL_FROM || 'no-reply@bulkyload.app',
      to: email,
      subject: 'Your BulkyLoad verification code',
      text: `Hi ${username}!\n\nYour verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nThe BulkyLoad Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to BulkyLoad! 🎉</h2>
          <p>Hi <strong>${username}</strong>,</p>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 4px;">${code}</h1>
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

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully to:', email, 'Message ID:', result.messageId);
    
  } catch (error) {
    console.error('❌ Failed to send verification email to:', email, 'Error:', error.message);
    // Don't throw - this is handled gracefully
  }
}

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt for email:', email);

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('✅ User found:', { id: user.id, username: user.username, emailVerified: user.emailVerified });

    // Check password
    console.log('🔒 Comparing passwords...');
    const isValidPassword = await user.comparePassword(password);
    console.log('🔑 Password comparison result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('✅ Password valid for user:', email);

    // Block login if not verified
    if (!user.emailVerified) {
      console.log('⚠️ Email not verified for user:', email);
      return res.status(403).json({ error: 'Email not verified', requiresVerification: true, userId: user.id, email: user.email });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('🎉 Login successful for user:', email);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Verify email code and create actual user
router.post('/verify', async (req, res) => {
  try {
    const { pendingUserId, code } = req.body;
    
    if (!pendingUserId || !code) {
      return res.status(400).json({ error: 'Pending user ID and verification code are required' });
    }

    console.log('🔍 Verifying code for pending user:', pendingUserId);

    const pendingUser = await PendingUser.findById(pendingUserId);
    if (!pendingUser) {
      return res.status(404).json({ error: 'Pending user not found or verification expired' });
    }

    if (new Date() > pendingUser.verificationCodeExpiresAt) {
      // Clean up expired pending user
      await PendingUser.findByIdAndDelete(pendingUserId);
      return res.status(400).json({ error: 'Verification code expired. Please register again.' });
    }

    if (pendingUser.verificationCode !== String(code)) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    console.log('✅ Code verified, creating user account...');

    // Create actual user
    const newUser = await User.create({
      username: pendingUser.username,
      email: pendingUser.email,
      password: pendingUser.password, // Already hashed
      emailVerified: true
    });
    
    // Delete pending user
    await PendingUser.findByIdAndDelete(pendingUserId);

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('🎉 User account created successfully:', newUser.username);

    res.json({ 
      message: 'Email verified successfully. Account created!', 
      token, 
      user: { 
        id: newUser.id, 
        email: newUser.email, 
        username: newUser.username 
      } 
    });
  } catch (error) {
    console.error('❌ Verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Resend verification code
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('📧 Resending verification code to:', email);

    // Find pending user
    const pendingUser = await PendingUser.findByEmail(email);
    if (!pendingUser) {
      return res.status(404).json({ error: 'No pending registration found for this email' });
    }

    // Check if code is still valid
    if (new Date() > pendingUser.verificationCodeExpiresAt) {
      // Generate new code
      const newCode = (Math.floor(100000 + Math.random() * 900000)).toString();
      const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      pendingUser.verificationCode = newCode;
      pendingUser.verificationCodeExpiresAt = newExpiresAt;
      await pendingUser.save();
      
      console.log('🔄 Generated new verification code for:', email);
    }

    // Send email asynchronously
    sendVerificationEmail(email, pendingUser.verificationCode, pendingUser.username).catch(error => {
      console.error('❌ Failed to resend verification email:', error);
    });

    res.json({ 
      message: 'Verification code resent successfully. Check your email.',
      note: 'If you don\'t receive the email within 2 minutes, check your spam folder.'
    });

  } catch (error) {
    console.error('❌ Resend code error:', error);
    res.status(500).json({ error: 'Failed to resend verification code' });
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