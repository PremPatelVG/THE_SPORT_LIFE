import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../config/api';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import PlayerProfileModal from '../components/PlayerProfileModal';
import { getImageUrl, getUserInitials } from '../utils/imageUtils';
import { 
  Check, 
  Users, 
  UserPlus, 
  Calendar, 
  Clock, 
  MapPin, 
  Trophy, 
  Search,
  ChevronDown,
  Eye,
  Settings,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

// Avatar Component with Profile Picture Support
const Avatar = ({ option }) => {
  const [imageError, setImageError] = useState(false);
  const profilePicUrl = option.profile_image ? getImageUrl(option.profile_image) : null;
  
  
  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };
  
  if (profilePicUrl && !imageError) {
    return (
      <img 
        src={profilePicUrl} 
        alt={`${option.first_name} ${option.last_name}`}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        onError={() => setImageError(true)}
      />
    );
  }
  
  return (
    <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-semibold flex-shrink-0">
      {getInitials(option.first_name, option.last_name)}
    </div>
  );
};

// Searchable Dropdown Component
const SearchableDropdown = ({ options, value, onChange, placeholder, renderOption, searchKeys, onViewProfile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option => {
    const searchLower = searchTerm.toLowerCase();
    return searchKeys.some(key => {
      const value = option[key];
      return value && value.toString().toLowerCase().includes(searchLower);
    });
  });

  const selectedOption = options.find(opt => opt.id === value || opt.id === parseInt(value));

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-left flex items-center justify-between bg-white"
      >
        {selectedOption ? (
          <div className="flex items-center gap-3">
            <Avatar option={selectedOption} />
            <span className="font-medium">
              {selectedOption.first_name} {selectedOption.last_name}
            </span>
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-64">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No results found</div>
            ) : (
              filteredOptions.map(option => (
                <div
                  key={option.id}
                  className="w-full p-3 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
                >
                  <Avatar option={option} />
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="font-medium text-gray-900">
                      {option.first_name} {option.last_name}
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    {onViewProfile && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setIsOpen(false);
                          setSearchTerm('');
                          onViewProfile(option.id);
                        }}
                        className="p-1.5 rounded-full hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                    {(value === option.id || parseInt(value) === option.id) && (
                      <Check className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Team Members Preview Component
const TeamMembersPreview = ({ teamId }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!teamId) return;
      setLoading(true);
      try {
        const response = await api.get(`/teams/${teamId}/members`);
        setMembers(response.data.data || []);
      } catch (error) {
        console.error('Error fetching team members:', error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [teamId]);

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          <div className="flex-1 h-4 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center text-gray-500 text-sm">
        No members found
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-primary-50 to-cyan-50 rounded-lg border border-primary-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Team Members ({members.length})
      </h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {members.map((member) => (
          <div key={member.user_id} className="flex items-center gap-3 p-2 bg-white rounded-lg">
            {member.profile_image ? (
              <img 
                src={getImageUrl(member.profile_image)} 
                alt={`${member.first_name} ${member.last_name}`}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {member.first_name} {member.last_name}
              </p>
              {member.sports_info && (
                <p className="text-xs text-gray-600 truncate">
                  {member.sports_info.split('|').map(s => s.split(':')[0]).join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Pair Members Preview Component
const PairMembersPreview = ({ pairId, availablePairs }) => {
  const pair = availablePairs.find(p => p.id === parseInt(pairId));

  if (!pair) return null;

  return (
    <div className="p-4 bg-gradient-to-br from-primary-50 to-cyan-50 rounded-lg border border-primary-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Pair Members
      </h4>
      <div className="space-y-2">
        {/* Player 1 */}
        <div className="flex items-center gap-3 p-2 bg-white rounded-lg">
          {pair.player1_profile_image ? (
            <img 
              src={getImageUrl(pair.player1_profile_image)} 
              alt={`${pair.player1_first_name} ${pair.player1_last_name}`}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {pair.player1_first_name?.charAt(0)}{pair.player1_last_name?.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {pair.player1_first_name} {pair.player1_last_name}
            </p>
            {pair.player1_sports && (
              <p className="text-xs text-gray-600 truncate">
                {pair.player1_sports}
              </p>
            )}
          </div>
        </div>

        {/* Player 2 */}
        <div className="flex items-center gap-3 p-2 bg-white rounded-lg">
          {pair.player2_profile_image ? (
            <img 
              src={getImageUrl(pair.player2_profile_image)} 
              alt={`${pair.player2_first_name} ${pair.player2_last_name}`}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {pair.player2_first_name?.charAt(0)}{pair.player2_last_name?.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {pair.player2_first_name} {pair.player2_last_name}
            </p>
            {pair.player2_sports && (
              <p className="text-xs text-gray-600 truncate">
                {pair.player2_sports}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Single Player Preview Component
const PlayerPreview = ({ playerId, availablePlayers }) => {
  const player = availablePlayers.find(p => p.id === parseInt(playerId));

  if (!player) return null;

  return (
    <div className="p-4 bg-gradient-to-br from-primary-50 to-cyan-50 rounded-lg border border-primary-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Player Info
      </h4>
      <div className="flex items-center gap-3 p-2 bg-white rounded-lg">
        {player.profile_image ? (
          <img 
            src={getImageUrl(player.profile_image)} 
            alt={`${player.first_name} ${player.last_name}`}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-full flex items-center justify-center text-white font-bold">
            {player.first_name?.charAt(0)}{player.last_name?.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {player.first_name} {player.last_name}
          </p>
          {player.sports_info && (
            <p className="text-sm text-gray-600 truncate">
              {player.sports_info.split('|').map(s => s.split(':')[0]).join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const CreateStandaloneMatch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  
  // Check if we should skip Step 1 (coming from rematch)
  const navigationState = location.state || {};
  const skipStep1 = navigationState.skipStep1 || false;
  const preSelectedSportId = navigationState.preSelectedSport;
  const preSelectedSportName = navigationState.sportName;
  const preSelectedCategory = navigationState.matchCategory;
  
  const [step, setStep] = useState(skipStep1 ? 2 : 1);
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(preSelectedSportId || null);
  const [sportConfig, setSportConfig] = useState(null);
  const [category, setCategory] = useState(preSelectedCategory || null);
  
  const [participant1Type, setParticipant1Type] = useState('existing');
  const [participant1Id, setParticipant1Id] = useState('');
  const [participant1Data, setParticipant1Data] = useState({});
  
  const [participant2Type, setParticipant2Type] = useState('existing');
  const [participant2Id, setParticipant2Id] = useState('');
  const [participant2Data, setParticipant2Data] = useState({});
  
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [availablePairs, setAvailablePairs] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [availableReferees, setAvailableReferees] = useState([]);
  
  const [matchConfig, setMatchConfig] = useState({});
  const [numberOfMatches, setNumberOfMatches] = useState(1);
  const [refereeId, setRefereeId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [startImmediately, setStartImmediately] = useState(false);
  const [showRefereeWarning, setShowRefereeWarning] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [duplicatePlayersError, setDuplicatePlayersError] = useState(null);
  
  // Team Creation Modal States
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamModalFor, setTeamModalFor] = useState(null); // 'participant1' or 'participant2'
  const [newTeamData, setNewTeamData] = useState({
    name: '',
    player_ids: [],
    captain_id: '',
    is_reusable: true
  });
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamPlayerSearch, setTeamPlayerSearch] = useState('');
  
  // Player Profile Modal States
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  // Pair Creation Modal States
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairModalFor, setPairModalFor] = useState(null); // 'participant1' or 'participant2'
  const [newPairData, setNewPairData] = useState({
    name: '',
    player1_id: '',
    player2_id: '',
    is_reusable: true
  });
  const [creatingPair, setCreatingPair] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      await fetchSports();
      fetchPlayers();
      
      // Set current date and time as default
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5);
      setMatchDate(dateStr);
      setMatchTime(timeStr);
    };
    
    initializeData();
  }, []);
  
  // When sports are loaded and we have a pre-selected sport, set it up
  useEffect(() => {
    if (skipStep1 && preSelectedSportId && sports.length > 0) {
      const sport = sports.find(s => s.id === preSelectedSportId);
      if (sport) {
        setSelectedSport(sport);
        // Fetch sport config using the same endpoint as normal flow
        fetchSportConfigForRematch(sport.id);
      }
    }
  }, [sports, skipStep1, preSelectedSportId]);
  
  // Fetch sport config for rematch flow (same as normal flow)
  const fetchSportConfigForRematch = async (sportId) => {
    try {
      const response = await api.get(`/sport-configs/${sportId}`);
      const config = response.data.data;
      setSportConfig(config);
      setMatchConfig(config?.default_config || {});
    } catch (error) {
      console.error('Error fetching sport config:', error);
      toast.error('Failed to load sport configuration');
    }
  };


  

  // Fetch referees and set default referee after component mounts
  useEffect(() => {
    const loadRefereesAndSetDefault = async () => {
      await fetchReferees();
      // Set current user as default referee after referees are loaded
      if (user?.id) {
        setRefereeId(user.id.toString());
      }
    };
    loadRefereesAndSetDefault();
  }, [user]);

  // Refetch teams/pairs/players when sport changes or when entering Step 2
  useEffect(() => {
    if (step === 2 && selectedSport && category) {
      // Refetch data based on category to ensure fresh data for the selected sport
      if (category === 'singles') {
        fetchPlayers();
      } else if (category === 'doubles') {
        fetchPairs();
      } else if (category === 'teams') {
        fetchTeams();
      }
    }
  }, [step, selectedSport?.id, category]);

  const fetchSports = async () => {
    try {
      const response = await api.get('/sports');
      setSports(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load sports');
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await api.get('/users?role=player');
      setAvailablePlayers(response.data.data || []);
    } catch (error) {
      console.error('Failed to load players');
    }
  };

  const fetchReferees = async () => {
    try {
      // Fetch all users (not just referees) for referee assignment
      const response = await api.get('/users');
      setAvailableReferees(response.data.data || []);
    } catch (error) {
      console.error('Failed to load users for referee assignment');
    }
  };

  const handleSportSelect = async (sport) => {
    setSelectedSport(sport);
    // Don't auto-set category - let user choose
    
    try {
      const response = await api.get(`/sport-configs/${sport.id}`);
      const config = response.data.data;
      setSportConfig(config);
      setMatchConfig(config?.default_config || {});
    } catch (error) {
      toast.error('Failed to load sport configuration');
      setSportConfig(null);
      setMatchConfig({});
    }
    
    setStep(2);
  };

  const handleBackToStep1 = () => {
    // Clear category and participant data when going back
    setCategory(null);
    setParticipant1Id('');
    setParticipant2Id('');
    setParticipant1Type('existing');
    setParticipant2Type('existing');
    setParticipant1Data({});
    setParticipant2Data({});
    setAvailableTeams([]);
    setAvailablePairs([]);
    setStep(1);
  };

  const handleCategorySelect = async (selectedCategory) => {
    setCategory(selectedCategory);
    
    // Reset participant selections
    setParticipant1Id('');
    setParticipant2Id('');
    setParticipant1Type('existing');
    setParticipant2Type('existing');
    setParticipant1Data({});
    setParticipant2Data({});
    
    // Load appropriate data based on category
    if (selectedCategory === 'doubles') {
      await fetchPairs();
    } else if (selectedCategory === 'teams') {
      await fetchTeams();
    }
  };

  const fetchTeams = async () => {
    try {
      const teamsResponse = await api.get(`/standalone-matches/available-teams/${selectedSport.id}`);
      setAvailableTeams(teamsResponse.data.data || []);
    } catch (error) {
      setAvailableTeams([]);
    }
  };

  // Check for duplicate players in both teams
  const checkDuplicatePlayers = async () => {
    if (category !== 'teams' || !participant1Id || !participant2Id) {
      setDuplicatePlayersError(null);
      return;
    }

    try {
      // Fetch members for both teams
      const [team1Response, team2Response] = await Promise.all([
        api.get(`/teams/${participant1Id}/members`),
        api.get(`/teams/${participant2Id}/members`)
      ]);

      const team1Members = team1Response.data.data || [];
      const team2Members = team2Response.data.data || [];

      // Find duplicate players
      const team1PlayerIds = team1Members.map(m => m.user_id);
      const team2PlayerIds = team2Members.map(m => m.user_id);
      
      const duplicates = team1Members.filter(m => team2PlayerIds.includes(m.user_id));

      if (duplicates.length > 0) {
        const playerNames = duplicates.map(p => `${p.first_name} ${p.last_name}`).join(', ');
        setDuplicatePlayersError(`Same player(s) found in both teams: ${playerNames}. A player cannot be in both teams.`);
      } else {
        setDuplicatePlayersError(null);
      }
    } catch (error) {
      console.error('Error checking duplicate players:', error);
      setDuplicatePlayersError(null);
    }
  };

  // Check for duplicates when teams are selected
  useEffect(() => {
    if (category === 'teams' && participant1Id && participant2Id) {
      checkDuplicatePlayers();
    } else {
      setDuplicatePlayersError(null);
    }
  }, [participant1Id, participant2Id, category]);

  const openTeamModal = (forParticipant) => {
    setTeamModalFor(forParticipant);
    setNewTeamData({
      name: '',
      player_ids: [],
      captain_id: '',
      is_reusable: true
    });
    setShowTeamModal(true);
  };

  const closeTeamModal = () => {
    setShowTeamModal(false);
    setTeamModalFor(null);
    setNewTeamData({
      name: '',
      player_ids: [],
      captain_id: '',
      is_reusable: true
    });
  };

  const handleCreateTeam = async () => {
    // Validation
    if (!newTeamData.name || newTeamData.name.trim().length < 3) {
      toast.error('Team name must be at least 3 characters');
      return;
    }
    
    if (!newTeamData.player_ids || newTeamData.player_ids.length < 2) {
      toast.error('Please select at least 2 players');
      return;
    }
    
    if (!newTeamData.captain_id) {
      toast.error('Please select a team captain');
      return;
    }

    setCreatingTeam(true);

    try {
      const payload = {
        sport_id: selectedSport.id,
        name: newTeamData.name.trim(),
        player_ids: newTeamData.player_ids,
        captain_id: newTeamData.captain_id,
        is_reusable: newTeamData.is_reusable
      };

      const response = await api.post('/standalone-matches/quick-team', payload);
      const createdTeam = response.data.data;

      toast.success(`Team "${createdTeam.name}" created successfully!`);

      // Add the newly created team to availableTeams list
      const newTeam = {
        id: createdTeam.id,
        name: createdTeam.name || newTeamData.name,
        current_size: newTeamData.player_ids.length,
        max_players: newTeamData.player_ids.length,
        team_type: newTeamData.is_reusable ? 'reusable' : 'temporary',
        status: 'locked'
      };
      setAvailableTeams(prev => [newTeam, ...prev]);

      // Auto-select the newly created team
      if (teamModalFor === 'participant1') {
        setParticipant1Id(createdTeam.id);
        setParticipant1Type('existing');
      } else if (teamModalFor === 'participant2') {
        setParticipant2Id(createdTeam.id);
        setParticipant2Type('existing');
      }

      closeTeamModal();
    } catch (error) {
      console.error('Failed to create team:', error);
      toast.error(error.response?.data?.error || 'Failed to create team');
    } finally {
      setCreatingTeam(false);
    }
  };

  const fetchPairs = async () => {
    try {
      const pairsResponse = await api.get(`/standalone-matches/available-pairs/${selectedSport.id}`);
      setAvailablePairs(pairsResponse.data.data || []);
    } catch (error) {
      setAvailablePairs([]);
    }
  };

  const openPairModal = (forParticipant) => {
    setPairModalFor(forParticipant);
    setNewPairData({
      name: '',
      player1_id: '',
      player2_id: '',
      is_reusable: true
    });
    setShowPairModal(true);
  };

  const closePairModal = () => {
    setShowPairModal(false);
    setPairModalFor(null);
    setNewPairData({
      name: '',
      player1_id: '',
      player2_id: '',
      is_reusable: true
    });
  };

  const handleCreatePair = async () => {
    // Validation
    if (!newPairData.player1_id) {
      toast.error('Please select Player 1');
      return;
    }
    
    if (!newPairData.player2_id) {
      toast.error('Please select Player 2');
      return;
    }

    if (newPairData.player1_id === newPairData.player2_id) {
      toast.error('Cannot pair a player with themselves');
      return;
    }

    setCreatingPair(true);

    try {
      const payload = {
        sport_id: selectedSport.id,
        name: newPairData.name.trim() || undefined, // Auto-generate if empty
        player1_id: newPairData.player1_id,
        player2_id: newPairData.player2_id,
        is_reusable: newPairData.is_reusable
      };

      const response = await api.post('/standalone-matches/quick-pair', payload);
      const createdPair = response.data.data;

      toast.success(`Pair "${createdPair.name}" created successfully!`);

      // Get player details for the newly created pair
      const player1 = availablePlayers.find(p => p.id === newPairData.player1_id);
      const player2 = availablePlayers.find(p => p.id === newPairData.player2_id);

      // Add the newly created pair to availablePairs list
      const newPair = {
        id: createdPair.id,
        name: createdPair.name,
        player1_id: newPairData.player1_id,
        player2_id: newPairData.player2_id,
        player1_first_name: player1?.first_name,
        player1_last_name: player1?.last_name,
        player1_profile_image: player1?.profile_image,
        player2_first_name: player2?.first_name,
        player2_last_name: player2?.last_name,
        player2_profile_image: player2?.profile_image,
        pair_type: newPairData.is_reusable ? 'reusable' : 'temporary',
        status: 'locked'
      };
      setAvailablePairs(prev => [newPair, ...prev]);

      // Auto-select the newly created pair
      if (pairModalFor === 'participant1') {
        setParticipant1Id(createdPair.id);
        setParticipant1Type('existing');
      } else if (pairModalFor === 'participant2') {
        setParticipant2Id(createdPair.id);
        setParticipant2Type('existing');
      }

      closePairModal();
    } catch (error) {
      console.error('Failed to create pair:', error);
      toast.error(error.response?.data?.error || 'Failed to create pair');
    } finally {
      setCreatingPair(false);
    }
  };

  const handleMatchConfigChange = (field, value) => {
    setMatchConfig(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate sets_to_win or games_to_win
      if (field === 'total_sets') {
        updated.sets_to_win = Math.ceil(value / 2);
      } else if (field === 'total_games') {
        updated.games_to_win = Math.ceil(value / 2);
      }
      
      return updated;
    });
  };

  // Validation: Win by Margin should be valid
  const getWinByMarginError = () => {
    const winByMargin = matchConfig.win_by_margin;
    
    // Must be a positive number
    if (winByMargin !== undefined && winByMargin !== null && winByMargin < 0) {
      return 'Win by Margin cannot be negative';
    }
    
    // For set-based sports: win_by_margin should not exceed points_per_set
    if (sportConfig?.match_structure === 'set_based') {
      const pointsPerSet = matchConfig.points_per_set;
      if (winByMargin && pointsPerSet && winByMargin >= pointsPerSet) {
        return `Win by Margin (${winByMargin}) cannot be greater than or equal to Points per Set (${pointsPerSet})`;
      }
    } 
    // For game-based sports: win_by_margin should not exceed points_per_game
    else if (sportConfig?.match_structure === 'game_based') {
      const pointsPerGame = matchConfig.points_per_game;
      if (winByMargin && pointsPerGame && winByMargin >= pointsPerGame) {
        return `Win by Margin (${winByMargin}) cannot be greater than or equal to Points per Game (${pointsPerGame})`;
      }
    }
    
    return null;
  };

  const handleScheduleMatch = async () => {
    setLoading(true);

    try {
      const payload = {
        sport_id: selectedSport.id,
        category,
        match_config: matchConfig,
        
        participant1_type: participant1Type,
        participant1_id: participant1Type === 'existing' ? parseInt(participant1Id) : null,
        participant1_data: participant1Type === 'new' ? participant1Data : null,
        
        participant2_type: participant2Type,
        participant2_id: participant2Type === 'existing' ? parseInt(participant2Id) : null,
        participant2_data: participant2Type === 'new' ? participant2Data : null,
        
        referee_id: refereeId ? parseInt(refereeId) : null,
        match_date: matchDate || null,
        match_time: matchTime || null,
        start_immediately: false
      };

      const response = await api.post('/standalone-matches', payload);
      
      toast.success('Match scheduled successfully!');
      setLoading(false);
      navigate('/matches');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to schedule match');
      setLoading(false);
    }
  };

  const handleStartMatch = async () => {
    // Check if current user is the referee
    if (user?.id && refereeId && parseInt(refereeId) !== user.id) {
      setShowRefereeWarning(true);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        sport_id: selectedSport.id,
        category,
        match_config: matchConfig,
        
        participant1_type: participant1Type,
        participant1_id: participant1Type === 'existing' ? parseInt(participant1Id) : null,
        participant1_data: participant1Type === 'new' ? participant1Data : null,
        
        participant2_type: participant2Type,
        participant2_id: participant2Type === 'existing' ? parseInt(participant2Id) : null,
        participant2_data: participant2Type === 'new' ? participant2Data : null,
        
        referee_id: refereeId ? parseInt(refereeId) : null,
        match_date: matchDate || null,
        match_time: matchTime || null,
        start_immediately: true
      };

      const response = await api.post('/standalone-matches', payload);
      
      const matchId = response.data.data?.matchId || response.data.data?.id;
      
      if (!matchId) {
        throw new Error('Match created but ID not returned');
      }
      
      toast.success('Match created! Opening scoring page...');
      setTimeout(() => {
        navigate(`/matches/${matchId}/referee-scoring`);
        setLoading(false);
      }, 500);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start match');
      setLoading(false);
    }
  };

  const isStep2Valid = () => {
    if (category === 'singles') {
      const bothSelected = participant1Id && participant2Id;
      const notSame = participant1Id !== participant2Id;
      return bothSelected && notSame;
    } else if (category === 'doubles') {
      const p1Valid = participant1Id;
      const p2Valid = participant2Id;
      const notSame = participant1Id !== participant2Id;
      return p1Valid && p2Valid && notSame;
    } else if (category === 'teams') {
      const p1Valid = participant1Id;
      const p2Valid = participant2Id;
      const notSame = participant1Id !== participant2Id;
      const noDuplicates = !duplicatePlayersError;
      return p1Valid && p2Valid && notSame && noDuplicates;
    }
    return false;
  };

  const getParticipantError = () => {
    if (!category) return null;
    
    if (category === 'singles') {
      if (participant1Id && participant2Id && participant1Id === participant2Id) {
        return 'Both participants cannot be the same player';
      }
    } else if (category === 'doubles') {
      if (participant1Id && participant2Id && participant1Id === participant2Id) {
        return 'Both participants cannot be the same pair';
      }
    } else if (category === 'teams') {
      if (participant1Id && participant2Id && participant1Id === participant2Id) {
        return 'Both participants cannot be the same team';
      }
    }
    return null;
  };

  const steps = [
    { number: 1, title: 'Select Sport', icon: Trophy },
    { number: 2, title: 'Select Participants', icon: Users },
    { number: 3, title: 'Configure Match', icon: Settings },
    { number: 4, title: 'Schedule & Start', icon: Calendar }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Match</h1>
          <p className="text-gray-600">Create a quick match without a tournament</p>
        </div>

        {/* Progress Steps Bar */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => {
              const Icon = s.icon;
              const isActive = step === s.number;
              const isCompleted = step > s.number;
              
              return (
                <React.Fragment key={s.number}>
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isActive 
                        ? 'bg-primary-500 text-white ring-4 ring-primary-100' 
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                    </div>
                    <div className={`text-sm font-medium text-center ${
                      isActive ? 'text-primary-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {s.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded transition-all ${
                      step > s.number ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-md p-8">
          {/* Step 1: Select Sport */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Sport</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {sports.map(sport => (
                  <button
                    key={sport.id}
                    onClick={() => handleSportSelect(sport)}
                    className="group p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex flex-col items-center text-center">
                      <Trophy className="w-10 h-10 text-gray-400 group-hover:text-primary-500 mb-3 transition-colors" />
                      <div className="font-bold text-gray-900 mb-1">{sport.name}</div>
                      <div className="text-sm text-gray-500 capitalize px-3 py-1 bg-gray-100 rounded-full">
                        {sport.category}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Participants */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Participants</h2>
              <p className="text-gray-600 mb-6">Choose the match category and participants</p>
              
              {/* Category Selector */}
              <div className="mb-8">
                <label className="block font-bold text-gray-900 mb-3">Match Category</label>
                <div className={`grid gap-4 ${selectedSport?.category === 'team' ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-3'}`}>
                  {/* Singles - Only show for racquet sports */}
                  {selectedSport?.category === 'racquet' && (
                    <button
                      onClick={() => handleCategorySelect('singles')}
                      className={`p-4 border-2 rounded-xl font-medium transition-all ${
                        category === 'singles'
                          ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-md'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Users className="w-6 h-6 mx-auto mb-2" />
                      Singles
                    </button>
                  )}
                  
                  {/* Doubles - Only show for racquet sports */}
                  {selectedSport?.category === 'racquet' && (
                    <button
                      onClick={() => handleCategorySelect('doubles')}
                      className={`p-4 border-2 rounded-xl font-medium transition-all ${
                        category === 'doubles'
                          ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-md'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Users className="w-6 h-6 mx-auto mb-2" />
                      Doubles
                    </button>
                  )}
                  
                  {/* Teams - Show for all sports */}
                  <button
                    onClick={() => handleCategorySelect('teams')}
                    className={`p-4 border-2 rounded-xl font-medium transition-all ${
                      category === 'teams'
                        ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-md'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Users className="w-6 h-6 mx-auto mb-2" />
                    Teams
                  </button>
                </div>
              </div>

              {/* Show participants only after category is selected */}
              {!category && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>Please select a match category above to continue</p>
                </div>
              )}
              
              {/* Participants Section */}
              {category && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 mb-6">
                  {/* Participant 1 */}
                  <div className="p-6 border-2 border-gray-200 rounded-xl">
                    <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary-500" />
                      {category === 'singles' ? 'Player 1' : category === 'doubles' ? 'Pair 1' : 'Team 1'}
                    </h3>
                  
                  {category === 'singles' && (
                    <div className="space-y-4">
                      <SearchableDropdown
                        options={availablePlayers}
                        value={participant1Id}
                        onChange={(id) => setParticipant1Id(id)}
                        placeholder="Select Player"
                        searchKeys={['first_name', 'last_name', 'phone', 'email']}
                        onViewProfile={(playerId) => {
                          setSelectedPlayerId(playerId);
                          setShowPlayerProfile(true);
                        }}
                      />
                      
                      {/* Player Preview */}
                      {participant1Id && (
                        <PlayerPreview playerId={participant1Id} availablePlayers={availablePlayers} />
                      )}
                    </div>
                  )}
                
                {category === 'doubles' && (
                  <div className="space-y-4">
                    <SearchableDropdown
                      options={availablePairs.map(pair => ({
                        ...pair,
                        first_name: pair.name,
                        last_name: ''
                      }))}
                      value={participant1Id}
                      onChange={(id) => setParticipant1Id(id)}
                      placeholder="Select Pair"
                      searchKeys={['name']}
                    />
                    
                    {/* Pair Members Preview */}
                    {participant1Id && (
                      <PairMembersPreview pairId={participant1Id} availablePairs={availablePairs} />
                    )}
                    
                    <button
                      type="button"
                      onClick={() => openPairModal('participant1')}
                      className="w-full p-3 border-2 border-dashed border-primary-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 text-primary-600 font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-5 h-5" />
                      Create New Pair
                    </button>
                  </div>
                )}
                
                {category === 'teams' && (
                  <div className="space-y-4">
                    <SearchableDropdown
                      options={availableTeams.map(team => ({
                        ...team,
                        first_name: team.name,
                        last_name: `(${team.current_size} players)`
                      }))}
                      value={participant1Id}
                      onChange={(id) => setParticipant1Id(id)}
                      placeholder="Select Team"
                      searchKeys={['name']}
                    />
                    
                    {/* Team Members Preview */}
                    {participant1Id && (
                      <TeamMembersPreview teamId={participant1Id} />
                    )}
                    
                    <button
                      type="button"
                      onClick={() => openTeamModal('participant1')}
                      className="w-full p-3 border-2 border-dashed border-primary-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 text-primary-600 font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-5 h-5" />
                      Create New Team
                    </button>
                  </div>
                )}
                  </div>

                  {/* VS Divider */}
                  <div className="hidden lg:flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-xl">VS</span>
                      </div>
                      <div className="h-full w-0.5 bg-gray-200"></div>
                    </div>
                  </div>

                  {/* Participant 2 */}
                  <div className="p-6 border-2 border-gray-200 rounded-xl">
                    <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary-500" />
                      {category === 'singles' ? 'Player 2' : category === 'doubles' ? 'Pair 2' : 'Team 2'}
                    </h3>
                
                {category === 'singles' && (
                  <div className="space-y-4">
                    <SearchableDropdown
                      options={availablePlayers}
                      value={participant2Id}
                      onChange={(id) => setParticipant2Id(id)}
                      placeholder="Select Player"
                      searchKeys={['first_name', 'last_name', 'phone', 'email']}
                      onViewProfile={(playerId) => {
                        setSelectedPlayerId(playerId);
                        setShowPlayerProfile(true);
                      }}
                    />
                    
                    {/* Player Preview */}
                    {participant2Id && (
                      <PlayerPreview playerId={participant2Id} availablePlayers={availablePlayers} />
                    )}
                  </div>
                )}
                
                {category === 'doubles' && (
                  <div className="space-y-4">
                    <SearchableDropdown
                      options={availablePairs.map(pair => ({
                        ...pair,
                        first_name: pair.name,
                        last_name: ''
                      }))}
                      value={participant2Id}
                      onChange={(id) => setParticipant2Id(id)}
                      placeholder="Select Pair"
                      searchKeys={['name']}
                    />
                    
                    {/* Pair Members Preview */}
                    {participant2Id && (
                      <PairMembersPreview pairId={participant2Id} availablePairs={availablePairs} />
                    )}
                    
                    <button
                      type="button"
                      onClick={() => openPairModal('participant2')}
                      className="w-full p-3 border-2 border-dashed border-primary-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 text-primary-600 font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-5 h-5" />
                      Create New Pair
                    </button>
                  </div>
                )}
                
                {category === 'teams' && (
                  <div className="space-y-4">
                    <SearchableDropdown
                      options={availableTeams.map(team => ({
                        ...team,
                        first_name: team.name,
                        last_name: `(${team.current_size} players)`
                      }))}
                      value={participant2Id}
                      onChange={(id) => setParticipant2Id(id)}
                      placeholder="Select Team"
                      searchKeys={['name']}
                    />
                    
                    {/* Team Members Preview */}
                    {participant2Id && (
                      <TeamMembersPreview teamId={participant2Id} />
                    )}
                    
                    <button
                      type="button"
                      onClick={() => openTeamModal('participant2')}
                      className="w-full p-3 border-2 border-dashed border-primary-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 text-primary-600 font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-5 h-5" />
                      Create New Team
                    </button>
                  </div>
                )}
                  </div>
                </div>
              )}

              {category && (
              <>
                {/* Validation Error Message */}
                {getParticipantError() && (
                  <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start gap-3">
                    <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-red-900">Invalid Selection</p>
                      <p className="text-red-700 text-sm">{getParticipantError()}</p>
                    </div>
                  </div>
                )}

                {/* Duplicate Players Error Message */}
                {duplicatePlayersError && (
                  <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start gap-3">
                    <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-red-900">Duplicate Players Found</p>
                      <p className="text-red-700 text-sm">{duplicatePlayersError}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={handleBackToStep1}
                    className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                    disabled={!isStep2Valid()}
                  >
                    Next: Configure Match
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
              )}
            </div>
          )}

          {/* Step 3: Configure Match */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Match Configuration</h2>
              <p className="text-gray-600 mb-6">Configure match settings for {selectedSport?.name}</p>
              
              {/* Set-Based Configuration (Badminton, Tennis, Volleyball) */}
              {sportConfig?.match_structure === 'set_based' && (
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Total Sets per Match <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="9"
                        value={matchConfig.total_sets || 3}
                        onChange={(e) => handleMatchConfigChange('total_sets', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">Best of {matchConfig.total_sets || 3}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Sets to Win <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={matchConfig.total_sets || 9}
                        value={matchConfig.sets_to_win || Math.ceil((matchConfig.total_sets || 3) / 2)}
                        onChange={(e) => handleMatchConfigChange('sets_to_win', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        First to win this many sets
                      </p>
                    </div>

                    {/* Hide Points per Set for Tennis/Padel (they use 0-15-30-40-Game scoring) */}
                    {selectedSport?.name !== 'Tennis' && selectedSport?.name !== 'Padel' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Points per Set <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={matchConfig.points_per_set || 21}
                          onChange={(e) => handleMatchConfigChange('points_per_set', parseInt(e.target.value))}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">Points needed to win a set</p>
                      </div>
                    )}

                    {/* Win by Margin - Always show but disabled for Tennis/Padel */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Win by Margin
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={matchConfig.win_by_margin || 2}
                        onChange={(e) => handleMatchConfigChange('win_by_margin', parseInt(e.target.value))}
                        disabled
                        className="w-full px-4 py-3 border-2 rounded-lg outline-none bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200"
                      />
                      <p className="text-xs text-gray-500 mt-1">Must win by this many points</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Game-Based Configuration (Table Tennis, Squash, Pickleball) */}
              {sportConfig?.match_structure === 'game_based' && (
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Total Games per Match <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="9"
                        value={matchConfig.total_games || 3}
                        onChange={(e) => handleMatchConfigChange('total_games', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">Best of {matchConfig.total_games || 3}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Games to Win <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={matchConfig.total_games || 9}
                        value={matchConfig.games_to_win || Math.ceil((matchConfig.total_games || 3) / 2)}
                        onChange={(e) => handleMatchConfigChange('games_to_win', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        First to win this many games
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Points per Game <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={matchConfig.points_per_game || 11}
                        onChange={(e) => handleMatchConfigChange('points_per_game', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">Points needed to win a game</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Win by Margin
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={matchConfig.win_by_margin || 2}
                        onChange={(e) => handleMatchConfigChange('win_by_margin', parseInt(e.target.value))}
                        disabled
                        className="w-full px-4 py-3 border-2 rounded-lg outline-none bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200"
                      />
                      <p className="text-xs text-gray-500 mt-1">Must win by this many points</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Time-Based Configuration (Football, Basketball) */}
              {sportConfig?.match_structure === 'time_based' && (
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Number of Periods <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={matchConfig.periods || 2}
                        onChange={(e) => handleMatchConfigChange('periods', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">Halves or quarters</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Period Duration (minutes) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={matchConfig.period_duration || 45}
                        onChange={(e) => handleMatchConfigChange('period_duration', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">Duration of each period</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Number of Matches/Series Field */}
              {/* <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Trophy className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Match Series</h3>
                </div>
                <div className="max-w-md">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Number of Matches/Series <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={numberOfMatches}
                    onChange={(e) => setNumberOfMatches(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-lg font-semibold"
                    placeholder="1"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    {numberOfMatches === 1 
                      ? 'Single match' 
                      : `Best of ${numberOfMatches} series - First to win ${Math.ceil(numberOfMatches / 2)} matches`
                    }
                  </p>
                </div>
              </div> */}

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!!getWinByMarginError()}
                  className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  Next: Schedule
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Schedule & Start */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule & Start Match</h2>
              <p className="text-gray-600 mb-6">Set match schedule and match official</p>
              
              <div className="space-y-6 mb-6">
                {/* Referee Selection */}
                <div>
                  <label className="block font-medium text-gray-900 mb-2">Assign match official (Required)</label>
                  <SearchableDropdown
                    options={availableReferees}
                    value={refereeId}
                    onChange={setRefereeId}
                    placeholder="Select a match official"
                    searchKeys={['first_name', 'last_name', 'email']}
                    renderOption={(referee) => (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                          {referee.first_name?.charAt(0)}{referee.last_name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {referee.first_name} {referee.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{referee.email}</div>
                        </div>
                      </div>
                    )}
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-gray-900 mb-2">Match Date</label>
                    <input
                      type="date"
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-900 mb-2">Match Time</label>
                    <input
                      type="time"
                      value={matchTime}
                      onChange={(e) => setMatchTime(e.target.value)}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl mb-6">
                <h3 className="font-bold text-gray-900 mb-3">Match Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sport:</span>
                    <span className="font-medium text-gray-900">{selectedSport?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium text-gray-900 capitalize">{category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Match official:</span>
                    <span className="font-medium text-gray-900">
                      {refereeId 
                        ? `${availableReferees.find(r => r.id === parseInt(refereeId))?.first_name || ''} ${availableReferees.find(r => r.id === parseInt(refereeId))?.last_name || ''}`
                        : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Schedule:</span>
                    <span className="font-medium text-gray-900">
                      {matchDate && matchTime ? `${matchDate} ${matchTime}` : 'Not Set'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleScheduleMatch}
                  disabled={loading || !refereeId}
                  className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-5 h-5" />
                      Schedule Match
                    </>
                  )}
                </button>
                <button
                  onClick={handleStartMatch}
                  disabled={loading || !refereeId}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Start Match
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team Creation Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Create New Team</h2>
              <button
                onClick={closeTeamModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Team Name */}
              <div>
                <label className="block font-medium text-gray-900 mb-2">Team Name *</label>
                <input
                  type="text"
                  placeholder="Enter team name (min 3 characters)"
                  value={newTeamData.name}
                  onChange={(e) => setNewTeamData({ ...newTeamData, name: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                />
              </div>

              {/* Player Selection */}
              <div>
                <label className="block font-medium text-gray-900 mb-2">
                  Select Players * (minimum 2)
                </label>
                
                {/* Search Input */}
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={teamPlayerSearch}
                      onChange={(e) => setTeamPlayerSearch(e.target.value)}
                      placeholder="Search by name, phone, or email..."
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                </div>

                <div className="border-2 border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                  {availablePlayers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No players available</p>
                  ) : (
                    availablePlayers
                      .filter(player => {
                        const searchLower = teamPlayerSearch.toLowerCase();
                        return (
                          player.first_name?.toLowerCase().includes(searchLower) ||
                          player.last_name?.toLowerCase().includes(searchLower) ||
                          player.phone?.toLowerCase().includes(searchLower) ||
                          player.email?.toLowerCase().includes(searchLower)
                        );
                      })
                      .map(player => (
                        <div 
                          key={player.id} 
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                        >
                          <input
                            type="checkbox"
                            checked={newTeamData.player_ids.includes(player.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTeamData({ 
                                  ...newTeamData, 
                                  player_ids: [...newTeamData.player_ids, player.id] 
                                });
                              } else {
                                setNewTeamData({ 
                                  ...newTeamData, 
                                  player_ids: newTeamData.player_ids.filter(id => id !== player.id),
                                  captain_id: newTeamData.captain_id === player.id ? '' : newTeamData.captain_id
                                });
                              }
                            }}
                            className="w-5 h-5 text-primary-500 rounded cursor-pointer"
                          />
                          <Avatar option={player} />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {player.first_name} {player.last_name}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlayerId(player.id);
                              setShowPlayerProfile(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      ))
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Selected: {newTeamData.player_ids.length} player(s)
                </p>
              </div>

              {/* Captain Selection */}
              <div>
                <label className="block font-medium text-gray-900 mb-2">Select Team Captain *</label>
                <select
                  value={newTeamData.captain_id}
                  onChange={(e) => setNewTeamData({ ...newTeamData, captain_id: parseInt(e.target.value) })}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                  disabled={newTeamData.player_ids.length === 0}
                >
                  <option value="">Select Captain</option>
                  {newTeamData.player_ids.map(playerId => {
                    const player = availablePlayers.find(p => p.id === playerId);
                    return player ? (
                      <option key={player.id} value={player.id}>
                        {player.first_name} {player.last_name}
                      </option>
                    ) : null;
                  })}
                </select>
              </div>

              {/* Reusable Team Checkbox */}
              {/* <label className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTeamData.is_reusable}
                  onChange={(e) => setNewTeamData({ ...newTeamData, is_reusable: e.target.checked })}
                  className="w-5 h-5 text-primary-500 rounded"
                />
                <div>
                  <div className="font-medium text-gray-900">Save as reusable team</div>
                  <div className="text-sm text-gray-600">This team can be used in future matches</div>
                </div>
              </label> */}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-4">
              <button
                onClick={closeTeamModal}
                disabled={creatingTeam}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={creatingTeam || !newTeamData.name || newTeamData.player_ids.length < 2 || !newTeamData.captain_id}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {creatingTeam ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Create Team
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pair Creation Modal */}
      {showPairModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Create New Pair</h2>
              <button
                onClick={closePairModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Pair Name */}
              <div>
                <label className="block font-medium text-gray-900 mb-2">Pair Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty for auto-generated name"
                  value={newPairData.name}
                  onChange={(e) => setNewPairData({ ...newPairData, name: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                />
                <p className="text-sm text-gray-500 mt-1">
                  If left empty, name will be auto-generated (e.g., "John & Jane")
                </p>
              </div>

              {/* Player 1 Selection */}
              <div>
                <label className="block font-medium text-gray-900 mb-2">Player 1 *</label>
                <SearchableDropdown
                  options={availablePlayers}
                  value={newPairData.player1_id}
                  onChange={(value) => setNewPairData({ ...newPairData, player1_id: value })}
                  placeholder="Select Player 1"
                  searchKeys={['first_name', 'last_name', 'phone', 'email']}
                  onViewProfile={(playerId) => {
                    setSelectedPlayerId(playerId);
                    setShowPlayerProfile(true);
                  }}
                />
              </div>

              {/* Player 2 Selection */}
              <div>
                <label className="block font-medium text-gray-900 mb-2">Player 2 *</label>
                <SearchableDropdown
                  options={availablePlayers.filter(player => player.id !== newPairData.player1_id)}
                  value={newPairData.player2_id}
                  onChange={(value) => setNewPairData({ ...newPairData, player2_id: value })}
                  placeholder="Select Player 2"
                  searchKeys={['first_name', 'last_name', 'phone', 'email']}
                  onViewProfile={(playerId) => {
                    setSelectedPlayerId(playerId);
                    setShowPlayerProfile(true);
                  }}
                />
              </div>

              {/* Reusable Pair Checkbox */}
              {/* <label className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPairData.is_reusable}
                  onChange={(e) => setNewPairData({ ...newPairData, is_reusable: e.target.checked })}
                  className="w-5 h-5 text-primary-500 rounded"
                />
                <div>
                  <div className="font-medium text-gray-900">Save as reusable pair</div>
                  <div className="text-sm text-gray-600">This pair can be used in future matches</div>
                </div>
              </label> */}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-4">
              <button
                onClick={closePairModal}
                disabled={creatingPair}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePair}
                disabled={creatingPair || !newPairData.player1_id || !newPairData.player2_id}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {creatingPair ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Create Pair
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Referee Warning Modal */}
      {showRefereeWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Cannot Start Match
              </h3>
              <p className="text-gray-600 text-center mb-6">
                You are not the assigned match official for this match. Only the match official can start the match. You can schedule the match instead.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRefereeWarning(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowRefereeWarning(false);
                    handleScheduleMatch();
                  }}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
                >
                  Schedule Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Profile Modal */}
      {showPlayerProfile && selectedPlayerId && (
        <PlayerProfileModal
          userId={selectedPlayerId}
          onClose={() => {
            setShowPlayerProfile(false);
            setSelectedPlayerId(null);
          }}
        />
      )}
    </div>
  );
};

export default CreateStandaloneMatch;
