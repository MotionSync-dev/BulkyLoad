import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, 
  Mail, 
  Calendar, 
  Download, 
  CheckCircle, 
  XCircle, 
  BarChart3,
  Clock,
  Trash2,
  LogOut
} from 'lucide-react';
import axios from 'axios';

const UserProfile = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
              const [statsResponse, historyResponse] = await Promise.all([
          axios.get('http://localhost:3001/api/user/stats'),
          axios.get('http://localhost:3001/api/download/history')
        ]);

      setStats(statsResponse.data.stats);
      setHistory(historyResponse.data.history);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await axios.delete('http://localhost:3001/api/download/history');
      setHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* User Info Card */}
      <div className="card">
        <div className="flex items-center space-x-4 mb-6">
          <div className="bg-primary-100 p-3 rounded-full">
            <User className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user?.username}</h2>
            <p className="text-gray-600">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <Mail className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="font-medium">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <Download className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Total Downloads</p>
              <p className="font-medium">{stats?.totalDownloads || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="card">
          <div className="flex items-center space-x-2 mb-6">
            <BarChart3 className="w-6 h-6 text-primary-600" />
            <h3 className="text-xl font-semibold">Download Statistics</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">{stats.totalDownloads}</div>
              <div className="text-sm text-gray-600">Total Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats.totalSuccessful}</div>
              <div className="text-sm text-gray-600">Successful Downloads</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{stats.totalFailed}</div>
              <div className="text-sm text-gray-600">Failed Downloads</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.successRate}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">Recent Activity</span>
              <span className="text-sm text-blue-600">{stats.recentActivity} downloads this week</span>
            </div>
          </div>
        </div>
      )}

      {/* Download History */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Clock className="w-6 h-6 text-primary-600" />
            <h3 className="text-xl font-semibold">Download History</h3>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12">
            <Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No download history yet</p>
            <p className="text-sm text-gray-400">Start downloading images to see your history here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.slice(0, 10).map((entry, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-green-600 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {entry.successful} successful
                    </span>
                    {entry.failed > 0 && (
                      <span className="text-red-600 flex items-center">
                        <XCircle className="w-4 h-4 mr-1" />
                        {entry.failed} failed
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {entry.totalUrls} URLs processed
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout Button */}
      <div className="card">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default UserProfile; 