import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Check, Crown, User, Zap, Star } from 'lucide-react';
import toast from 'react-hot-toast';

const PricingPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('pro');

  const plans = [
    {
      id: 'anonymous',
      name: 'Anonymous',
      price: 'Free',
      description: 'Perfect for occasional use',
      features: [
        '5 downloads per day',
        'Basic image support',
        'No account required',
        'IP-based tracking'
      ],
      buttonText: 'Start Downloading',
      buttonAction: () => window.location.href = '/',
      popular: false,
      icon: User
    },
    {
      id: 'free',
      name: 'Free User',
      price: 'Free',
      description: 'Great for regular users',
      features: [
        '10 downloads per day',
        'Download history',
        'User profile',
        'Priority support',
        'Advanced image formats'
      ],
      buttonText: 'Sign Up Free',
      buttonAction: () => window.location.href = '/auth',
      popular: false,
      icon: User
    },
         {
       id: 'pro',
       name: 'Pro Subscription',
       price: '$9.99',
       period: '/month',
       description: 'Unlimited downloads for power users',
      features: [
        'Unlimited downloads',
        'Priority processing',
        'Advanced features',
        'Premium support',
        'Download analytics',
        'Custom file naming',
        'Batch processing',
        'API access'
      ],
      buttonText: 'Subscribe Now',
      buttonAction: () => {
        if (isAuthenticated) {
          window.location.href = '/subscription';
        } else {
          toast.error('Please sign in to subscribe');
          window.location.href = '/auth';
        }
      },
      popular: true,
      icon: Crown
    }
  ];

  const currentUserPlan = () => {
    if (!isAuthenticated) return 'anonymous';
    if (user?.subscription?.status === 'pro') return 'pro';
    return 'free';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
          Choose Your BulkyLoad Plan
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
          Start with our free tier or unlock unlimited downloads with our Pro subscription. 
          All plans include our core features with different usage limits.
        </p>
      </div>

      {/* Current Plan Banner */}
      {isAuthenticated && (
        <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-center space-x-2">
            <Star className="w-4 h-5 w-5 h-5 text-blue-600" />
            <span className="text-blue-800 font-medium text-sm sm:text-base">
              Current Plan: {currentUserPlan() === 'pro' ? 'Pro Subscription' : 'Free User'}
            </span>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentUserPlan() === plan.id;
          
          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
                plan.popular 
                  ? 'border-primary-500 scale-105' 
                  : 'border-gray-200'
              } ${isCurrentPlan ? 'ring-2 ring-blue-500' : ''}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-500 text-white px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-3 sm:-top-4 right-3 sm:right-4">
                  <span className="bg-blue-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="p-6 sm:p-8">
                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-full ${
                      plan.popular ? 'bg-primary-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${
                        plan.popular ? 'text-primary-600' : 'text-gray-600'
                      }`} />
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    {plan.description}
                  </p>
                  <div className="mb-6">
                    <span className="text-3xl sm:text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-gray-600 ml-1 text-sm sm:text-base">
                        {plan.period}
                      </span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm sm:text-base text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <button
                  onClick={plan.buttonAction}
                  disabled={isCurrentPlan}
                  className={`w-full py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                    isCurrentPlan
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : plan.popular
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {isCurrentPlan ? 'Current Plan' : plan.buttonText}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 mb-8 sm:mb-12">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
          Feature Comparison
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm sm:text-base">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 sm:py-4 px-2 sm:px-4 font-medium text-gray-900">Feature</th>
                <th className="text-center py-3 sm:py-4 px-2 sm:px-4 font-medium text-gray-900">Anonymous</th>
                <th className="text-center py-3 sm:py-4 px-2 sm:px-4 font-medium text-gray-900">Free User</th>
                <th className="text-center py-3 sm:py-4 px-2 sm:px-4 font-medium text-primary-600">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-3 sm:py-4 px-2 sm:px-4 font-medium">Daily Downloads</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">5</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">10</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4 text-primary-600 font-medium">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3 sm:py-4 px-2 sm:px-4 font-medium">Download History</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">❌</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">✅</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">✅</td>
              </tr>
              <tr>
                <td className="py-3 sm:py-4 px-2 sm:px-4 font-medium">User Profile</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">❌</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">✅</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">✅</td>
              </tr>
              <tr>
                <td className="py-3 sm:py-4 px-2 sm:px-4 font-medium">Priority Support</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">❌</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">✅</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">✅</td>
              </tr>
              <tr>
                <td className="py-3 sm:py-4 px-2 sm:px-4 font-medium">Advanced Formats</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">Basic</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">✅</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">✅</td>
              </tr>
              <tr>
                <td className="py-3 sm:py-4 px-2 sm:px-4 font-medium">Download Analytics</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">❌</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">❌</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">✅</td>
              </tr>
              <tr>
                <td className="py-3 sm:py-4 px-2 sm:px-4 font-medium">Custom File Naming</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">❌</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">❌</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">✅</td>
              </tr>
              <tr>
                <td className="py-3 sm:py-4 px-2 sm:px-4 font-medium">API Access</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">❌</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">❌</td>
                <td className="text-center py-3 sm:py-4 px-2 sm:px-4">✅</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              Can I upgrade my plan later?
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              Yes! You can upgrade from Free to Pro at any time. Your download limits will be updated immediately.
            </p>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              Do download limits reset daily?
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              Yes, all download limits reset at midnight UTC. Anonymous users are tracked by IP address.
            </p>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              What payment methods do you accept?
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              We accept all major credit cards and PayPal. All payments are processed securely through Gumroad.
            </p>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              Can I cancel my subscription anytime?
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              Yes, you can cancel your Pro subscription at any time. You'll continue to have access until the end of your billing period.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage; 