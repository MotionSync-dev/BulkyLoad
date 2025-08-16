import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Crown, CheckCircle, XCircle, ExternalLink, Calendar, CreditCard, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const SubscriptionPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gumroadInfo, setGumroadInfo] = useState(null);
  const [hasSubscribed, setHasSubscribed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    fetchSubscriptionStatus();
    fetchGumroadInfo();
    
    // Check if user recently subscribed (check localStorage)
    const recentlySubscribed = localStorage.getItem('bulkload_recently_subscribed');
    if (recentlySubscribed) {
      setHasSubscribed(true);
    }
  }, [isAuthenticated, navigate]);

  // Auto-refresh subscription status when processing
  useEffect(() => {
    let interval;
    
    if (getSubscriptionStatus() === 'processing') {
      // Auto-refresh every 30 seconds when processing
      interval = setInterval(() => {
        console.log('Auto-refreshing subscription status...');
        fetchSubscriptionStatus();
      }, 30000); // 30 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [getSubscriptionStatus()]);

  const fetchSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscription(response.data.subscription);
      
      // If status is now pro, remove the "recently subscribed" flag
      if (response.data.subscription?.status === 'pro') {
        localStorage.removeItem('bulkload_recently_subscribed');
        setHasSubscribed(false);
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
      toast.error('Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  };

  const fetchGumroadInfo = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/subscription/gumroad/product`);
      setGumroadInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch Gumroad info:', error);
    }
  };

  const handleSubscribe = () => {
    if (gumroadInfo?.checkoutUrl) {
      // Set flag that user has subscribed
      localStorage.setItem('bulkload_recently_subscribed', 'true');
      setHasSubscribed(true);
      
      // Show helpful message
      toast.success('Redirecting to Gumroad... Please complete your purchase and wait a few minutes for activation.');
      
      window.open(gumroadInfo.checkoutUrl, '_blank');
    } else {
      toast.error('Subscription link not available');
    }
  };

  const handleRefresh = () => {
    fetchSubscriptionStatus();
    toast.success('Subscription status refreshed');
  };

  // Determine subscription status for display
  const getSubscriptionStatus = () => {
    if (hasSubscribed && subscription?.status !== 'pro') {
      return 'processing';
    }
    return subscription?.status || 'free';
  };

  const getStatusDisplay = () => {
    const status = getSubscriptionStatus();
    
    switch (status) {
      case 'processing':
        return {
          text: 'Processing Subscription',
          description: 'Your subscription is being processed. This usually takes 2-5 minutes.',
          icon: Clock,
          color: 'text-amber-600',
          bgColor: 'bg-amber-100',
          borderColor: 'border-amber-200',
          statusColor: 'bg-amber-100 text-amber-800'
        };
      case 'pro':
        return {
          text: 'Pro Plan Active',
          description: 'Unlimited downloads and premium features are now available!',
          icon: Crown,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          statusColor: 'bg-green-100 text-green-800'
        };
      default:
        return {
          text: 'Free Plan',
          description: '10 downloads per day. Upgrade to Pro for unlimited downloads.',
          icon: Crown,
          color: 'text-gray-400',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          statusColor: 'bg-gray-100 text-gray-800'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-primary-600 p-3 rounded-full">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Subscription Management
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            Welcome, {user?.username}! Manage your BulkyLoad subscription here.
          </p>
        </div>

        {/* Current Subscription Status */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Current Subscription
            </h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                className="text-primary-600 hover:text-primary-700 p-2 rounded-lg hover:bg-primary-50 transition-colors"
                title="Refresh subscription status"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusDisplay.statusColor}`}>
                {statusDisplay.text === 'Processing Subscription' ? 'Processing' : 
                 statusDisplay.text === 'Pro Plan Active' ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>

          {/* Processing Status Alert */}
          {getSubscriptionStatus() === 'processing' && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="bg-amber-100 p-2 rounded-full">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-amber-900 mb-1">
                    Subscription Processing
                  </h4>
                  <p className="text-sm text-amber-700 mb-3">
                    Thank you for subscribing! Your Pro plan is being activated. This process typically takes 2-5 minutes 
                    as we receive confirmation from Gumroad. You can refresh this page or wait for automatic updates.
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-amber-600">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing webhook from Gumroad...</span>
                    </div>
                    <button
                      onClick={handleRefresh}
                      className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Check Now</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Debug Info - Remove in production */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Debug Info (Remove in production):</h4>
            <pre className="text-xs text-gray-600 overflow-auto">
              {JSON.stringify(subscription, null, 2)}
            </pre>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <StatusIcon className={`w-5 h-5 ${statusDisplay.color}`} />
                <div>
                  <div className="font-medium text-gray-900">
                    {statusDisplay.text}
                  </div>
                  <div className="text-sm text-gray-500">
                    {statusDisplay.description}
                  </div>
                </div>
              </div>

              {subscription?.status === 'pro' && (
                <>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">Expires</div>
                      <div className="text-sm text-gray-500">
                        {subscription?.expiresAt 
                          ? new Date(subscription.expiresAt).toLocaleDateString()
                          : 'N/A'
                        }
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">Gumroad ID</div>
                      <div className="text-sm text-gray-500 font-mono">
                        {subscription?.gumroadId || 'N/A'}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <h4 className="font-medium text-gray-900 mb-2">Pro Plan Benefits:</h4>
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Unlimited daily downloads</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Download history</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Advanced image formats</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>ZIP downloads</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>All image types (BMP, TIFF, WebP, SVG)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Actions */}
        {getSubscriptionStatus() !== 'pro' && (
          <div className="card mb-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Upgrade to Pro Plan
              </h3>
              <p className="text-gray-600 mb-6">
                Get unlimited downloads and premium features for just $9.99/month
              </p>
              
              {gumroadInfo ? (
                <button
                  onClick={handleSubscribe}
                  className="btn-primary text-lg px-8 py-3 flex items-center justify-center space-x-2 mx-auto"
                >
                  <Crown className="w-5 h-5" />
                  <span>Subscribe Now - $9.99/month</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              ) : (
                <div className="text-gray-500">Loading subscription options...</div>
              )}
              
              <p className="text-xs text-gray-500 mt-4">
                You'll be redirected to Gumroad to complete your purchase securely
              </p>
              
              {/* Processing Note */}
              {getSubscriptionStatus() === 'processing' && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-blue-700">
                    <AlertCircle className="w-4 h-4" />
                    <span>
                      <strong>Note:</strong> After completing payment on Gumroad, please wait 2-5 minutes 
                      for your Pro status to activate. You can refresh this page to check the status.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subscription Management */}
        {subscription?.status === 'pro' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Manage Your Subscription
            </h3>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">
                      Manage on Gumroad
                    </h4>
                    <p className="text-sm text-blue-700 mb-3">
                      To cancel or modify your subscription, please visit your Gumroad account.
                    </p>
                    <a
                      href="https://gumroad.com/account"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <span>Go to Gumroad Account</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-amber-100 p-2 rounded-full">
                    <XCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-amber-900 mb-1">
                      Important Note
                    </h4>
                    <p className="text-sm text-amber-700">
                      Cancelling your subscription will take effect at the end of your current billing period. 
                      You'll continue to have Pro access until then.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back to App */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary px-6 py-2"
          >
            Back to BulkyLoad
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage; 