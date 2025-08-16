import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import BulkImageDownloader from './components/BulkImageDownloader';
import HomePage from './components/HomePage/HomePage';
import AuthPage from './components/Auth/AuthPage';
import UserProfile from './components/User/UserProfile';
import SubscriptionPage from './components/Subscription/SubscriptionPage';
import PricingPage from './components/Pricing/PricingPage';
import { User, LogOut, Menu, X, Crown, DollarSign } from 'lucide-react';
import { useState } from 'react';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/auth" />;
};

// Main Layout Component
const MainLayout = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <a href="/" className="flex items-center hover:opacity-80 transition-opacity">
                <h1 className="text-2xl font-bold text-gray-900">
                  🖼️ BulkyLoad
                </h1>
              </a>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {!isAuthenticated && (
                <a
                  href="/pricing"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">Pricing</span>
                </a>
              )}
              {isAuthenticated ? (
                <>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">{user?.username}</span>
                  </div>
                  <a
                    href="/subscription"
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                  >
                    <Crown className="w-4 h-4" />
                    <span className="text-sm">Subscription</span>
                  </a>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </>
              ) : (
                <a
                  href="/auth"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm">Sign In</span>
                </a>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-gray-800"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              {!isAuthenticated && (
                <a
                  href="/pricing"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 mb-2"
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">Pricing</span>
                </a>
              )}
              {isAuthenticated ? (
                <>
                  <div className="flex items-center space-x-2 text-gray-600 mb-4">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">{user?.username}</span>
                  </div>
                  <a
                    href="/subscription"
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 mb-2"
                  >
                    <Crown className="w-4 h-4" />
                    <span className="text-sm">Subscription</span>
                  </a>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </>
              ) : (
                <a
                  href="/auth"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm">Sign In</span>
                </a>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                🖼️ BulkyLoad – Bulk Image Downloader from URL Lists
              </h3>
              <p className="text-gray-600 mb-4 max-w-md">
                Download multiple images quickly and securely. Perfect for designers, developers, and content creators.
              </p>
              <div className="flex space-x-4">
                <a href="/pricing" className="text-gray-500 hover:text-gray-700 transition-colors">
                  Pricing
                </a>
                <a href="/auth" className="text-gray-500 hover:text-gray-700 transition-colors">
                  Sign In
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/" className="text-gray-500 hover:text-gray-700 transition-colors text-sm">
                    Home
                  </a>
                </li>
                <li>
                  <a href="/pricing" className="text-gray-500 hover:text-gray-700 transition-colors text-sm">
                    Plans
                  </a>
                </li>
                {isAuthenticated && (
                  <li>
                    <a href="/subscription" className="text-gray-500 hover:text-gray-700 transition-colors text-sm">
                      Subscription
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Support</h4>
              <ul className="space-y-2">
                <li>
                  <a href="mailto:support@bulkimagedownloader.com" className="text-gray-500 hover:text-gray-700 transition-colors text-sm">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="/pricing" className="text-gray-500 hover:text-gray-700 transition-colors text-sm">
                    Help Center
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-200 mt-8 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-500 text-sm">
                &copy; 2024 BulkyLoad – Bulk Image Downloader from URL Lists. All rights reserved.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// App Component
const AppContent = () => {
  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <MainLayout>
              <HomePage />
            </MainLayout>
          } 
        />
        <Route 
          path="/download" 
          element={
            <MainLayout>
              <BulkImageDownloader />
            </MainLayout>
          } 
        />
        <Route path="/auth" element={<AuthPage />} />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <UserProfile />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/subscription" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <SubscriptionPage />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/pricing" 
          element={
            <MainLayout>
              <PricingPage />
            </MainLayout>
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

// Root App Component
const App = () => {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </AuthProvider>
  );
};

export default App;
