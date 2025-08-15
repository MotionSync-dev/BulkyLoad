import mongoose from 'mongoose';

const anonymousSessionSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    unique: true
  },
  dailyDownloads: {
    count: {
      type: Number,
      default: 0
    },
    resetDate: {
      type: Date,
      default: Date.now
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for automatic cleanup of old sessions
anonymousSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }); // 7 days

// Method to update last activity
anonymousSessionSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Method to get remaining downloads
anonymousSessionSchema.methods.getRemainingDownloads = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resetDate = new Date(this.dailyDownloads.resetDate);
  resetDate.setHours(0, 0, 0, 0);
  
  if (today.getTime() !== resetDate.getTime()) {
    this.dailyDownloads.count = 0;
    this.dailyDownloads.resetDate = new Date();
    this.save();
  }
  
  const limit = 5; // 5 downloads per day for anonymous users
  return {
    current: this.dailyDownloads.count,
    remaining: Math.max(0, limit - this.dailyDownloads.count),
    limit: limit
  };
};

const AnonymousSession = mongoose.model('AnonymousSession', anonymousSessionSchema);

export default AnonymousSession; 