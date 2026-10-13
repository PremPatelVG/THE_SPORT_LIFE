import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Loader, Shield, CheckCircle } from 'lucide-react';
import adminApi from '../../config/adminApi';
import LogoAuth from '../../components/LogoAuth';
import Logo from '../../components/Logo';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      const response = await adminApi.post('/auth/login', formData);

      if (response.data.success) {
        // Store admin tokens and admin data
        localStorage.setItem('adminAccessToken', response.data.data.tokens.accessToken);
        localStorage.setItem('adminRefreshToken', response.data.data.tokens.refreshToken);
        localStorage.setItem('adminUser', JSON.stringify(response.data.data.admin));

        // Redirect to admin dashboard
        navigate('/admin/dashboard');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="grid md:grid-cols-2 gap-0 bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Left Side - Branding & Description */}
          <div className="hidden md:flex flex-col justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-teal-700 p-12 text-white">
            <div className="space-y-8">
              {/* Logo */}
              <div>
                <LogoAuth size="lg" showText={true} />
              </div>
              <p className="text-white/90 text-lg mt-4">Admin Control Panel</p>

              {/* Description */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-3">Admin Access</h2>
                  <p className="text-primary-100 text-lg leading-relaxed">
                    Manage tournaments, approve registrations, monitor matches, and oversee the entire platform.
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-white/20 rounded-lg p-2 mt-1">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Tournament Management</h3>
                      <p className="text-primary-100 text-sm">Approve and manage all tournaments</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-white/20 rounded-lg p-2 mt-1">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">User Oversight</h3>
                      <p className="text-primary-100 text-sm">Monitor and manage user accounts</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-white/20 rounded-lg p-2 mt-1">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Platform Analytics</h3>
                      <p className="text-primary-100 text-sm">View comprehensive statistics and reports</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="p-8 md:p-12">
            {/* Mobile Header */}
            <div className="md:hidden text-center mb-8">
              <div className="flex justify-center mb-4">
                <Logo size="md" showText={true} clickable={false} />
              </div>
              <p className="text-gray-600">Admin Login</p>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:block mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Login</h2>
              <p className="text-gray-600">Sign in to access the admin panel</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@sportlife.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !loading) {
                        handleSubmit(e);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 rounded-lg font-semibold hover:from-primary-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Sign In to Admin Panel
                  </>
                )}
              </button>
            </form>

            {/* Info */}
            <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <p className="text-xs text-primary-600 text-center">
                <strong>Admin Access Only</strong> - Unauthorized access is prohibited
              </p>
            </div>

            {/* Back Link */}
            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-primary-500 hover:text-primary-600 transition-colors text-sm font-medium"
              >
                ← Back to Main Site
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
