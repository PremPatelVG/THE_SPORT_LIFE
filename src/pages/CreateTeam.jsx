import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { createTeam, clearError, clearSuccess } from '../store/slices/teamSlice';
import { fetchTournaments } from '../store/slices/tournamentSlice';
import { getSports } from '../services/sportService';
import api from '../config/api';
import Navbar from '../components/Navbar';
import {
  ArrowLeft,
  Users,
  Trophy,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Loader,
  Info,
  Upload,
  X
} from 'lucide-react';

const CreateTeam = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { loading, error, success } = useSelector((state) => state.team);
  const { tournaments, loading: tournamentsLoading } = useSelector((state) => state.tournament);
  const { user } = useSelector((state) => state.auth);

  const tournamentIdFromUrl = searchParams.get('tournament_id');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    max_players: 11,
    logo: '',
    is_tournament_specific: false, // Always reusable
    sport_id: '',
    is_public: false
  });

  const [errors, setErrors] = useState({});
  const [sports, setSports] = useState([]);
  const [loadingSports, setLoadingSports] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    // Fetch sports list
    const fetchSports = async () => {
      setLoadingSports(true);
      try {
        const response = await getSports();
        setSports(response.data || []);
      } catch (error) {
        console.error('Error fetching sports:', error);
        toast.error('Failed to load sports');
      } finally {
        setLoadingSports(false);
      }
    };
    fetchSports();
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      setTimeout(() => {
        navigate('/my-teams');
      }, 2000);
    }
  }, [success, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearSuccess());
    };
  }, [dispatch]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Team name must be at least 3 characters';
    }

    if (!formData.sport_id) {
      newErrors.sport_id = 'Please select a sport';
    }

    if (formData.max_players < 2) {
      newErrors.max_players = 'Team must have at least 2 players';
    } else if (formData.max_players > 50) {
      newErrors.max_players = 'Maximum 50 players allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData({ ...formData, [name]: newValue });
    // Clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPG, PNG, GIF, WEBP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingLogo(true);

    try {
      // Create FormData
      const formDataUpload = new FormData();
      formDataUpload.append('logo', file);

      // Upload to backend
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/upload/logo`, {
        method: 'POST',
        body: formDataUpload,
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
      
      // console.log('Uploaded logo URL:', fullLogoUrl);
      
      setFormData(prev => ({
        ...prev,
        logo: fullLogoUrl
      }));
      
      // Set preview
      setLogoPreview(URL.createObjectURL(file));
      
      toast.success('Logo uploaded successfully!');
      
    } catch (error) {
      console.error('Logo upload failed:', error);
      toast.error('Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFormData({ ...formData, logo: '' });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    // Create reusable team with current user as captain
    const teamData = {
      name: formData.name,
      max_players: parseInt(formData.max_players),
      captain_id: user.id,
      is_tournament_specific: false, // Always reusable
      sport_id: parseInt(formData.sport_id),
      is_public: formData.is_public
    };

    // Only add optional fields if they have values
    if (formData.description?.trim()) {
      teamData.description = formData.description;
    }
    if (formData.logo?.trim()) {
      teamData.logo = formData.logo;
    }

    const result = await dispatch(createTeam(teamData));
    
    if (createTeam.fulfilled.match(result)) {
      toast.success('Team created successfully!');
    } else if (createTeam.rejected.match(result)) {
      const errorMessage = result.payload || result.error?.message || 'Failed to create team';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
      {/* Navbar */}
      <Navbar />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/my-teams')}
              className="p-2 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-105 group"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                Create Team
              </h1>
              <p className="text-sm text-gray-600">Build your team for tournament competition</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {success && (
          <div className="bg-primary-50 border-l-4 border-primary-500 text-primary-600 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">{success}</p>
              <p className="text-sm">Redirecting to your teams...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="space-y-6">
            {/* Team Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Team Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter team name"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Team Type Info */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-primary-900 mb-1">Team Type</h3>
                  <p className="text-xs text-primary-700">
                    Choose whether this team is for a specific tournament or can be reused across multiple tournaments.
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-white rounded-lg border border-primary-200">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-600" />
                  <div>
                    <p className="text-sm font-semibold text-primary-900">Reusable Team</p>
                    <p className="text-xs text-primary-700">Use in multiple tournaments</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sport Selection */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sport <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Trophy className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    name="sport_id"
                    value={formData.sport_id}
                    onChange={handleChange}
                    disabled={loadingSports}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none appearance-none bg-white ${
                      errors.sport_id ? 'border-red-500' : 'border-gray-300'
                    } ${loadingSports ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="">
                      {loadingSports ? 'Loading sports...' : 'Select a sport'}
                    </option>
                    {sports.filter(sport => sport.category === 'team').map((sport) => (
                      <option key={sport.id} value={sport.id}>
                        {sport.name}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.sport_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.sport_id}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Select the sport type for this reusable team</p>
            </div>

            {/* Team Visibility */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_public"
                    checked={formData.is_public}
                    onChange={handleChange}
                    className="mt-1 w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Make team public</span>
                    <p className="text-xs text-gray-600 mt-1">
                      Public teams are visible to all users and can be joined by anyone. Private teams are only visible to invited members.
                    </p>
                  </div>
                </label>
            </div>

            {/* Max Players */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Maximum Players
              </label>
              <input
                type="number"
                name="max_players"
                value={formData.max_players}
                onChange={handleChange}
                min="2"
                max="50"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none ${
                  errors.max_players ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.max_players && (
                <p className="mt-1 text-sm text-red-600">{errors.max_players}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Maximum number of players allowed in the team (2-50)
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
                placeholder="Tell others about your team..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional description about your team's goals, playstyle, etc.
              </p>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Team Logo (Optional)
              </label>
              
              {/* Logo Preview */}
              {(logoPreview || formData.logo) && (
                <div className="mb-3 relative inline-block">
                  <img
                    src={logoPreview || formData.logo}
                    alt="Logo preview"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* File Input */}
              <div className="space-y-3">
                <label className="block">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors cursor-pointer">
                    {uploadingLogo ? (
                      <>
                        <Loader className="w-5 h-5 text-gray-400 animate-spin" />
                        <span className="text-sm text-gray-600">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Choose file to upload
                        </span>
                      </>
                    )}
                  </div>
                </label>

                {/* OR Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">OR</span>
                  </div>
                </div>

                {/* URL Input */}
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="url"
                    name="logo"
                    value={formData.logo}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Upload an image file or provide a URL. Max size: 5MB. Formats: JPG, PNG, GIF, WEBP
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Team Creation Notes:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>You will be set as the team captain</li>
                    <li>You can invite other players after creating the team</li>
                    <li>Team members can be managed from the team detail page</li>
                    <li>Only the creator can delete the team</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <button
              type="button"
              onClick={() => navigate('/teams')}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  Create Team
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeam;
