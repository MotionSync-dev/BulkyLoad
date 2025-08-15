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

    // Create pending user (not actual user yet)
    const pendingUser = await PendingUser.create({ 
      username, 
      email, 
      password, 
      verificationCode: code,
      verificationCodeExpiresAt: expiresAt
    });

    // Send email with code
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.MAIL_FROM || 'no-reply@bulkyload.app',
        to: email,
        subject: 'Your BulkyLoad verification code',
        text: `Your verification code is ${code}. It expires in 15 minutes.`,
        html: `<p>Your verification code is <strong>${code}</strong>. It expires in 15 minutes.</p>`
      });
    } catch (mailError) {
      console.error('Failed to send verification email:', mailError);
      // Delete pending user if email fails
      await PendingUser.findByIdAndDelete(pendingUser._id);
      return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
    }

    res.status(201).json({
      message: 'Registration initiated. Verification code sent to email.',
      pendingUserId: pendingUser._id,
      email: pendingUser.email,
      username: pendingUser.username,
      requiresVerification: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for email:', email);

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('User found:', { id: user.id, username: user.username, emailVerified: user.emailVerified });

    // Check password
    console.log('Comparing passwords...');
    console.log('Input password length:', password.length);
    console.log('Stored password hash length:', user.password.length);
    console.log('Stored password hash starts with:', user.password.substring(0, 10) + '...');
    
    const isValidPassword = await user.comparePassword(password);
    console.log('Password comparison result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('Password valid for user:', email);

    // Block login if not verified
    if (!user.emailVerified) {
      console.log('Email not verified for user:', email);
      return res.status(403).json({ error: 'Email not verified', requiresVerification: true, userId: user.id, email: user.email });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Login successful for user:', email);

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
    console.error('Login error:', error);
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
    console.error('Verification error:', error);
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

    const pendingUser = await PendingUser.findByEmail(email);
    if (!pendingUser) {
      return res.status(404).json({ error: 'No pending registration found for this email' });
    }

    // Generate new code
    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    pendingUser.verificationCode = code;
    pendingUser.verificationCodeExpiresAt = expiresAt;
    await pendingUser.save();

    // Send new email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { 
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS 
      }
    });
    
    await transporter.sendMail({
      from: process.env.MAIL_FROM || 'no-reply@bulkyload.app',
      to: pendingUser.email,
      subject: 'Your new BulkyLoad verification code',
      text: `Your verification code is ${code}. It expires in 15 minutes.`,
      html: `<p>Your verification code is <strong>${code}</strong>. It expires in 15 minutes.</p>`
    });

    res.json({ 
      message: 'Verification code resent',
      pendingUserId: pendingUser._id,
      email: pendingUser.email
    });
  } catch (error) {
    console.error('Resend code error:', error);
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