import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/datepicker-custom.css';
import { clearError } from '../store/slices/authSlice';
import { Mail, Lock, Eye, EyeOff, User, Phone, Calendar, AlertCircle, Trophy, Dumbbell, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import apiClient from '../config/api';
import Logo from '../components/Logo';

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { error: reduxError, isAuthenticated } = useSelector((state) => state.auth);
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1); // 1: Phone OTP, 2: User Details
  const [verifiedPhone, setVerifiedPhone] = useState('');
  
  // Step 1: Phone & OTP
  const [phone, setPhone] = useState('');
  const [displayPhone, setDisplayPhone] = useState(''); // For display in input
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  // Step 2: User Details
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    handedness: '',
    sport_interests: [],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registering, setRegistering] = useState(false);
  
  const [localError, setLocalError] = useState('');
  const [sports, setSports] = useState([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const response = await apiClient.get('/sports');
        if (response.data.success) {
          setSports(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch sports:', error);
      } finally {
        setLoadingSports(false);
      }
    };
    fetchSports();
  }, []);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Google Login Handler
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setGoogleLoading(true);
        
        // Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoResponse.json();

        // Send to backend
        const response = await apiClient.post('/auth/google', {
          token: tokenResponse.access_token,
          userInfo
        });

        if (response.data.success) {
          // Check if profile completion is needed
          if (response.data.needsProfileCompletion) {
            // Store Google data and redirect to profile completion
            sessionStorage.setItem('googleData', JSON.stringify(response.data.googleData));
            toast('Please complete your profile', { icon: 'ℹ️' });
            navigate('/complete-profile');
            return;
          }

          // Existing user - store tokens and login
          localStorage.setItem('accessToken', response.data.data.tokens.accessToken);
          localStorage.setItem('refreshToken', response.data.data.tokens.refreshToken);
          
          toast.success('Login successful!');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Google login error:', error);
        toast.error(error.response?.data?.error || 'Google login failed');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast.error('Google login failed');
    },
  });

  // Format Indian phone number
  const formatIndianPhone = (input) => {
    // Remove all non-digit characters
    let digits = input.replace(/\D/g, '');
    
    // Remove +91 if present at start
    if (digits.startsWith('91') && digits.length > 10) {
      digits = digits.substring(2);
    }
    
    // Limit to 10 digits
    digits = digits.substring(0, 10);
    
    return digits;
  };

  // Handle phone input change
  const handlePhoneChange = (e) => {
    const input = e.target.value;
    const formatted = formatIndianPhone(input);
    
    setDisplayPhone(formatted);
    // Always store with +91 prefix
    setPhone(formatted ? `+91${formatted}` : '');
  };

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    try {
      setOtpLoading(true);
      const response = await apiClient.post('/auth/send-otp', { phone });
      
      if (response.data.success) {
        setOtpSent(true);
        setResendTimer(60);
        toast.success('OTP sent to your phone number');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to send OTP';
      setLocalError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setOtpLoading(false);
    }
  };

  // Step 1: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setVerifyingOtp(true);
      const response = await apiClient.post('/auth/verify-otp', { phone, otp });
      
      if (response.data.success) {
        setVerifiedPhone(phone);
        setCurrentStep(2);
        toast.success('Phone verified successfully!');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Invalid OTP';
      setLocalError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setOtp('');
    await handleSendOTP({ preventDefault: () => {} });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setLocalError('');
    dispatch(clearError());
  };

  const handleSportToggle = (sportId) => {
    setFormData(prev => {
      const isSelected = prev.sport_interests.includes(sportId);
      return {
        ...prev,
        sport_interests: isSelected
          ? prev.sport_interests.filter(id => id !== sportId)
          : [...prev.sport_interests, sportId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      const errorMsg = 'Passwords do not match';
      setLocalError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (formData.password.length < 8) {
      const errorMsg = 'Password must be at least 8 characters long';
      setLocalError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      setRegistering(true);
      const { confirmPassword, ...registerData } = formData;
      
      // Use complete-registration endpoint with verified phone
      const response = await apiClient.post('/auth/complete-registration', {
        ...registerData,
        phone: verifiedPhone
      });
      
      if (response.data.success) {
        // Store tokens
        localStorage.setItem('accessToken', response.data.data.tokens.accessToken);
        localStorage.setItem('refreshToken', response.data.data.tokens.refreshToken);
        
        toast.success('Registration successful! Welcome to SportLife.');
        navigate('/dashboard');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
      setLocalError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50 py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Side - Branding (Sticky) */}
          <div className="hidden lg:block lg:sticky lg:top-8">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl p-12 text-white shadow-2xl">
              <div className="mb-8">
                <Logo size="lg" showText={true} clickable={false} className="mb-4" />
                <p className="text-primary-100 text-lg">Manage Your Sports Journey</p>
              </div>
              
              <div className="space-y-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                  <h3 className="text-xl font-semibold mb-2">🏆 Tournament Management</h3>
                  <p className="text-primary-100">Organize and manage tournaments with ease</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                  <h3 className="text-xl font-semibold mb-2">📊 Live Scoring</h3>
                  <p className="text-primary-100">Real-time match updates and statistics</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                  <h3 className="text-xl font-semibold mb-2">👥 Team Collaboration</h3>
                  <p className="text-primary-100">Connect players, coaches, and referees</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Register Form (Scrollable) */}
          <div className="w-full">
            {/* Mobile Logo */}
            <div className="text-center mb-8 lg:hidden">
              <div className="flex justify-center mb-2">
                <Logo size="md" showText={true} clickable={false} />
              </div>
              <p className="text-gray-600">Create your account</p>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:block mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
              <p className="text-gray-600">Join SportLife and start your journey</p>
            </div>

            {/* Register Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 border border-gray-100">
              {/* Step Indicator */}
              <div className="flex items-center justify-center mb-8">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${currentStep >= 1 ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {currentStep > 1 ? <CheckCircle className="w-6 h-6" /> : '1'}
                </div>
                <div className={`w-16 h-1 mx-2 ${currentStep >= 2 ? 'bg-primary-500' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${currentStep >= 2 ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  2
                </div>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {currentStep === 1 ? 'Verify Your Phone' : 'Complete Your Profile'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {currentStep === 1 ? 'Enter your phone number to receive OTP' : 'Fill in your details to create account'}
                </p>
              </div>

              {/* Error Alert */}
              {(localError || reduxError) && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 mb-4">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{localError || reduxError}</span>
                </div>
              )}

              {/* Step 1: Phone & OTP Verification */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP} className="space-y-4">
                    {/* Phone Number Input */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        </div>
                        <div className="absolute inset-y-0 left-10 flex items-center pointer-events-none">
                          <span className="text-gray-600 font-medium">+91</span>
                        </div>
                        <input
                          id="phone"
                          type="tel"
                          required
                          value={displayPhone}
                          onChange={handlePhoneChange}
                          disabled={otpSent}
                          maxLength={10}
                          className="w-full pl-20 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none disabled:bg-gray-100"
                          placeholder="1234567890"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Enter 10-digit mobile number (India)</p>
                    </div>

                    {/* OTP Input (shown after OTP sent) */}
                    {otpSent && (
                      <div>
                        <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 mb-2">
                          Enter OTP <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="otp"
                          type="text"
                          required
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-center text-2xl tracking-widest font-semibold"
                          placeholder="000000"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-500">Enter the 6-digit code sent to your phone</p>
                          {resendTimer > 0 ? (
                            <p className="text-xs text-gray-500">Resend in {resendTimer}s</p>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendOTP}
                              className="text-xs text-primary-500 hover:text-primary-600 font-semibold"
                            >
                              Resend OTP
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={otpLoading || verifyingOtp}
                      className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {(otpLoading || verifyingOtp) ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          {otpSent ? 'Verifying...' : 'Sending OTP...'}
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {otpSent ? 'Verify OTP' : 'Send OTP'}
                          <ArrowRight className="w-5 h-5" />
                        </span>
                      )}
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
                    </div>
                  </div>

                  {/* Google Sign-in Button */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {googleLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-700 border-t-transparent"></div>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </button>

                  {/* Login Link */}
                  <div className="text-center pt-4 border-t border-gray-200 mt-6">
                    <p className="text-sm text-gray-600">
                      Already have an account?{' '}
                      <Link to="/login" className="text-primary-500 hover:text-primary-600 font-semibold">
                        Sign in
                      </Link>
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: User Details Form */}
              {currentStep === 2 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Phone Display (verified) */}
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-primary-700">Phone Verified</p>
                      <p className="text-xs text-primary-600">{verifiedPhone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentStep(1);
                        setOtpSent(false);
                        setOtp('');
                      }}
                      className="text-xs text-primary-500 hover:text-primary-600 font-semibold"
                    >
                      Change
                    </button>
                  </div>

                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-semibold text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                      </div>
                      <input
                        id="first_name"
                        name="first_name"
                        type="text"
                        required
                        value={formData.first_name}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                        placeholder="John"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="last_name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                      </div>
                      <input
                        id="last_name"
                        name="last_name"
                        type="text"
                        required
                        value={formData.last_name}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {/* Phone Field - Auto-filled and Read-only */}
                <div>
                  <label htmlFor="phone_display" className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number <span className="text-primary-500">(Verified)</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CheckCircle className="h-5 w-5 text-primary-500" />
                    </div>
                    <input
                      id="phone_display"
                      type="tel"
                      value={verifiedPhone}
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 border border-primary-300 bg-primary-50 rounded-lg text-primary-700 font-medium cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-primary-500 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    This number has been verified via OTP
                  </p>
                </div>

                {/* Gender, Date of Birth, and Handedness */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 mb-2">
                      Gender
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none bg-white"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="date_of_birth" className="block text-sm font-semibold text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <Calendar className="h-5 w-5 text-gray-400" />
                      </div>
                      <DatePicker
                        selected={formData.date_of_birth ? new Date(formData.date_of_birth) : null}
                        onChange={(date) => {
                          if (date) {
                            setFormData({ ...formData, date_of_birth: date.toISOString().split('T')[0] });
                          } else {
                            setFormData({ ...formData, date_of_birth: '' });
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select date of birth"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                        maxDate={new Date()}
                        showYearDropdown
                        scrollableYearDropdown
                        yearDropdownItemNumber={100}
                        showMonthDropdown
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="handedness" className="block text-sm font-semibold text-gray-700 mb-2">
                      Handedness
                    </label>
                    <select
                      id="handedness"
                      name="handedness"
                      value={formData.handedness}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none bg-white"
                    >
                      <option value="">Select</option>
                      <option value="right">Right</option>
                      <option value="left">Left</option>
                      <option value="ambidextrous">Ambidextrous</option>
                    </select>
                  </div>
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center hover:scale-110 transition-transform"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Min. 8 characters</p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center hover:scale-110 transition-transform"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sport Interests */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-5 w-5 text-primary-500" />
                      Sport Interests (Optional)
                    </div>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">Select the sports you're interested in playing</p>
                  
                  {loadingSports ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-500 scrollbar-track-gray-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sports.map((sport) => (
                          <label
                            key={sport.id}
                            className="flex items-center gap-2 p-2.5 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all duration-200"
                            style={{
                              borderColor: formData.sport_interests.includes(sport.id) ? '#059669' : '',
                              backgroundColor: formData.sport_interests.includes(sport.id) ? '#ecfdf5' : ''
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={formData.sport_interests.includes(sport.id)}
                              onChange={() => handleSportToggle(sport.id)}
                              className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 cursor-pointer flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">{sport.name}</div>
                              <div className="text-xs text-gray-500 capitalize">{sport.category}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {!loadingSports && sports.length > 6 && (
                    <p className="text-xs text-gray-400 mt-1 italic">Scroll to see more sports</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={registering}
                  className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {registering ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Creating account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">Already have an account?</span>
                  </div>
                </div>

                {/* Login Link */}
                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center w-full py-2.5 px-4 border-2 border-primary-500 text-primary-500 font-semibold rounded-lg hover:bg-primary-50 transition-colors duration-200"
                  >
                    Sign in instead
                  </Link>
                </div>
              </form>
              )}
            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-sm text-gray-500">
              © 2024 SportLife. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;