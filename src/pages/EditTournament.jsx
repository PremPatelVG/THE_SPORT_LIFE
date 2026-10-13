import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Navbar from '../components/Navbar';
import { fetchTournament, clearError, clearSuccess } from '../store/slices/tournamentSlice';
import { updateTournament } from '../services/tournamentService';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Trophy,
  Info,
  Save,
  Loader,
  Image as ImageIcon,
  Settings
} from 'lucide-react';
import { getSportConfig } from '../services/sportConfigService';

const EditTournament = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentTournament: tournament, loading: tournamentLoading } = useSelector((state) => state.tournament);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: ''
  });

  const [updating, setUpdating] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [sportConfig, setSportConfig] = useState(null);
  const [matchConfigForm, setMatchConfigForm] = useState({});
  const [loadingConfig, setLoadingConfig] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchTournament(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (tournament) {
      setFormData({
        name: tournament.name || '',
        description: tournament.description || '',
        logo_url: tournament.logo_url || ''
      });
      
      if (tournament.logo_url) {
        setLogoPreview(tournament.logo_url);
      }

      // Load sport configuration and existing match config
      if (tournament.sport_id) {
        loadSportConfiguration(tournament.sport_id, tournament.match_config);
      }
    }
  }, [tournament]);

  const loadSportConfiguration = async (sportId, existingConfig) => {
    setLoadingConfig(true);
    try {
      const configRes = await getSportConfig(sportId);
      setSportConfig(configRes.data);
      
      // Parse existing match config if it's a string
      let parsedConfig = existingConfig;
      if (typeof existingConfig === 'string') {
        try {
          parsedConfig = JSON.parse(existingConfig);
        } catch (e) {
          console.error('Failed to parse match config:', e);
          parsedConfig = configRes.data.default_config;
        }
      }
      
      // Use existing config or default
      setMatchConfigForm(parsedConfig || configRes.data.default_config || {});
    } catch (error) {
      console.error('Failed to load sport configuration:', error);
    } finally {
      setLoadingConfig(false);
    }
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
      const isTennisOrPadel = sportConfig?.sport_name === 'Tennis' || sportConfig?.sport_name === 'Padel';
      
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
      if (isEmpty(matchConfigForm.periods) && isEmpty(matchConfigForm.number_of_periods)) {
        errors.push('Number of Periods is required');
      } else {
        const periodsValue = matchConfigForm.periods || matchConfigForm.number_of_periods;
        if (periodsValue < 1 || periodsValue > 6) {
          errors.push('Number of Periods must be between 1 and 6');
        }
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
      toast.error('Please fix the following errors:\n' + errors.join('\n'));
      return false;
    }
    
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Tournament name is required');
      return;
    }

    // Validate match configuration
    if (!validateMatchConfig()) {
      return;
    }

    try {
      setUpdating(true);
      
      // Only send fields that have changed
      const updateData = {};
      
      // Check basic fields
      if (formData.name !== tournament.name) {
        updateData.name = formData.name;
      }
      if (formData.description !== tournament.description) {
        updateData.description = formData.description;
      }
      if (formData.logo_url !== tournament.logo_url) {
        updateData.logo_url = formData.logo_url;
      }
      
      // Always include match_config if it exists (JSON comparison is complex)
      if (matchConfigForm && Object.keys(matchConfigForm).length > 0) {
        updateData.match_config = matchConfigForm;
      }
      
      // If no changes, show message and return
      if (Object.keys(updateData).length === 0) {
        toast.info('No changes to save');
        return;
      }
      
      await updateTournament(id, updateData);
      toast.success('Tournament updated successfully!');
      navigate(`/tournaments/${id}`);
    } catch (error) {
      console.error('Failed to update tournament:', error);
      toast.error(error.response?.data?.error || 'Failed to update tournament');
    } finally {
      setUpdating(false);
    }
  };

  if (tournamentLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading tournament...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tournament Not Found</h2>
            <button
              onClick={() => navigate('/tournaments')}
              className="text-primary-500 hover:text-primary-600 font-semibold"
            >
              Back to Tournaments
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/tournaments/${id}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Tournament
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                Edit Tournament
              </h1>
              <p className="text-gray-600">Update tournament details</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <Info className="w-6 h-6 text-primary-500" />
              <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
            </div>

            <div className="space-y-6">
              {/* Tournament Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                  placeholder="Enter tournament name"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none resize-none"
                  placeholder="Enter tournament description"
                />
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Logo URL
                </label>
                <div className="flex gap-3">
                  <input
                    type="url"
                    name="logo_url"
                    value={formData.logo_url}
                    onChange={handleChange}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    placeholder="https://example.com/logo.png"
                  />
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-12 h-12 rounded-lg object-cover border-2 border-primary-200"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>


          {/* Match Configuration Section */}
          {sportConfig && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-purple-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Match Configuration</h2>
                  <p className="text-sm text-gray-500">
                    {sportConfig.sport_name} - {sportConfig.match_structure?.replace('_', ' ')} format
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
                        <p className="text-xs text-blue-700">
                          Configure how matches will be played. Changes will apply to future matches only.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SET-BASED (Tennis, Badminton, Volleyball) */}
                  {sportConfig.match_structure === 'set_based' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Total Sets *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={matchConfigForm.total_sets ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (/^[0-9]$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 9)) {
                              handleMatchConfigChange('total_sets', val === '' ? '' : parseInt(val));
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                          placeholder="3"
                        />
                        <p className="text-xs text-gray-500 mt-1">Best of {matchConfigForm.total_sets || 3}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Sets to Win *
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
                      {sportConfig?.sport_name !== 'Tennis' && sportConfig?.sport_name !== 'Padel' && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Points per Set *
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={matchConfigForm.points_per_set ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || (/^[0-9]{1,3}$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 100)) {
                                handleMatchConfigChange('points_per_set', val === '' ? '' : parseInt(val));
                              }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                            placeholder="21"
                          />
                        </div>
                      )}

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

                  {/* GAME-BASED (Table Tennis, Squash) */}
                  {sportConfig.match_structure === 'game_based' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Total Games *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={matchConfigForm.total_games ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (/^[0-9]$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 9)) {
                              handleMatchConfigChange('total_games', val === '' ? '' : parseInt(val));
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                          placeholder="3"
                        />
                        <p className="text-xs text-gray-500 mt-1">Best of {matchConfigForm.total_games || 3}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Games to Win *
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

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Points per Game *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={matchConfigForm.points_per_game ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (/^[0-9]{1,3}$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 100)) {
                              handleMatchConfigChange('points_per_game', val === '' ? '' : parseInt(val));
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                          placeholder="11"
                        />
                      </div>

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

                  {/* TIME-BASED (Football) */}
                  {sportConfig.match_structure === 'time_based' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Players Per Side *
                        </label>
                        <select
                          value={matchConfigForm.players_per_side || 11}
                          onChange={(e) => handleMatchConfigChange('players_per_side', parseInt(e.target.value))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                        >
                          <option value={5}>5-a-side</option>
                          <option value={7}>7-a-side</option>
                          <option value={11}>11-a-side</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Number of Periods *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={matchConfigForm.number_of_periods ?? matchConfigForm.periods ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (/^[0-9]$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 6)) {
                              handleMatchConfigChange('number_of_periods', val === '' ? '' : parseInt(val));
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                          placeholder="2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Period Duration (minutes) *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={matchConfigForm.period_duration ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (/^[0-9]{1,3}$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 120)) {
                              handleMatchConfigChange('period_duration', val === '' ? '' : parseInt(val));
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                          placeholder="45"
                        />
                      </div>

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
                            if (val === '' || (/^[0-9]{1,2}$/.test(val) && parseInt(val) >= 0 && parseInt(val) <= 60)) {
                              handleMatchConfigChange('break_duration', val === '' ? '' : parseInt(val));
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                          placeholder="15"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(`/tournaments/${id}`)}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTournament;
