import mongoose from 'mongoose';

const anonymousSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  dailyDownloads: {
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    resetDate: {
      type: Date,
      default: Date.now
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update last activity on save
anonymousSessionSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

// Method to check if user can download
anonymousSessionSchema.methods.canDownload = function(requestedCount) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const resetDate = new Date(this.dailyDownloads.resetDate);
  resetDate.setHours(0, 0, 0, 0);
  
  // If it's a new day, reset the count
  if (today.getTime() !== resetDate.getTime()) {
    this.dailyDownloads.count = 0;
    this.dailyDownloads.resetDate = new Date();
    return {
      canDownload: requestedCount <= 5,
      current: 0,
      remaining: 5,
      limit: 5
    };
  }
  
  const remaining = Math.max(0, 5 - this.dailyDownloads.count);
  const canDownload = requestedCount <= remaining;
  
  return {
    canDownload,
    current: this.dailyDownloads.count,
    remaining,
    limit: 5
  };
};

// Method to update daily download count
anonymousSessionSchema.methods.updateDailyCount = async function(urlCount) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const resetDate = new Date(this.dailyDownloads.resetDate);
  resetDate.setHours(0, 0, 0, 0);
  
  // If it's a new day, reset the count
  if (today.getTime() !== resetDate.getTime()) {
    this.dailyDownloads.count = 0;
    this.dailyDownloads.resetDate = new Date();
  }
  
  // Update the count
  this.dailyDownloads.count += urlCount;
  
  // Save the updated session
  await this.save();
  
  console.log('Anonymous session updated:', {
    sessionId: this.sessionId,
    oldCount: this.dailyDownloads.count - urlCount,
    newCount: this.dailyDownloads.count,
    resetDate: this.dailyDownloads.resetDate
  });
  
  return this;
};

// Static method to find or create session
anonymousSessionSchema.statics.findOrCreate = async function(sessionId) {
  let session = await this.findOne({ sessionId });
  
  if (!session) {
    session = new this({
      sessionId,
      dailyDownloads: { count: 0, resetDate: new Date() }
    });
    await session.save();
  }
  
  return session;
};

// Clean up old sessions (older than 30 days)
anonymousSessionSchema.statics.cleanupOldSessions = async function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const result = await this.deleteMany({
    lastActivity: { $lt: thirtyDaysAgo }
  });
  
  console.log(`Cleaned up ${result.deletedCount} old anonymous sessions`);
  return result;
};

const AnonymousSession = mongoose.model('AnonymousSession', anonymousSessionSchema);

export default AnonymousSession; 