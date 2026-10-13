import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/datepicker-custom.css';
import Navbar from '../components/Navbar';
import { createTournament, clearError, clearSuccess } from '../store/slices/tournamentSlice';
import { getSports } from '../services/sportService';
import { getVenues /*, checkVenueAvailability*/ } from '../services/venueService';
import { getSportConfig, getSportPresets } from '../services/sportConfigService';
import { formatDate } from '../utils/dateFormatter';
import {
  ArrowLeft,
  Trophy,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Info,
  CheckCircle,
  AlertCircle,
  Save,
  Loader,
  Settings,
  Image as ImageIcon
} from 'lucide-react';

const CreateTournament = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error, success } = useSelector((state) => state.tournament);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    sport_id: '',
    venue_id: '',
    custom_venue_name: '',
    start_date: '',
    end_date: '',
    registration_start: '',
    registration_end: '',
    max_participants: '',
    entry_fee: '0',
    prize_money: '0',
    format_type: 'knockout',
    category: 'singles',
    tournament_type: 'open',
    match_config: null,
    rules: {}
  });

  const [sports, setSports] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loadingSports, setLoadingSports] = useState(false);
  const [loadingVenues, setLoadingVenues] = useState(false);
  // const [venueAvailability, setVenueAvailability] = useState(null);
  // const [checkingVenue, setCheckingVenue] = useState(false);

  // Sport configuration state
  const [sportConfig, setSportConfig] = useState(null);
  const [sportPresets, setSportPresets] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [matchConfigForm, setMatchConfigForm] = useState({});

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [showCustomVenue, setShowCustomVenue] = useState(false);

  // Validation state
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    // Fetch sports
    const fetchSports = async () => {
      setLoadingSports(true);
      try {
        const response = await getSports();
        console.log(response.data);
        setSports(response.data || []);
      } catch (error) {
        console.error('Failed to fetch sports:', error);
      } finally {
        setLoadingSports(false);
      }
    };

    // Fetch venues
    const fetchVenues = async () => {
      setLoadingVenues(true);
      try {
        const response = await getVenues({ is_active: true });
        setVenues(response.data || []);
      } catch (error) {
        console.error('Failed to fetch venues:', error);
      } finally {
        setLoadingVenues(false);
      }
    };

    fetchSports();
    fetchVenues();

    return () => {
      dispatch(clearError());
      dispatch(clearSuccess());
    };
  }, [dispatch]);

  // Load sport configuration when sport changes
  useEffect(() => {
    if (formData.sport_id) {
      loadSportConfiguration(formData.sport_id);
    } else {
      setSportConfig(null);
      setSportPresets([]);
      setMatchConfigForm({});
    }
  }, [formData.sport_id]);

  useEffect(() => {
    if (success) {
      setTimeout(() => {
        navigate('/tournaments/my-tournaments');
      }, 2000);
    }
  }, [success, navigate]);

  const loadSportConfiguration = async (sportId) => {
    setLoadingConfig(true);
    try {
      const [configRes, presetsRes] = await Promise.all([
        getSportConfig(sportId),
        getSportPresets(sportId)
      ]);
      
      setSportConfig(configRes.data);
      setSportPresets(presetsRes.data || []);
      
      // Set default config
      if (configRes.data && configRes.data.default_config) {
        const defaultConfig = configRes.data.default_config;
        setMatchConfigForm(defaultConfig);
        
        // Auto-select first available category
        const categorySupport = configRes.data.category_support;
        let defaultCategory = 'singles';
        
        if (categorySupport) {
          if (categorySupport.singles) {
            defaultCategory = 'singles';
          } else if (categorySupport.doubles) {
            defaultCategory = 'doubles';
          } else if (categorySupport.teams) {
            defaultCategory = 'teams';
          }
        }
        
        setFormData(prev => ({
          ...prev,
          category: defaultCategory,
          match_config: defaultConfig
        }));
      }
    } catch (error) {
      console.error('Failed to load sport configuration:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle venue selection change
    if (name === 'venue_id') {
      if (value === 'custom') {
        setShowCustomVenue(true);
        setFormData({
          ...formData,
          venue_id: '',
          custom_venue_name: ''
        });
      } else {
        setShowCustomVenue(false);
        setFormData({
          ...formData,
          venue_id: value,
          custom_venue_name: ''
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    dispatch(clearError());
    
    // Reset venue availability when dates or venue changes
    // if (name === 'venue_id' || name === 'start_date' || name === 'end_date') {
    //   setVenueAvailability(null);
    // }
  };

  // Handle field blur to mark field as touched
  const handleBlur = (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName);
  };

  // Validate individual field
  const validateField = (fieldName) => {
    const errors = {};
    
    switch (fieldName) {
      case 'name':
        if (!formData.name || formData.name.trim() === '') {
          errors.name = 'Tournament Name is required.';
        }
        break;
      case 'sport_id':
        if (!formData.sport_id) {
          errors.sport_id = 'Sport is required.';
        }
        break;
      case 'max_participants':
        const participantLabel = 
          formData.category === 'singles' ? 'Players' :
          formData.category === 'doubles' ? 'Pairs' :
          formData.category === 'teams' ? 'Teams' : 'Participants';
        
        if (!formData.max_participants) {
          errors.max_participants = `Maximum ${participantLabel} is required.`;
        } else if (formData.max_participants < 2) {
          errors.max_participants = `Maximum ${participantLabel} must be at least 2.`;
        } else if (formData.max_participants > 1000) {
          errors.max_participants = `Maximum ${participantLabel} cannot exceed 1000.`;
        }
        break;
      case 'start_date':
        if (!formData.start_date) {
          errors.start_date = 'Start Date is required.';
        }
        break;
      case 'end_date':
        if (!formData.end_date) {
          errors.end_date = 'End Date is required.';
        } else if (formData.start_date && new Date(formData.end_date) < new Date(formData.start_date)) {
          errors.end_date = 'End Date must be after Start Date.';
        }
        break;
      case 'registration_start':
        if (!formData.registration_start) {
          errors.registration_start = 'Registration Start Date is required.';
        }
        break;
      case 'registration_end':
        if (!formData.registration_end) {
          errors.registration_end = 'Registration End Date is required.';
        } else if (formData.registration_start && new Date(formData.registration_end) < new Date(formData.registration_start)) {
          errors.registration_end = 'Registration End Date must be after Registration Start Date.';
        } else if (formData.start_date && new Date(formData.registration_end) > new Date(formData.start_date)) {
          errors.registration_end = 'Registration must end before Tournament Start Date.';
        }
        break;
      case 'venue_id':
        if (!formData.venue_id && !showCustomVenue) {
          errors.venue_id = 'Venue is required.';
        }
        break;
      case 'custom_venue_name':
        if (showCustomVenue && (!formData.custom_venue_name || formData.custom_venue_name.trim() === '')) {
          errors.custom_venue_name = 'Custom Venue Name is required.';
        }
        break;
      default:
        break;
    }
    
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      if (Object.keys(errors).length > 0) {
        return { ...newErrors, ...errors };
      } else {
        delete newErrors[fieldName];
        return newErrors;
      }
    });
  };

  // Validate all required fields
  const validateForm = () => {
    const errors = {};
    
    // Tournament Name
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Tournament Name is required.';
    }
    
    // Sport
    if (!formData.sport_id) {
      errors.sport_id = 'Sport is required.';
    }
    
    // Maximum Participants
    const participantLabel = 
      formData.category === 'singles' ? 'Players' :
      formData.category === 'doubles' ? 'Pairs' :
      formData.category === 'teams' ? 'Teams' : 'Participants';
    
    if (!formData.max_participants) {
      errors.max_participants = `Maximum ${participantLabel} is required.`;
    } else if (formData.max_participants < 2) {
      errors.max_participants = `Maximum ${participantLabel} must be at least 2.`;
    } else if (formData.max_participants > 1000) {
      errors.max_participants = `Maximum ${participantLabel} cannot exceed 1000.`;
    }
    
    // Start Date
    if (!formData.start_date) {
      errors.start_date = 'Start Date is required.';
    }
    
    // End Date
    if (!formData.end_date) {
      errors.end_date = 'End Date is required.';
    } else if (formData.start_date && new Date(formData.end_date) < new Date(formData.start_date)) {
      errors.end_date = 'End Date must be after Start Date.';
    }
    
    // Registration Start
    if (!formData.registration_start) {
      errors.registration_start = 'Registration Start Date is required.';
    }
    
    // Registration End
    if (!formData.registration_end) {
      errors.registration_end = 'Registration End Date is required.';
    } else if (formData.registration_start && new Date(formData.registration_end) < new Date(formData.registration_start)) {
      errors.registration_end = 'Registration End Date must be after Registration Start Date.';
    } else if (formData.start_date && new Date(formData.registration_end) > new Date(formData.start_date)) {
      errors.registration_end = 'Registration must end before Tournament Start Date.';
    }
    
    // Venue
    if (!formData.venue_id && !showCustomVenue) {
      errors.venue_id = 'Venue is required.';
    }
    
    // Custom Venue Name
    if (showCustomVenue && (!formData.custom_venue_name || formData.custom_venue_name.trim() === '')) {
      errors.custom_venue_name = 'Custom Venue Name is required.';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleMatchConfigChange = (field, value) => {
    // Allow empty string for text inputs, but store as empty in config
    const processedValue = value === '' ? '' : value;
    
    const newConfig = {
      ...matchConfigForm,
      [field]: processedValue
    };
    
    // Auto-calculate dependent fields only if value is a valid number
    if (field === 'total_sets' && value !== '' && !isNaN(value)) {
      newConfig.sets_to_win = Math.ceil(parseInt(value) / 2);
    }
    if (field === 'total_games' && value !== '' && !isNaN(value)) {
      newConfig.games_to_win = Math.ceil(parseInt(value) / 2);
    }
    
    setMatchConfigForm(newConfig);
    setFormData(prev => ({
      ...prev,
      match_config: newConfig
    }));
  };

  // Validate match configuration before submission
  const validateMatchConfig = () => {
    if (!sportConfig || !matchConfigForm) return true;

    const errors = [];
    
    // Helper function to check if value is empty (handles 0 as valid)
    const isEmpty = (value) => value === '' || value === null || value === undefined;
    
    if (sportConfig.match_structure === 'set_based') {
      if (isEmpty(matchConfigForm.total_sets)) {
        errors.push('Total Sets is required');
      } else if (matchConfigForm.total_sets < 1 || matchConfigForm.total_sets > 9) {
        errors.push('Total Sets must be between 1 and 9');
      }
      
      // Skip points_per_set validation for Tennis/Padel (they use 0-15-30-40-Game scoring)
      const selectedSport = sports.find(s => s.id === parseInt(formData.sport_id));
      const isTennisOrPadel = selectedSport?.name === 'Tennis' || selectedSport?.name === 'Padel';
      
      if (!isTennisOrPadel) {
        if (isEmpty(matchConfigForm.points_per_set)) {
          errors.push('Points per Set is required');
        } else if (matchConfigForm.points_per_set < 1 || matchConfigForm.points_per_set > 100) {
          errors.push('Points per Set must be between 1 and 100');
        }
        
        // Validate win_by_margin
        if (!isEmpty(matchConfigForm.win_by_margin)) {
          if (matchConfigForm.win_by_margin < 0) {
            errors.push('Win by Margin cannot be negative');
          } else if (!isEmpty(matchConfigForm.points_per_set) && matchConfigForm.win_by_margin >= matchConfigForm.points_per_set) {
            errors.push(`Win by Margin (${matchConfigForm.win_by_margin}) must be less than Points per Set (${matchConfigForm.points_per_set})`);
          }
        }
      }
    }
    
    if (sportConfig.match_structure === 'game_based') {
      if (isEmpty(matchConfigForm.total_games)) {
        errors.push('Total Games is required');
      } else if (matchConfigForm.total_games < 1 || matchConfigForm.total_games > 9) {
        errors.push('Total Games must be between 1 and 9');
      }
      
      if (isEmpty(matchConfigForm.points_per_game)) {
        errors.push('Points per Game is required');
      } else if (matchConfigForm.points_per_game < 1 || matchConfigForm.points_per_game > 100) {
        errors.push('Points per Game must be between 1 and 100');
      }
      
      // Validate win_by_margin
      if (!isEmpty(matchConfigForm.win_by_margin)) {
        if (matchConfigForm.win_by_margin < 0) {
          errors.push('Win by Margin cannot be negative');
        } else if (!isEmpty(matchConfigForm.points_per_game) && matchConfigForm.win_by_margin >= matchConfigForm.points_per_game) {
          errors.push(`Win by Margin (${matchConfigForm.win_by_margin}) must be less than Points per Game (${matchConfigForm.points_per_game})`);
        }
      }
    }
    
    if (sportConfig.match_structure === 'time_based') {
      if (isEmpty(matchConfigForm.periods)) {
        errors.push('Number of Periods is required');
      } else if (matchConfigForm.periods < 1 || matchConfigForm.periods > 6) {
        errors.push('Number of Periods must be between 1 and 6');
      }
      
      if (isEmpty(matchConfigForm.period_duration)) {
        errors.push('Period Duration is required');
      } else if (matchConfigForm.period_duration < 1 || matchConfigForm.period_duration > 120) {
        errors.push('Period Duration must be between 1 and 120 minutes');
      }
      
      // Break duration is optional but validate range if provided
      if (!isEmpty(matchConfigForm.break_duration)) {
        if (matchConfigForm.break_duration < 0 || matchConfigForm.break_duration > 60) {
          errors.push('Break Duration must be between 0 and 60 minutes');
        }
      }
    }

    if (errors.length > 0) {
      alert('Please fill all required match configuration fields:\n' + errors.join('\n'));
      return false;
    }
    
    return true;
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, GIF, WEBP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploadingLogo(true);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('logo', file);

      // Upload to backend
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/upload/logo`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      // Set the uploaded file URL with full API URL
      const logoPath = data.data.url || data.data.path;
      // If path doesn't start with http, prepend API URL
      const fullLogoUrl = logoPath.startsWith('http') 
        ? logoPath 
        : `${import.meta.env.VITE_API_URL}${logoPath}`;
      
      setFormData(prev => ({
        ...prev,
        logo_url: fullLogoUrl
      }));
      
      // Set preview
      setLogoPreview(URL.createObjectURL(file));
      
    } catch (error) {
      console.error('Logo upload failed:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  // FUTURE USE: Venue availability check functionality
  // const handleCheckVenueAvailability = async () => {
  //   if (!formData.venue_id || !formData.start_date || !formData.end_date) {
  //     return;
  //   }

  //   setCheckingVenue(true);
  //   try {
  //     const response = await checkVenueAvailability(
  //       formData.venue_id,
  //       formData.start_date,
  //       formData.end_date
  //     );
  //     setVenueAvailability(response.data);
  //   } catch (error) {
  //     console.error('Failed to check venue availability:', error);
  //     setVenueAvailability({
  //       is_available: false,
  //       message: 'Failed to check availability'
  //     });
  //   } finally {
  //     setCheckingVenue(false);
  //   }
  // };

  // Helper function to format date as local ISO string (preserve local time, not UTC)
  const formatDateAsLocalISO = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    // Return ISO format WITHOUT Z suffix - this is local time, not UTC
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  // Helper function to format date for backend (local timezone)
  const formatDateForBackend = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    // Format as YYYY-MM-DD HH:MM:SS in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      sport_id: true,
      max_participants: true,
      start_date: true,
      end_date: true,
      registration_start: true,
      registration_end: true,
      venue_id: true,
      custom_venue_name: true
    });

    // Validate form
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(validationErrors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      return;
    }

    // Validate match configuration
    if (!validateMatchConfig()) {
      return;
    }

    // For Tennis/Padel, set default points_per_set if not provided (they use 0-15-30-40-Game scoring)
    const selectedSport = sports.find(s => s.id === parseInt(formData.sport_id));
    const isTennisOrPadel = selectedSport?.name === 'Tennis' || selectedSport?.name === 'Padel';
    
    let matchConfig = formData.match_config;
    if (isTennisOrPadel && sportConfig?.match_structure === 'set_based' && matchConfig) {
      matchConfig = {
        ...matchConfig,
        points_per_set: matchConfig.points_per_set || 6 // Default to 6 games per set
      };
    }

    // Prepare data
    const tournamentData = {
      ...formData,
      match_config: matchConfig,
      sport_id: parseInt(formData.sport_id) || 1, // Default to 1 if not set
      venue_id: formData.venue_id ? parseInt(formData.venue_id) : undefined,
      max_participants: formData.max_participants ? parseInt(formData.max_participants) : undefined,
      entry_fee: parseFloat(formData.entry_fee) || 0,
      prize_money: parseFloat(formData.prize_money) || 0,
      // Format dates properly for backend
      start_date: formatDateForBackend(formData.start_date),
      end_date: formatDateForBackend(formData.end_date),
      registration_start: formatDateForBackend(formData.registration_start),
      registration_end: formatDateForBackend(formData.registration_end)
    };

    // Remove empty fields
    Object.keys(tournamentData).forEach(key => {
      if (tournamentData[key] === '' || tournamentData[key] === undefined || tournamentData[key] === null) {
        delete tournamentData[key];
      }
    });

    await dispatch(createTournament(tournamentData));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
      {/* Navbar */}
      <Navbar />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/tournaments')}
              className="p-2 hover:bg-primary-50 rounded-xl transition-all duration-200 hover:scale-105 group"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-primary-500 transition-colors" />
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                Create Tournament
              </h1>
              <p className="text-sm text-gray-600">Set up a new tournament</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Success Alert */}
            {success && (
              <div className="bg-primary-50 border-l-4 border-primary-500 text-primary-600 px-4 py-3 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Success!</p>
                  <p className="text-sm">{success}</p>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Failed to create tournament</p>
                  {Array.isArray(error) ? (
                    <ul className="mt-2 space-y-1">
                      {error.map((err, index) => (
                        <li key={index} className="text-sm">
                          <span className="font-medium capitalize">{err.field?.replace(/_/g, ' ')}</span>: {err.message}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm mt-1">{error}</p>
                  )}
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>
                  <p className="text-xs text-gray-500">Tournament name and description</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Tournament Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Tournament Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={() => handleBlur('name')}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none ${
                      touched.name && validationErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Summer Tennis Championship 2024"
                  />
                  {touched.name && validationErrors.name && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.name}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none resize-none"
                    placeholder="Describe your tournament..."
                  />
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tournament Logo <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                  </label>
                  
                  <div className="flex gap-3 items-start">
                    {/* File Upload Button */}
                    <div className="flex-1">
                      <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <div className="flex items-center gap-2">
                          {uploadingLogo ? (
                            <>
                              <Loader className="w-5 h-5 animate-spin text-primary-500" />
                              <span className="text-sm text-gray-600">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-5 h-5 text-gray-500" />
                              <span className="text-sm text-gray-600">
                                {formData.logo_url ? 'Change Logo' : 'Upload Logo'}
                              </span>
                            </>
                          )}
                        </div>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG, GIF, WEBP (Max 5MB)
                      </p>
                    </div>

                    {/* Logo Preview */}
                    {(logoPreview || formData.logo_url) && (
                      <div className="relative">
                        <div className="w-24 h-24 border-2 border-gray-300 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                          <img 
                            src={logoPreview || formData.logo_url} 
                            alt="Logo preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, logo_url: '' }));
                            setLogoPreview(null);
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Optional: URL Input */}
                  <div className="mt-3">
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-600 hover:text-primary-500">
                        Or enter logo URL manually
                      </summary>
                      <input
                        type="url"
                        name="logo_url"
                        value={formData.logo_url}
                        onChange={handleChange}
                        className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                        placeholder="https://example.com/logo.png"
                      />
                    </details>
                  </div>
                </div>
              </div>
            </div>

            {/* Tournament Settings */}
            <div className="pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Info className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Tournament Settings</h3>
                  <p className="text-xs text-gray-500">Format, category, and rules</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Sport Selection */}
                <div>
                  <label htmlFor="sport_id" className="block text-sm font-semibold text-gray-700 mb-2">
                    Sport <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="sport_id"
                    name="sport_id"
                    value={formData.sport_id}
                    onChange={handleChange}
                    onBlur={() => handleBlur('sport_id')}
                    disabled={loadingSports}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      touched.sport_id && validationErrors.sport_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">{loadingSports ? 'Loading sports...' : 'Select a sport'}</option>
                    {sports.map((sport) => (
                      <option key={sport.id} value={sport.id}>
                        {sport.name} ({sport.category})
                      </option>
                    ))}
                  </select>
                  {touched.sport_id && validationErrors.sport_id && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.sport_id}
                    </p>
                  )}
                </div>

                {/* Format Type */}
                <div>
                  <label htmlFor="format_type" className="block text-sm font-semibold text-gray-700 mb-2">
                    Format <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="format_type"
                    name="format_type"
                    required
                    value={formData.format_type}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none bg-white"
                  >
                    <option value="knockout">Knockout</option>
                    <option value="round_robin">Round Robin</option>
                    <option value="groups_knockout">Groups + Knockout</option>
                    <option value="league">League</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none bg-white"
                  >
                    {!sportConfig ? (
                      <>
                        <option value="singles">Singles</option>
                        <option value="doubles">Doubles</option>
                        <option value="teams">Teams</option>
                      </>
                    ) : (
                      <>
                        {sportConfig.category_support?.singles && (
                          <option value="singles">Singles</option>
                        )}
                        {sportConfig.category_support?.doubles && (
                          <option value="doubles">Doubles</option>
                        )}
                        {sportConfig.category_support?.teams && (
                          <option value="teams">Teams</option>
                        )}
                      </>
                    )}
                  </select>
                  {sportConfig && (
                    <p className="text-xs text-gray-500 mt-1">
                      {/* {sportConfig.category_support?.singles && sportConfig.category_support?.doubles && sportConfig.category_support?.teams && 'All categories supported'} */}
                      {/* {sportConfig.category_support?.teams && !sportConfig.category_support?.singles && !sportConfig.category_support?.doubles && 'Only Teams category available'} */}
                      {/* {sportConfig.category_support?.singles && !sportConfig.category_support?.teams && 'Singles and Doubles only'} */}
                    </p>
                  )}
                </div>

                {/* Maximum Participants */}
                <div>
                  <label htmlFor="max_participants" className="block text-sm font-semibold text-gray-700 mb-2">
                    {formData.category === 'singles' && 'Maximum Players'}
                    {formData.category === 'doubles' && 'Maximum Pairs'}
                    {formData.category === 'teams' && 'Maximum Teams'}
                    {!formData.category && 'Maximum Participants'}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    id="max_participants"
                    name="max_participants"
                    type="number"
                    min="2"
                    max="1000"
                    value={formData.max_participants}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Prevent entering values greater than 1000
                      if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 1000)) {
                        handleChange(e);
                      }
                    }}
                    onBlur={() => handleBlur('max_participants')}
                    onKeyDown={(e) => {
                      // Prevent entering 'e', '+', '-' in number input
                      if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                        e.preventDefault();
                      }
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none ${
                      touched.max_participants && validationErrors.max_participants ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={
                      formData.category === 'singles' ? '32 players' :
                      formData.category === 'doubles' ? '16 pairs' :
                      formData.category === 'teams' ? '8 teams' :
                      '32'
                    }
                  />
                  {touched.max_participants && validationErrors.max_participants ? (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.max_participants}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.category === 'singles' && 'Number of individual players in the tournament'}
                      {formData.category === 'doubles' && 'Number of pairs (2 players per pair)'}
                      {formData.category === 'teams' && 'Number of teams competing'}
                    </p>
                  )}
                </div>

                {/* Tournament Type */}
                <div>
                  <label htmlFor="tournament_type" className="block text-sm font-semibold text-gray-700 mb-2">
                    Tournament Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="tournament_type"
                    name="tournament_type"
                    required
                    value={formData.tournament_type}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none bg-white"
                  >
                    <option value="open">Open - Anyone can register</option>
                    <option value="closed">Closed - Invitation only</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.tournament_type === 'open' ? 'Public registration allowed' : 'Requires invitation or approval'}
                  </p>
                </div>
              </div>
            </div>

            {/* Match Configuration Section */}
            {sportConfig && (
              <div className="pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Match Configuration</h3>
                    <p className="text-xs text-gray-500">
                      {sportConfig.sport_name} - {sportConfig.match_structure.replace('_', ' ')} format
                    </p>
                  </div>
                </div>

                {loadingConfig ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-6 h-6 animate-spin text-primary-500" />
                    <span className="ml-2 text-gray-600">Loading configuration...</span>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          {/* <p className="text-sm text-blue-800 font-medium">Customizable Match Rules</p> */}
                          <p className="text-xs text-blue-700 mt-1">
                            Configure how matches will be played. You have complete control over all settings!
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Render match config fields based on sport type */}
                    {sportConfig.match_structure === 'set_based' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Total Sets */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Total Sets <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={matchConfigForm.total_sets ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Allow empty or valid numbers between 1-9
                              if (val === '' || (/^[0-9]$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 9)) {
                                handleMatchConfigChange('total_sets', val === '' ? '' : parseInt(val));
                              }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                            placeholder="3"
                          />
                          <p className="text-xs text-gray-500 mt-1">Best of {matchConfigForm.total_sets || 3}</p>
                        </div>

                        {/* Sets to Win */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Sets to Win <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={matchConfigForm.sets_to_win ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const totalSets = matchConfigForm.total_sets || 3;
                              if (val === '' || (/^[0-9]$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= totalSets)) {
                                handleMatchConfigChange('sets_to_win', val === '' ? '' : parseInt(val));
                              }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                            placeholder={Math.ceil((matchConfigForm.total_sets || 3) / 2).toString()}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            First to win this many sets
                          </p>
                        </div>

                        {/* Hide Points per Set for Tennis/Padel (they use 0-15-30-40-Game scoring) */}
                        {(() => {
                          const selectedSport = sports.find(s => s.id === parseInt(formData.sport_id));
                          const isTennisOrPadel = selectedSport?.name === 'Tennis' || selectedSport?.name === 'Padel';
                          
                          if (isTennisOrPadel) return null;
                          
                          return (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Points per Set <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={matchConfigForm.points_per_set ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Allow empty or valid numbers between 1-100
                                  if (val === '' || (/^[0-9]{1,3}$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 100)) {
                                    handleMatchConfigChange('points_per_set', val === '' ? '' : parseInt(val));
                                  }
                                }}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                                placeholder="e.g., 21 for Badminton"
                              />
                              <p className="text-xs text-gray-500 mt-1">Any value from 1-100</p>
                            </div>
                          );
                        })()}

                        {/* Win by Margin - Always show but disabled */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Win by Margin
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={matchConfigForm.win_by_margin ?? 2}
                            disabled
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none bg-gray-100 text-gray-600 cursor-not-allowed"
                            placeholder="2"
                          />
                          <p className="text-xs text-gray-500 mt-1">Must win by this many points</p>
                        </div>

                        {/* Deuce Enabled */}
                        {/* <div className="flex items-center h-full pt-8">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={matchConfigForm.deuce_enabled || false}
                              onChange={(e) => handleMatchConfigChange('deuce_enabled', e.target.checked)}
                              className="w-5 h-5 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm font-semibold text-gray-700">Enable Deuce</span>
                          </label>
                        </div> */}
                      </div>
                    )}

                    {sportConfig.match_structure === 'game_based' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Total Games */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Total Games <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={matchConfigForm.total_games ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Allow empty or valid numbers between 1-9
                              if (val === '' || (/^[0-9]$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 9)) {
                                handleMatchConfigChange('total_games', val === '' ? '' : parseInt(val));
                              }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                            placeholder="3"
                          />
                          <p className="text-xs text-gray-500 mt-1">Best of {matchConfigForm.total_games || 3}</p>
                        </div>

                        {/* Games to Win */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Games to Win <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={matchConfigForm.games_to_win ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const totalGames = matchConfigForm.total_games || 3;
                              if (val === '' || (/^[0-9]$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= totalGames)) {
                                handleMatchConfigChange('games_to_win', val === '' ? '' : parseInt(val));
                              }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                            placeholder={Math.ceil((matchConfigForm.total_games || 3) / 2).toString()}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            First to win this many games
                          </p>
                        </div>

                        {/* Points per Game */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Points per Game <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={matchConfigForm.points_per_game ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Allow empty or valid numbers between 1-100
                              if (val === '' || (/^[0-9]{1,3}$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 100)) {
                                handleMatchConfigChange('points_per_game', val === '' ? '' : parseInt(val));
                              }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                            placeholder="e.g., 11 for Table Tennis"
                          />
                          <p className="text-xs text-gray-500 mt-1">Any value from 1-100</p>
                        </div>

                        {/* Win by Margin */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Win by Margin
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={matchConfigForm.win_by_margin ?? 2}
                            disabled
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none bg-gray-100 text-gray-600 cursor-not-allowed"
                            placeholder="2"
                          />
                          <p className="text-xs text-gray-500 mt-1">Must win by this many points</p>
                        </div>

                        {/* Deuce Enabled */}
                        <div className="flex items-center h-full pt-8">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={matchConfigForm.deuce_enabled || false}
                              onChange={(e) => handleMatchConfigChange('deuce_enabled', e.target.checked)}
                              className="w-5 h-5 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm font-semibold text-gray-700">Enable Deuce</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {sportConfig.match_structure === 'time_based' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Players Per Side */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Players Per Side <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={matchConfigForm.players_per_side || 11}
                            onChange={(e) => handleMatchConfigChange('players_per_side', parseInt(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none bg-white"
                          >
                            <option value={5}>5-a-side</option>
                            <option value={7}>7-a-side</option>
                            <option value={8}>8-a-side</option>
                            <option value={11}>11-a-side (Standard)</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">Number of players on each team</p>
                        </div>

                        {/* Number of Periods */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Number of Periods <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={matchConfigForm.periods ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Allow empty or valid numbers between 1-6
                              if (val === '' || (/^[0-9]$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 6)) {
                                handleMatchConfigChange('periods', val === '' ? '' : parseInt(val));
                              }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                            placeholder="2"
                          />
                          <p className="text-xs text-gray-500 mt-1">e.g., 2 halves for football</p>
                        </div>

                        {/* Period Duration */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Period Duration (minutes) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={matchConfigForm.period_duration ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Allow empty or valid numbers between 1-120
                              if (val === '' || (/^[0-9]{1,3}$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 120)) {
                                handleMatchConfigChange('period_duration', val === '' ? '' : parseInt(val));
                              }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                            placeholder="45"
                          />
                          <p className="text-xs text-gray-500 mt-1">Duration of each period</p>
                        </div>

                        {/* Break Duration */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Break Duration (minutes)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={matchConfigForm.break_duration ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Allow empty or valid numbers between 0-60
                              if (val === '' || (/^[0-9]{1,2}$/.test(val) && parseInt(val) >= 0 && parseInt(val) <= 60)) {
                                handleMatchConfigChange('break_duration', val === '' ? '' : parseInt(val));
                              }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                            placeholder="15"
                          />
                          <p className="text-xs text-gray-500 mt-1">Break between periods</p>
                        </div>

                        {/* Total Time Display */}
                        <div className="flex items-center justify-center bg-primary-50 rounded-lg p-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-600 font-medium">Total Match Time</p>
                            <p className="text-3xl font-bold text-primary-500">
                              {(matchConfigForm.periods || 2) * (matchConfigForm.period_duration || 45) + 
                               ((matchConfigForm.periods || 2) - 1) * (matchConfigForm.break_duration || 15)} min
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Dates and Venue */}
            <div className="pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Schedule & Venue</h3>
                  <p className="text-xs text-gray-500">Tournament dates and location</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Start Date */}
                <div>
                  <label htmlFor="start_date" className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    id="start_date"
                    selected={formData.start_date ? new Date(formData.start_date) : null}
                    onChange={(date) => {
                      if (date) {
                        setFormData({ ...formData, start_date: formatDateAsLocalISO(date) });
                      } else {
                        setFormData({ ...formData, start_date: '' });
                      }
                      if (validationErrors.start_date) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.start_date;
                          return newErrors;
                        });
                      }
                    }}
                    onBlur={() => handleBlur('start_date')}
                    dateFormat="dd/MM/yyyy h:mm aa"
                    placeholderText="Select start date"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none ${
                      touched.start_date && validationErrors.start_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                    minDate={new Date()}
                    showTimeSelect
                    timeFormat="h:mm aa"
                    timeIntervals={15}
                    timeCaption="Time"
                    showMonthDropdown
                    showYearDropdown
                    scrollableYearDropdown
                    yearDropdownItemNumber={15}
                  />
                  {touched.start_date && validationErrors.start_date && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.start_date}
                    </p>
                  )}
                </div>

                {/* End Date */}
                <div>
                  <label htmlFor="end_date" className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    id="end_date"
                    selected={formData.end_date ? new Date(formData.end_date) : null}
                    onChange={(date) => {
                      if (date) {
                        setFormData({ ...formData, end_date: formatDateAsLocalISO(date) });
                      } else {
                        setFormData({ ...formData, end_date: '' });
                      }
                      if (validationErrors.end_date) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.end_date;
                          return newErrors;
                        });
                      }
                    }}
                    onBlur={() => handleBlur('end_date')}
                    dateFormat="dd/MM/yyyy h:mm aa"
                    placeholderText="Select end date"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none ${
                      touched.end_date && validationErrors.end_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                    minDate={formData.start_date ? new Date(formData.start_date) : new Date()}
                    showTimeSelect
                    timeFormat="h:mm aa"
                    timeIntervals={15}
                    timeCaption="Time"
                    showMonthDropdown
                    showYearDropdown
                    scrollableYearDropdown
                    yearDropdownItemNumber={15}
                  />
                  {touched.end_date && validationErrors.end_date && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.end_date}
                    </p>
                  )}
                </div>

                {/* Registration Start */}
                <div>
                  <label htmlFor="registration_start" className="block text-sm font-semibold text-gray-700 mb-2">
                    Registration Start <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    id="registration_start"
                    selected={formData.registration_start ? new Date(formData.registration_start) : null}
                    onChange={(date) => {
                      if (date) {
                        setFormData({ ...formData, registration_start: formatDateAsLocalISO(date) });
                      } else {
                        setFormData({ ...formData, registration_start: '' });
                      }
                      if (validationErrors.registration_start) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.registration_start;
                          return newErrors;
                        });
                      }
                    }}
                    onBlur={() => handleBlur('registration_start')}
                    dateFormat="dd/MM/yyyy h:mm aa"
                    placeholderText="Select start date"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none ${
                      touched.registration_start && validationErrors.registration_start ? 'border-red-500' : 'border-gray-300'
                    }`}
                    showTimeSelect
                    timeFormat="h:mm aa"
                    timeIntervals={15}
                    timeCaption="Time"
                    showMonthDropdown
                    showYearDropdown
                    scrollableYearDropdown
                    yearDropdownItemNumber={15}
                  />
                  {touched.registration_start && validationErrors.registration_start && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.registration_start}
                    </p>
                  )}
                </div>

                {/* Registration End */}
                <div>
                  <label htmlFor="registration_end" className="block text-sm font-semibold text-gray-700 mb-2">
                    Registration End <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    id="registration_end"
                    selected={formData.registration_end ? new Date(formData.registration_end) : null}
                    onChange={(date) => {
                      if (date) {
                        setFormData({ ...formData, registration_end: formatDateAsLocalISO(date) });
                      } else {
                        setFormData({ ...formData, registration_end: '' });
                      }
                      if (validationErrors.registration_end) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.registration_end;
                          return newErrors;
                        });
                      }
                    }}
                    onBlur={() => handleBlur('registration_end')}
                    dateFormat="dd/MM/yyyy h:mm aa"
                    placeholderText="Select end date"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none ${
                      touched.registration_end && validationErrors.registration_end ? 'border-red-500' : 'border-gray-300'
                    }`}
                    minDate={formData.registration_start ? new Date(formData.registration_start) : null}
                    maxDate={formData.start_date ? new Date(formData.start_date) : null}
                    showTimeSelect
                    timeFormat="h:mm aa"
                    timeIntervals={15}
                    timeCaption="Time"
                    showMonthDropdown
                    showYearDropdown
                    scrollableYearDropdown
                    yearDropdownItemNumber={15}
                  />
                  {touched.registration_end && validationErrors.registration_end && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.registration_end}
                    </p>
                  )}
                </div>

                {/* Venue Selection */}
                <div className="md:col-span-2">
                  <label htmlFor="venue_id" className="block text-sm font-semibold text-gray-700 mb-2">
                    Venue <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    <select
                      id="venue_id"
                      name="venue_id"
                      value={showCustomVenue ? 'custom' : formData.venue_id}
                      onChange={handleChange}
                      onBlur={() => handleBlur('venue_id')}
                      disabled={loadingVenues}
                      className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        touched.venue_id && validationErrors.venue_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">{loadingVenues ? 'Loading venues...' : 'Select a venue'}</option>
                      {venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                          {venue.name} - {venue.city}, {venue.state}
                        </option>
                      ))}
                      <option value="custom">+ Add Custom Venue</option>
                    </select>
                    {/* FUTURE USE: Venue availability check button */}
                    {/* {formData.venue_id && formData.start_date && formData.end_date && (
                      <button
                        type="button"
                        onClick={handleCheckVenueAvailability}
                        disabled={checkingVenue}
                        className="px-4 py-3 border-2 border-primary-500 text-primary-500 font-semibold rounded-lg hover:bg-primary-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {checkingVenue ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Checking...
                          </>
                        ) : (
                          'Check Availability'
                        )}
                      </button>
                    )} */}
                  </div>
                  
                  {touched.venue_id && validationErrors.venue_id && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.venue_id}
                    </p>
                  )}
                  
                  {/* Custom Venue Input */}
                  {showCustomVenue && (
                    <div className="mt-3">
                      <input
                        id="custom_venue_name"
                        type="text"
                        name="custom_venue_name"
                        value={formData.custom_venue_name}
                        onChange={handleChange}
                        onBlur={() => handleBlur('custom_venue_name')}
                        placeholder="Enter custom venue name"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none ${
                          touched.custom_venue_name && validationErrors.custom_venue_name ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {touched.custom_venue_name && validationErrors.custom_venue_name ? (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {validationErrors.custom_venue_name}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">
                          Enter the name of your venue (e.g., "City Sports Complex, Mumbai")
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* FUTURE USE: Venue Availability Status Display */}
                  {/* {venueAvailability && (
                    <div className={`mt-3 p-3 rounded-lg border-l-4 ${
                      venueAvailability.is_available
                        ? 'bg-primary-50 border-primary-500 text-primary-600'
                        : 'bg-red-50 border-red-500 text-red-700'
                    }`}>
                      <div className="flex items-start gap-2">
                        {venueAvailability.is_available ? (
                          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{venueAvailability.message}</p>
                          {venueAvailability.conflicting_tournaments?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium mb-1">Conflicting Tournaments:</p>
                              <ul className="text-xs space-y-1">
                                {venueAvailability.conflicting_tournaments.map((t) => (
                                  <li key={t.id}>
                                    • {t.name} ({formatDate(t.start_date)} - {formatDate(t.end_date)})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {venueAvailability.weather_alerts?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium mb-1">Weather Alerts:</p>
                              <ul className="text-xs space-y-1">
                                {venueAvailability.weather_alerts.map((w) => (
                                  <li key={w.id}>
                                    • {w.type} ({w.severity}): {w.description}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )} */}
                </div>
              </div>
            </div>

            {/* Financial Details */}
            {/* <div className="pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Financial Details</h3>
                    <p className="text-xs text-gray-500">Optional - Entry fees and prizes</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-5 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-800 font-medium">Optional Fields</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Leave entry fee as 0 or empty for free tournaments. Prize money is optional.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="entry_fee" className="block text-sm font-semibold text-gray-700 mb-2">
                    Entry Fee (₹) <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                  </label>
                  <input
                    id="entry_fee"
                    name="entry_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.entry_fee}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    placeholder="0 (Free tournament)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Set to 0 for free tournaments</p>
                </div>

                
                <div>
                  <label htmlFor="prize_money" className="block text-sm font-semibold text-gray-700 mb-2">
                    Prize Money (₹) <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                  </label>
                  <input
                    id="prize_money"
                    name="prize_money"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.prize_money}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    placeholder="0 (No prize money)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty if no prize money</p>
                </div>
              </div>
            </div> */}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/tournaments')}
                className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-teal-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Create Tournament
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTournament;
