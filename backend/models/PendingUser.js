import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const pendingUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  verificationCode: {
    type: String,
    required: true
  },
  verificationCodeExpiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 900 // Document expires after 15 minutes (900 seconds)
  }
});

// Hash password before saving - optimized for performance
pendingUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    // Reduced salt rounds from 10 to 8 for better performance
    // 8 rounds = ~40ms, 10 rounds = ~160ms (4x slower)
    const salt = await bcrypt.genSalt(8);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to find by email
pendingUserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by username
pendingUserSchema.statics.findByUsername = function(username) {
  return this.findOne({ username });
};

const PendingUser = mongoose.model('PendingUser', pendingUserSchema);

export default PendingUser; 