import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const downloadHistorySchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  urls: [{
    type: String
  }],
  successCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  },
  totalCount: {
    type: Number,
    default: 0
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  subscription: {
    status: {
      type: String,
      enum: ['free', 'pro'],
      default: 'free'
    },
    expiresAt: Date,
    gumroadId: String
  },
  dailyDownloads: {
    count: {
      type: Number,
      default: 0
    },
    lastReset: {
      type: Date,
      default: Date.now
    }
  },
  downloadHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    urls: [String],
    totalCount: Number,
    successCount: Number,
    failedCount: Number
  }],
  sessionId: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Check if password is already hashed (bcrypt hashes start with $2a$)
  if (this.password.startsWith('$2a$')) {
    console.log('Password already hashed, skipping re-hash');
    return next();
  }
  
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

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update download history
userSchema.methods.updateDownloadHistory = function(downloadData) {
  const historyEntry = {
    id: Date.now(),
    timestamp: new Date(),
    ...downloadData
  };
  
  this.downloadHistory.push(historyEntry);
  
  // Keep only last 50 downloads
  if (this.downloadHistory.length > 50) {
    this.downloadHistory = this.downloadHistory.slice(-50);
  }
  
  return this.save();
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by username
userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username });
};

// Virtual for user stats
userSchema.virtual('stats').get(function() {
  const totalDownloads = this.downloadHistory.length;
  const totalSuccess = this.downloadHistory.reduce((sum, entry) => sum + entry.successCount, 0);
  const totalFailed = this.downloadHistory.reduce((sum, entry) => sum + entry.failedCount, 0);
  const totalAttempted = this.downloadHistory.reduce((sum, entry) => sum + entry.totalCount, 0);
  
  return {
    totalDownloads,
    totalSuccess,
    totalFailed,
    totalAttempted,
    successRate: totalAttempted > 0 ? ((totalSuccess / totalAttempted) * 100).toFixed(1) : 0
  };
});

// Method to check download limits
userSchema.methods.canDownload = async function(urlCount) {
  // Get fresh user data to ensure we have the latest counts
  const freshUser = await this.constructor.findById(this._id);
  if (!freshUser) {
    throw new Error('User not found');
  }

  // Reset daily count if it's a new day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resetDate = new Date(freshUser.dailyDownloads.resetDate || new Date());
  resetDate.setHours(0, 0, 0, 0);
  
  if (today.getTime() !== resetDate.getTime()) {
    freshUser.dailyDownloads.count = 0;
    freshUser.dailyDownloads.resetDate = new Date();
    await freshUser.save();
    // Update this instance too
    this.dailyDownloads = freshUser.dailyDownloads;
  }
  
  const currentCount = freshUser.dailyDownloads.count;
  let limit;
  let userType;
  
  // Check subscription status and expiry
  const isProActive = freshUser.subscription.status === 'pro' && 
                     freshUser.subscription.expiresAt && 
                     new Date() < new Date(freshUser.subscription.expiresAt);
  
  if (isProActive) {
    // Subscribed users: Unlimited downloads
    limit = Infinity;
    userType = 'subscribed';
  } else {
    // Registered users: 10 downloads per day
    limit = 10;
    userType = 'registered';
  }
  
  const canDownload = currentCount + urlCount <= limit;
  
  // Log the check for debugging
  console.log('Download limit check:', {
    userId: freshUser._id,
    email: freshUser.email,
    userType,
    subscription: freshUser.subscription,
    currentCount,
    requestedCount: urlCount,
    limit: limit === Infinity ? 'Unlimited' : limit,
    canDownload,
    isProActive,
    resetDate: freshUser.dailyDownloads.resetDate
  });
  
  // Update this instance with fresh data
  this.dailyDownloads = freshUser.dailyDownloads;
  
  return {
    canDownload,
    remaining: Math.max(0, limit - currentCount),
    current: currentCount,
    limit: limit === Infinity ? 'Unlimited' : limit,
    userType
  };
};

// Method to update daily download count
userSchema.methods.updateDailyCount = async function(urlCount) {
  // Get fresh user data to ensure we have the latest counts
  const freshUser = await this.constructor.findById(this._id);
  if (!freshUser) {
    throw new Error('User not found');
  }

  // Reset daily count if it's a new day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resetDate = new Date(freshUser.dailyDownloads.resetDate || new Date());
  resetDate.setHours(0, 0, 0, 0);
  
  if (today.getTime() !== resetDate.getTime()) {
    freshUser.dailyDownloads.count = 0;
    freshUser.dailyDownloads.resetDate = new Date();
  }
  
  // Update the count
  freshUser.dailyDownloads.count += urlCount;
  
  // Log the update for debugging
  console.log('Updating daily download count:', {
    userId: freshUser._id,
    email: freshUser.email,
    oldCount: this.dailyDownloads.count,
    newCount: freshUser.dailyDownloads.count,
    added: urlCount,
    resetDate: freshUser.dailyDownloads.resetDate
  });
  
  // Save changes
  await freshUser.save();
  
  // Update this instance with fresh data
  this.dailyDownloads = freshUser.dailyDownloads;
  
  return freshUser;
};

// Method to check subscription status
userSchema.methods.isSubscriptionActive = function() {
  if (this.subscription.status !== 'pro') return false;
  if (!this.subscription.expiresAt) return false;
  return new Date() < this.subscription.expiresAt;
};

// Ensure virtuals are included in JSON output
userSchema.set('toJSON', { virtuals: true });

const User = mongoose.model('User', userSchema);

export default User; 