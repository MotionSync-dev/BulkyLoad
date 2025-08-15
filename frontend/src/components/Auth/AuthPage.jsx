import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import VerifyEmailPage from './VerifyEmailPage';
import { Image, Download, Shield, Zap } from 'lucide-react';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [pendingVerification, setPendingVerification] = useState(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect to main page if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleRegistrationSuccess = (data) => {
    if (data.requiresVerification) {
      setPendingVerification({
        pendingUserId: data.pendingUserId,
        email: data.email,
        username: data.username
      });
    } else {
      // Handle successful registration without verification (shouldn't happen)
      navigate('/');
    }
  };

  const handleBackToRegistration = () => {
    setPendingVerification(null);
  };

  if (pendingVerification) {
    return (
      <VerifyEmailPage
        pendingUserId={pendingVerification.pendingUserId}
        email={pendingVerification.email}
        username={pendingVerification.username}
        onBack={handleBackToRegistration}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
      {/* Left side - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-700 text-white p-12">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">🖼️ Bulk Image Downloader</h1>
            <p className="text-xl text-primary-100">
              Download multiple images quickly and securely with our powerful tool
            </p>
          </div>

          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
                <p className="text-primary-100">
                  Download hundreds of images simultaneously with our optimized engine
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Secure & Private</h3>
                <p className="text-primary-100">
                  Your downloads are processed securely with JWT authentication
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Batch Processing</h3>
                <p className="text-primary-100">
                  Upload text files or paste URLs to download multiple images at once
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <Image className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Multiple Formats</h3>
                <p className="text-primary-100">
                  Support for JPG, PNG, GIF, SVG, WebP and many more formats
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 p-6 bg-white/10 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Why Create an Account?</h3>
            <ul className="space-y-2 text-primary-100">
              <li>• Save your download history</li>
              <li>• Track your usage statistics</li>
              <li>• Access to advanced features</li>
              <li>• Priority support</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {isLogin ? (
            <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <RegisterForm 
              onSwitchToLogin={() => setIsLogin(true)}
              onRequireVerification={handleRegistrationSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage; 