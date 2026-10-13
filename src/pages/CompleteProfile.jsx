import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/datepicker-custom.css';
import apiClient from '../config/api';
import { User, Phone, Calendar, Lock, Trophy, ArrowRight, CheckCircle } from 'lucide-react';
import Logo from '../components/Logo';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const [googleData, setGoogleData] = useState(null);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    gender: '',
    date_of_birth: null,
    handedness: '',
    sport_interests: []
  });

  useEffect(() => {
    // Get Google data from session storage
    const storedData = sessionStorage.getItem('googleData');
    if (!storedData) {
      toast.error('No Google data found. Please sign in again.');
      navigate('/login');
      return;
    }
    setGoogleData(JSON.parse(storedData));

    // Fetch sports
    fetchSports();
  }, [navigate]);

  const fetchSports = async () => {
    try {
      const response = await apiClient.get('/sports');
      if (response.data.success) {
        setSports(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching sports:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSportToggle = (sportId) => {
    setFormData(prev => ({
      ...prev,
      sport_interests: prev.sport_interests.includes(sportId)
        ? prev.sport_interests.filter(id => id !== sportId)
        : [...prev.sport_interests, sportId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate password if provided
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        googleId: googleData.googleId,
        email: googleData.email,
        first_name: googleData.first_name,
        last_name: googleData.last_name,
        profile_image: googleData.profile_image,
        phone: formData.phone,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        handedness: formData.handedness,
        sport_interests: formData.sport_interests,
        password: formData.password || undefined
      };

      const response = await apiClient.post('/auth/complete-google-registration', payload);

      if (response.data.success) {
        // Store tokens
        localStorage.setItem('accessToken', response.data.data.tokens.accessToken);
        localStorage.setItem('refreshToken', response.data.data.tokens.refreshToken);
        
        // Clear session storage
        sessionStorage.removeItem('googleData');
        
        toast.success('Profile completed! Welcome to SportLife!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Complete profile error:', error);
      toast.error(error.response?.data?.error || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  if (!googleData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="xl" showText={false} clickable={false} />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-2">Complete Your Profile</h2>
          <p className="text-gray-600 text-lg">Just a few more details to get started</p>
        </div>

        {/* Google Account Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-4">
            {googleData.profile_image && (
              <img 
                src={googleData.profile_image} 
                alt="Profile" 
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {googleData.first_name} {googleData.last_name}
              </h3>
              <p className="text-gray-600">{googleData.email}</p>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-600 text-xs font-semibold rounded mt-1">
                <CheckCircle className="w-3 h-3" />
                Google Account Linked
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Number */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            {/* Password (Optional) */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Password (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-2">Set a password if you want to login with email/password</p>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {formData.password && (
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {/* Gender */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                name="gender"
                required
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10 pointer-events-none" />
                <DatePicker
                  selected={formData.date_of_birth}
                  onChange={(date) => setFormData(prev => ({ ...prev, date_of_birth: date }))}
                  dateFormat="yyyy-MM-dd"
                  maxDate={new Date()}
                  showYearDropdown
                  scrollableYearDropdown
                  yearDropdownItemNumber={100}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                  placeholderText="Select your date of birth"
                />
              </div>
            </div>

            {/* Handedness */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Handedness
              </label>
              <select
                name="handedness"
                value={formData.handedness}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
              >
                <option value="">Select Handedness</option>
                <option value="right">Right</option>
                <option value="left">Left</option>
                <option value="ambidextrous">Ambidextrous</option>
              </select>
            </div>

            {/* Sport Interests */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Sport Interests
              </label>
              <div className="grid grid-cols-2 gap-3">
                {sports.map((sport) => (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => handleSportToggle(sport.id)}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.sport_interests.includes(sport.id)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <Trophy className="w-5 h-5 mx-auto mb-2" />
                    <p className="font-semibold text-sm">{sport.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Completing Profile...
                </>
              ) : (
                <>
                  Complete Profile
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
