import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/profile`);
          setUser(response.data.user);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      console.log('Attempting login for email:', email);
      
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/login`, {
        email,
        password
      });

      console.log('Login response:', response.data);
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('token', newToken);
      
      return { success: true };
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      // Extract error message from different possible locations
      let errorMessage = 'Login failed';
      let requiresVerification = false;
      let userId = null;
      
      if (error.response) {
        // Server responded with error status
        const responseData = error.response.data;
        errorMessage = responseData.error || responseData.message || `Login failed (${error.response.status})`;
        requiresVerification = responseData.requiresVerification || false;
        userId = responseData.userId || null;
      } else if (error.request) {
        // Request made but no response received
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something else happened
        errorMessage = error.message || 'Login failed';
      }
      
      return { 
        success: false, 
        error: errorMessage,
        requiresVerification,
        userId,
        email
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/register`, userData);
      
      if (response.data.requiresVerification) {
        return {
          success: true,
          requiresVerification: true,
          pendingUserId: response.data.pendingUserId,
          email: response.data.email,
          username: response.data.username
        };
      }
      
      return { success: true, user: response.data.user };
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const verifyEmail = async (pendingUserId, code) => {
    try {
      console.log('verifyEmail called with:', { pendingUserId, code });
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/verify`, {
        pendingUserId,
        code
      });
      
      console.log('verifyEmail response:', response.data);
      
      // Set user and token after successful verification
      setUser(response.data.user);
      setToken(response.data.token);
      setIsAuthenticated(true);
      
      console.log('State updated - user:', response.data.user, 'token:', response.data.token, 'isAuthenticated: true');
      
      // Store token in localStorage
      localStorage.setItem('token', response.data.token);
      
      return { success: true, user: response.data.user, token: response.data.token };
    } catch (error) {
      console.error('Verification error:', error);
      throw new Error(error.response?.data?.error || 'Verification failed');
    }
  };

  const resendCode = async (email) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/resend-code`, { email });
      return { success: true, pendingUserId: response.data.pendingUserId };
    } catch (error) {
      console.error('Resend code error:', error);
      throw new Error(error.response?.data?.error || 'Failed to resend code');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/user/profile`, profileData);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Profile update failed' 
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    verifyEmail,
    resendCode,
    isAuthenticated: isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 