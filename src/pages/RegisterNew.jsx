import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/datepicker-custom.css';
import { clearError, setUser } from '../store/slices/authSlice';
import { User, Phone, Calendar, AlertCircle, Trophy, Dumbbell, ArrowRight, CheckCircle, Loader, Mail, UserCheck, RefreshCw } from 'lucide-react';
import apiClient from '../config/api';
import Logo from '../components/Logo';
import LogoAuth from '../components/LogoAuth';

const RegisterNew = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  // Step management: 1 = Phone Entry, 2 = OTP Verification, 3 = User Details
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1 & 2: Phone & OTP
  const [phone, setPhone] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  // Step 3: User Details
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    gender: '',
    date_of_birth: null,
    handedness: '',
    sport_interests: [],
  });
  const [registering, setRegistering] = useState(false);
  
  const [localError, setLocalError] = useState('');
  const [sports, setSports] = useState([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [googleData, setGoogleData] = useState(null);
  const [facebookData, setFacebookData] = useState(null);
  
  // Account Recovery
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [deletedAccountData, setDeletedAccountData] = useState(null);
  const [recoveringAccount, setRecoveringAccount] = useState(false);

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

  // Format phone number for display
  const formatPhoneDisplay = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{5})(\d{0,5})/, '$1 $2').trim();
    }
    return cleaned.substring(0, 10).replace(/(\d{5})(\d{5})/, '$1 $2');
  };

  // Handle phone input
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setDisplayPhone(formatPhoneDisplay(value));
      setPhone(`+91${value}`);
      setLocalError('');
    }
  };

  // Check for deleted account
  const checkDeletedAccount = async (phoneNumber) => {
    try {
      const response = await apiClient.post('/auth/check-deleted-account', { phone: phoneNumber });
      
      if (response.data.hasDeletedAccount) {
        setDeletedAccountData(response.data.data);
        setShowRecoveryDialog(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Check deleted account error:', error);
      return false;
    }
  };

  // Send OTP
  const handleSendOTP = async () => {
    if (displayPhone.replace(/\s/g, '').length !== 10) {
      setLocalError('Please enter a valid 10-digit mobile number');
      return;
    }

    // First check if there's a deleted account
    const hasDeletedAccount = await checkDeletedAccount(phone);
    if (hasDeletedAccount) {
      return; // Show recovery dialog instead
    }

    try {
      setOtpLoading(true);
      setLocalError('');
      
      const response = await apiClient.post('/auth/send-otp', {
        phone,
        purpose: 'signup'
      });

      if (response.data.success) {
        setOtpSent(true);
        setResendTimer(60);
        toast.success('OTP sent successfully!');
        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      setLocalError(error.response?.data?.error || 'Failed to send OTP');
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle account recovery
  const handleRecoverAccount = async () => {
    setShowRecoveryDialog(false);
    
    try {
      setOtpLoading(true);
      
      // Send OTP for recovery
      const response = await apiClient.post('/auth/send-otp', {
        phone,
        purpose: 'login'
      });
      
      if (response.data.success) {
        setOtpSent(true);
        setResendTimer(60);
        toast.success('OTP sent to your phone number');
        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle create new account (skip recovery)
  const handleCreateNewAccount = async () => {
    setShowRecoveryDialog(false);
    
    try {
      setOtpLoading(true);
      setLocalError('');
      
      const response = await apiClient.post('/auth/send-otp', {
        phone,
        purpose: 'signup'
      });

      if (response.data.success) {
        setOtpSent(true);
        setResendTimer(60);
        toast.success('OTP sent successfully!');
        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      setLocalError(error.response?.data?.error || 'Failed to send OTP');
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setLocalError('Please enter a valid 6-digit OTP');
      return;
    }

    // If recovering account, use recovery endpoint
    if (deletedAccountData) {
      try {
        setRecoveringAccount(true);
        setLocalError('');
        
        const response = await apiClient.post('/auth/recover-account', {
          phone,
          otp
        });

        if (response.data.success) {
          // Save tokens and user data
          localStorage.setItem('accessToken', response.data.data.tokens.accessToken);
          localStorage.setItem('refreshToken', response.data.data.tokens.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
          
          // Update Redux state
          dispatch(setUser(response.data.data.user));
          
          toast.success(response.data.message || 'Welcome back! Your account has been recovered.');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Recover account error:', error);
        setLocalError(error.response?.data?.error || 'Failed to recover account');
        toast.error(error.response?.data?.error || 'Failed to recover account');
      } finally {
        setRecoveringAccount(false);
      }
      return;
    }

    // Normal OTP verification for new registration
    try {
      setVerifyingOtp(true);
      setLocalError('');
      
      const response = await apiClient.post('/auth/verify-otp', {
        phone,
        otp
      });

      if (response.data.success) {
        toast.success('Phone verified successfully!');
        setCurrentStep(3);
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      setLocalError(error.response?.data?.error || 'Invalid OTP');
      toast.error(error.response?.data?.error || 'Invalid OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Complete Registration
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name || !formData.gender) {
      setLocalError('Please fill in all required fields');
      return;
    }

    try {
      setRegistering(true);
      setLocalError('');
      
      const registrationData = {
        phone,
        ...formData,
        date_of_birth: formData.date_of_birth ? formData.date_of_birth.toISOString().split('T')[0] : null
      };

      // If Google signup, include Google data
      if (googleData) {
        registrationData.googleId = googleData.googleId;
        registrationData.email = googleData.email;
        registrationData.profile_image = googleData.profile_image;
        
        const response = await apiClient.post('/auth/complete-google-registration', registrationData);
        
        if (response.data.success) {
          localStorage.setItem('accessToken', response.data.data.tokens.accessToken);
          localStorage.setItem('refreshToken', response.data.data.tokens.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
          
          // Update Redux state
          dispatch(setUser(response.data.data.user));
          
          toast.success('Registration successful! Welcome to SportLife.');
          navigate('/dashboard');
        }
      } else if (facebookData) {
        // Facebook signup
        registrationData.facebookId = facebookData.facebookId;
        registrationData.email = facebookData.email;
        registrationData.profile_image = facebookData.profile_image;
        
        const response = await apiClient.post('/auth/complete-facebook-registration', registrationData);
        
        if (response.data.success) {
          localStorage.setItem('accessToken', response.data.data.tokens.accessToken);
          localStorage.setItem('refreshToken', response.data.data.tokens.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
          
          // Update Redux state
          dispatch(setUser(response.data.data.user));
          
          toast.success('Registration successful! Welcome to SportLife.');
          navigate('/dashboard');
        }
      } else {
        // Mobile signup
        const response = await apiClient.post('/auth/complete-registration', registrationData);
        
        if (response.data.success) {
          localStorage.setItem('accessToken', response.data.data.tokens.accessToken);
          localStorage.setItem('refreshToken', response.data.data.tokens.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
          
          // Update Redux state
          dispatch(setUser(response.data.data.user));
          
          toast.success('Registration successful! Welcome to SportLife.');
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setLocalError(error.response?.data?.error || 'Registration failed');
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  // Google Login Handler
  const handleGoogleSignup = useGoogleLogin({
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
          if (response.data.needsProfileCompletion) {
            // New Google user - store data and show phone verification
            setGoogleData(response.data.googleData);
            setFormData({
              ...formData,
              first_name: response.data.googleData.first_name,
              last_name: response.data.googleData.last_name,
              email: response.data.googleData.email || ''
            });
            toast('Please verify your phone number', { icon: 'ℹ️' });
            setCurrentStep(1); // Go to phone verification
          } else {
            // Existing user - direct login
            localStorage.setItem('accessToken', response.data.data.tokens.accessToken);
            localStorage.setItem('refreshToken', response.data.data.tokens.refreshToken);
            localStorage.setItem('user', JSON.stringify(response.data.data.user));
            
            // Update Redux state
            dispatch(setUser(response.data.data.user));
            
            toast.success('Login successful!');
            navigate('/dashboard');
          }
        }
      } catch (error) {
        console.error('Google signup error:', error);
        toast.error(error.response?.data?.error || 'Google signup failed');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast.error('Google signup failed');
    },
  });

  // Facebook Signup Handler
  const handleFacebookSignup = () => {
    setFacebookLoading(true);
    
    window.FB.login((response) => {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        
        // Get user info from Facebook
        window.FB.api('/me', { fields: 'id,name,email,first_name,last_name,picture' }, async (userInfo) => {
          try {
            // Send to backend
            const backendResponse = await apiClient.post('/auth/facebook', {
              accessToken,
              userInfo
            });

            if (backendResponse.data.success) {
              if (backendResponse.data.needsProfileCompletion) {
                // New Facebook user - store data and show phone verification
                setFacebookData(backendResponse.data.facebookData);
                setFormData({
                  ...formData,
                  first_name: backendResponse.data.facebookData.first_name,
                  last_name: backendResponse.data.facebookData.last_name,
                  email: backendResponse.data.facebookData.email || ''
                });
                toast('Please verify your phone number', { icon: 'ℹ️' });
                setCurrentStep(1); // Go to phone verification
              } else {
                // Existing user - direct login
                localStorage.setItem('accessToken', backendResponse.data.data.tokens.accessToken);
                localStorage.setItem('refreshToken', backendResponse.data.data.tokens.refreshToken);
                localStorage.setItem('user', JSON.stringify(backendResponse.data.data.user));
                
                // Update Redux state
                dispatch(setUser(backendResponse.data.data.user));
                
                toast.success('Login successful!');
                navigate('/dashboard');
              }
            }
          } catch (error) {
            console.error('Facebook signup error:', error);
            toast.error(error.response?.data?.error || 'Facebook signup failed');
          } finally {
            setFacebookLoading(false);
          }
        });
      } else {
        toast.error('Facebook signup cancelled');
        setFacebookLoading(false);
      }
    }, { scope: 'public_profile,email' });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setLocalError('');
  };

  const handleSportToggle = (sportId) => {
    setFormData(prev => {
      const isSelected = prev.sport_interests.find(s => s.sport_id === sportId);
      return {
        ...prev,
        sport_interests: isSelected
          ? prev.sport_interests.filter(s => s.sport_id !== sportId)
          : [...prev.sport_interests, { sport_id: sportId, skill_level: 'beginner' }]
      };
    });
  };

  const handleSkillLevelChange = (sportId, skillLevel) => {
    setFormData(prev => ({
      ...prev,
      sport_interests: prev.sport_interests.map(s => 
        s.sport_id === sportId ? { ...s, skill_level: skillLevel } : s
      )
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      {/* Account Recovery Dialog */}
      {showRecoveryDialog && deletedAccountData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Account Found!
              </h3>
              <p className="text-gray-600">
                We found an account associated with this phone number that was deleted on{' '}
                <span className="font-semibold">
                  {new Date(deletedAccountData.deletedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </p>
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-primary-700">
                <strong className="block text-base mb-1">
                  {deletedAccountData.firstName} {deletedAccountData.lastName}
                </strong>
                <span className="text-primary-600">{deletedAccountData.email}</span>
                <br />
                <span className="text-primary-600">{deletedAccountData.phone}</span>
              </p>
            </div>

            <p className="text-sm text-gray-600 mb-6 text-center">
              Would you like to recover your account or create a new one?
            </p>

            <div className="space-y-3">
              <button
                onClick={handleRecoverAccount}
                className="w-full px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg hover:from-primary-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Recover My Account
              </button>
              <button
                onClick={handleCreateNewAccount}
                className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
              >
                Create New Account
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl w-full">
        <div className="grid md:grid-cols-2 gap-0 bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Left Side - Branding & Description */}
          <div className="hidden md:flex flex-col justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-teal-700 p-12 text-white">
            <div className="space-y-8">
              {/* Logo */}
              <div>
                <LogoAuth size="lg" showText={true} />
              </div>
              {/* <p className="text-white/90 text-lg mt-4">Tournament Management Platform</p> */}

              {/* Description */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-3">Join Our Community!</h2>
                  <p className="text-primary-100 text-lg leading-relaxed">
                    Create your account and start your journey in competitive sports management.
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-white/20 rounded-lg p-2 mt-1">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Quick Registration</h3>
                      <p className="text-primary-100 text-sm">Sign up in minutes with mobile verification</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-white/20 rounded-lg p-2 mt-1">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Personalized Profile</h3>
                      <p className="text-primary-100 text-sm">Customize your sports interests and preferences</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-white/20 rounded-lg p-2 mt-1">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Start Competing</h3>
                      <p className="text-primary-100 text-sm">Join tournaments and showcase your skills</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Registration Form */}
          <div className="p-8 md:p-12 overflow-y-auto max-h-screen">
            {/* Mobile Header */}
            <div className="md:hidden text-center mb-6">
              <div className="flex justify-center mb-4">
                <Logo size="md" showText={true} clickable={false} />
              </div>
              <p className="text-gray-600">Create your account to get started</p>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:block mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
              <p className="text-gray-600">Create your account to get started</p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${currentStep >= 1 ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg' : 'bg-gray-200 text-gray-600'}`}>
                  {currentStep > 1 ? <CheckCircle className="h-6 w-6" /> : '1'}
                </div>
                <div className={`w-12 h-1 transition-all ${currentStep >= 2 ? 'bg-gradient-to-r from-primary-500 to-primary-600' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${currentStep >= 2 ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg' : 'bg-gray-200 text-gray-600'}`}>
                  {currentStep > 2 ? <CheckCircle className="h-6 w-6" /> : '2'}
                </div>
                <div className={`w-12 h-1 transition-all ${currentStep >= 3 ? 'bg-gradient-to-r from-primary-500 to-primary-600' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${currentStep >= 3 ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg' : 'bg-gray-200 text-gray-600'}`}>
                  3
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div>
          {/* Step 1: Phone Number */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {googleData || facebookData ? 'Verify Your Phone Number' : 'Enter Your Mobile Number'}
                </h2>
                <p className="text-sm text-gray-600">
                  {googleData || facebookData ? 'We need to verify your phone number' : 'We\'ll send you an OTP to verify'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span className="ml-2 text-gray-600">+91</span>
                  </div>
                  <input
                    type="text"
                    value={displayPhone}
                    onChange={handlePhoneChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && displayPhone.replace(/\s/g, '').length === 10 && !otpLoading) {
                        handleSendOTP();
                      }
                    }}
                    placeholder="98765 43210"
                    className="block w-full pl-20 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {localError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span>{localError}</span>
                </div>
              )}

              <button
                onClick={handleSendOTP}
                disabled={otpLoading || displayPhone.replace(/\s/g, '').length !== 10}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 rounded-lg font-semibold hover:from-primary-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {otpLoading ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Send OTP
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              {!googleData && !facebookData && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleGoogleSignup}
                      disabled={googleLoading}
                      className="border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 hover:border-primary-300 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                    >
                      {googleLoading ? (
                        <Loader className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <span className="hidden sm:inline">Google</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleFacebookSignup}
                      disabled={facebookLoading}
                      className="border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 hover:border-blue-300 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                    >
                      {facebookLoading ? (
                        <Loader className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          <span className="hidden sm:inline">Facebook</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: OTP Verification */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Verify OTP</h2>
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code sent to +91 {displayPhone}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OTP Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 6) {
                      setOtp(value);
                      setLocalError('');
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && otp.length === 6 && !verifyingOtp && !recoveringAccount) {
                      handleVerifyOTP();
                    }
                  }}
                  placeholder="000000"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center text-2xl tracking-widest transition-all"
                  maxLength={6}
                />
              </div>

              {localError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span>{localError}</span>
                </div>
              )}

              <button
                onClick={handleVerifyOTP}
                disabled={verifyingOtp || recoveringAccount || otp.length !== 6}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 rounded-lg font-semibold hover:from-primary-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {verifyingOtp || recoveringAccount ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    {deletedAccountData ? 'Recovering Account...' : 'Verifying...'}
                  </>
                ) : (
                  <>
                    {deletedAccountData ? 'Recover Account' : 'Verify OTP'}
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <div className="text-center">
                {resendTimer > 0 ? (
                  <p className="text-sm text-gray-600">
                    Resend OTP in {resendTimer}s
                  </p>
                ) : (
                  <button
                    onClick={handleSendOTP}
                    className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setCurrentStep(1);
                  setOtp('');
                  setLocalError('');
                }}
                className="w-full text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Change Phone Number
              </button>
            </div>
          )}

          {/* Step 3: User Details */}
          {currentStep === 3 && (
            <form onSubmit={handleCompleteRegistration} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Complete Your Profile</h2>
                <p className="text-sm text-gray-600">Tell us a bit about yourself</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <DatePicker
                  selected={formData.date_of_birth}
                  onChange={(date) => setFormData({ ...formData, date_of_birth: date })}
                  dateFormat="dd/MM/yyyy"
                  showYearDropdown
                  scrollableYearDropdown
                  yearDropdownItemNumber={100}
                  showMonthDropdown
                  maxDate={new Date()}
                  placeholderText="Select date"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Handedness
                </label>
                <select
                  name="handedness"
                  value={formData.handedness}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Handedness</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="ambidextrous">Ambidextrous</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Sport Interests (Optional)
                </label>
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-80 overflow-y-auto">
                  {loadingSports ? (
                    <div className="text-center py-4">
                      <Loader className="h-6 w-6 animate-spin mx-auto text-primary-500" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sports.map((sport) => {
                        const selectedSport = formData.sport_interests.find(s => s.sport_id === sport.id);
                        const isSelected = !!selectedSport;
                        
                        return (
                          <div
                            key={sport.id}
                            className={`bg-white border-2 rounded-lg p-3 transition-all duration-200 ${
                              isSelected 
                                ? 'border-primary-500 bg-primary-50' 
                                : 'border-gray-200 hover:border-primary-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSportToggle(sport.id)}
                                className="w-4 h-4 mt-1 text-primary-500 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 cursor-pointer flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <div className="font-semibold text-gray-900 text-sm">{sport.name}</div>
                                    <div className="text-xs text-gray-500 capitalize">{sport.category}</div>
                                  </div>
                                </div>
                                
                                {isSelected && (
                                  <div className="mt-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                      Skill Level
                                    </label>
                                    <div className="flex gap-2">
                                      {['beginner', 'intermediate', 'advanced', 'professional'].map((level) => (
                                        <button
                                          key={level}
                                          type="button"
                                          onClick={() => handleSkillLevelChange(sport.id, level)}
                                          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                            selectedSport.skill_level === level
                                              ? 'bg-primary-500 text-white shadow-sm'
                                              : 'bg-white text-gray-700 border border-gray-300 hover:border-primary-500 hover:bg-primary-50'
                                          }`}
                                        >
                                          {level.charAt(0).toUpperCase() + level.slice(1)}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {localError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span>{localError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={registering}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 rounded-lg font-semibold hover:from-primary-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {registering ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    Completing profile...
                  </>
                ) : (
                  <>
                    Complete Profile
                    <CheckCircle className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          )}
            </div>

            {/* Footer */}
            <div className="text-center mt-8">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-500 hover:text-primary-600 font-semibold transition-colors">
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterNew;
