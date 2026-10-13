import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';
import api from '../config/api';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Trophy,
  Crown,
  UserCheck,
  Shield,
  Calendar,
  MapPin,
  Search,
  Filter,
  X,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

const MyTeamsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth);
  
  // Get URL parameters
  const viewParam = searchParams.get('view') || 'teams'; // teams or pairs
  const tabParam = searchParams.get('tab') || 'all'; // all, tournament, reusable, invitations
  
  // Top-level tab: 'teams' or 'pairs'
  const [mainTab, setMainTab] = useState(viewParam);
  
  // Sub-tabs for teams/pairs
  const [activeTab, setActiveTab] = useState(tabParam); // all, tournament, reusable, invitations
  
  // Teams state
  const [teams, setTeams] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [teamInvitations, setTeamInvitations] = useState([]);
  const [teamInvitationStats, setTeamInvitationStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0
  });
  
  // Pairs state
  const [pairs, setPairs] = useState([]);
  const [allPairs, setAllPairs] = useState([]);
  const [pairInvitations, setPairInvitations] = useState([]);
  const [pairInvitationStats, setPairInvitationStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0
  });
  
  // Common state
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [sports, setSports] = useState([]);
  const [processingInvitation, setProcessingInvitation] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Invitation modal state
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState(null);

  // Sync URL params with state when URL changes
  useEffect(() => {
    const view = searchParams.get('view') || 'teams';
    const tab = searchParams.get('tab') || 'all';
    
    setMainTab(view);
    setActiveTab(tab);
  }, [searchParams]);

  // Handle invitation modal opening after data is loaded
  useEffect(() => {
    const invitationId = searchParams.get('invitationId');
    
    // Only try to open modal if invitations are loaded and not currently loading
    if (invitationId && !loading) {
      openInvitationFromUrl(invitationId, mainTab);
    }
  }, [searchParams, loading, teamInvitations, pairInvitations]);

  // Update URL when tabs change
  const handleMainTabChange = (newTab) => {
    setMainTab(newTab);
    setSearchParams({ view: newTab, tab: 'all' });
  };

  const handleSubTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ view: mainTab, tab: newTab });
  };

  useEffect(() => {
    fetchSports();
    fetchTeams();
    fetchTeamInvitations(false);
    fetchPairs();
    fetchPairInvitations(false);
  }, []);

  useEffect(() => {
    if (mainTab === 'teams') {
      if (activeTab === 'invitations') {
        fetchTeamInvitations(true);
      } else {
        fetchTeams();
      }
    } else {
      if (activeTab === 'invitations') {
        fetchPairInvitations(true);
      } else {
        fetchPairs();
      }
    }
  }, [mainTab, activeTab]);

  const fetchSports = async () => {
    try {
      const response = await api.get('/sports');
      setSports(response.data.data || []);
    } catch (error) {
      console.error('Failed to load sports');
    }
  };

  const fetchTeams = async () => {
    setLoading(true);
    try {
      // Always fetch all teams (backend excludes temporary teams)
      const response = await api.get('/teams/my-teams');
      const allTeamsData = response.data.data || [];
      
      setAllTeams(allTeamsData); // Store all teams for counting
      
      // Filter teams based on active tab
      if (activeTab === 'tournament') {
        setTeams(allTeamsData.filter(t => t.team_type === 'tournament'));
      } else if (activeTab === 'reusable') {
        setTeams(allTeamsData.filter(t => t.team_type === 'reusable'));
      } else {
        setTeams(allTeamsData); // Show all teams (backend already excludes temporary)
      }
    } catch (error) {
      toast.error('Failed to load teams');
      setTeams([]);
      setAllTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPairs = async () => {
    setLoading(true);
    try {
      // Backend excludes temporary pairs
      const response = await api.get('/pairs/my-pairs');
      const allPairsData = response.data.data || [];
      
      setAllPairs(allPairsData); // Store all pairs for counting
      
      // Filter pairs based on active tab
      if (activeTab === 'tournament') {
        setPairs(allPairsData.filter(p => p.pair_type === 'tournament'));
      } else if (activeTab === 'reusable') {
        setPairs(allPairsData.filter(p => p.pair_type === 'reusable'));
      } else {
        setPairs(allPairsData); // Show all pairs (backend already excludes temporary)
      }
    } catch (error) {
      toast.error('Failed to load pairs');
      setPairs([]);
      setAllPairs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamInvitations = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/teams/invitations/my');
      const invitationsData = response.data.data || [];
      setTeamInvitations(invitationsData);
      
      const stats = {
        total: invitationsData.length,
        pending: invitationsData.filter(inv => inv.status === 'pending').length,
        accepted: invitationsData.filter(inv => inv.status === 'accepted').length,
        rejected: invitationsData.filter(inv => inv.status === 'rejected').length
      };
      setTeamInvitationStats(stats);
    } catch (error) {
      if (showLoading) toast.error('Failed to load team invitations');
      setTeamInvitations([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchPairInvitations = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/pairs/my-invitations');
      const invitationsData = response.data.data || [];
      setPairInvitations(invitationsData);
      
      const stats = {
        total: invitationsData.length,
        pending: invitationsData.filter(inv => inv.status === 'pending').length,
        accepted: invitationsData.filter(inv => inv.status === 'accepted').length,
        rejected: invitationsData.filter(inv => inv.status === 'rejected').length
      };
      setPairInvitationStats(stats);
    } catch (error) {
      if (showLoading) toast.error('Failed to load pair invitations');
      setPairInvitations([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleAcceptTeamInvitation = async (invitationId, teamId) => {
    setProcessingInvitation(invitationId);
    try {
      await api.post(`/teams/${teamId}/accept-invitation`);
      toast.success('Team invitation accepted!');
      fetchTeamInvitations();
      fetchTeams();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleRejectTeamInvitation = async (invitationId, teamId) => {
    setProcessingInvitation(invitationId);
    try {
      await api.post(`/teams/${teamId}/reject-invitation`);
      toast.success('Team invitation rejected');
      fetchTeamInvitations();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject invitation');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleAcceptPairInvitation = async (invitationId) => {
    setProcessingInvitation(invitationId);
    try {
      await api.post(`/pairs/invitations/${invitationId}/accept`);
      toast.success('Pair invitation accepted!');
      fetchPairInvitations();
      fetchPairs();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleRejectPairInvitation = async (invitationId) => {
    setProcessingInvitation(invitationId);
    try {
      await api.post(`/pairs/invitations/${invitationId}/reject`);
      toast.success('Pair invitation rejected');
      fetchPairInvitations();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject invitation');
    } finally {
      setProcessingInvitation(null);
    }
  };

  // Open invitation modal from URL parameter
  const openInvitationFromUrl = (invitationId, view) => {
    try {
      const invitations = view === 'teams' ? teamInvitations : pairInvitations;
      const invitation = invitations.find(inv => inv.id === parseInt(invitationId));
      
      if (invitation) {
        setSelectedInvitation(invitation);
        setShowInvitationModal(true);
      } else {
        // Only show error if data is actually loaded and invitation still not found
        // Don't show error during initial load or if invitations array is empty
        if (invitations.length > 0) {
          console.warn(`Invitation ${invitationId} not found in ${view} invitations`);
          toast.error('Invitation not found');
          // Remove invitationId from URL
          const params = new URLSearchParams(searchParams);
          params.delete('invitationId');
          setSearchParams(params);
        }
        // If invitations array is empty, just wait - data might still be loading
      }
    } catch (error) {
      console.error('Error loading invitation:', error);
      toast.error('Failed to load invitation');
    }
  };

  // Close invitation modal and remove invitationId from URL
  const closeInvitationModal = () => {
    setShowInvitationModal(false);
    setSelectedInvitation(null);
    
    // Remove invitationId from URL
    const params = new URLSearchParams(searchParams);
    params.delete('invitationId');
    setSearchParams(params);
  };

  // Handle accept from modal
  const handleAcceptFromModal = async () => {
    if (!selectedInvitation) return;
    
    if (mainTab === 'teams') {
      await handleAcceptTeamInvitation(selectedInvitation.id, selectedInvitation.team_id);
    } else {
      await handleAcceptPairInvitation(selectedInvitation.id);
    }
    
    closeInvitationModal();
  };

  // Handle reject from modal
  const handleRejectFromModal = async () => {
    if (!selectedInvitation) return;
    
    if (mainTab === 'teams') {
      await handleRejectTeamInvitation(selectedInvitation.id, selectedInvitation.team_id);
    } else {
      await handleRejectPairInvitation(selectedInvitation.id);
    }
    
    closeInvitationModal();
  };

  const getUserRole = (team) => {
    const roles = [];
    
    // Check if user is creator/owner
    if (team.creator_id === user?.id) {
      roles.push('owner');
    }
    
    // Check if user is captain
    if (team.captain_id === user?.id) {
      roles.push('captain');
    }
    
    // Check if user is participant (member but not owner/captain)
    if (team.is_member && !roles.includes('owner') && !roles.includes('captain')) {
      roles.push('participant');
    }
    
    return roles;
  };

  const getRoleBadge = (role) => {
    const badges = {
      owner: {
        icon: Crown,
        text: 'Owner',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      },
      captain: {
        icon: Shield,
        text: 'Captain',
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      },
      participant: {
        icon: UserCheck,
        text: 'Member',
        className: 'bg-green-100 text-green-800 border-green-200'
      }
    };
    
    const badge = badges[role];
    if (!badge) return null;
    
    const Icon = badge.icon;
    
    return (
      <span
        key={role}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${badge.className}`}
      >
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = !sportFilter || team.sport_id === parseInt(sportFilter);
    return matchesSearch && matchesSport;
  });

  const filteredPairs = pairs.filter(pair => {
    const matchesSearch = pair.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = !sportFilter || pair.sport_id === parseInt(sportFilter);
    return matchesSearch && matchesSport;
  });

  const teamTabs = [
    { id: 'all', label: 'All Teams', count: allTeams.length },
    { id: 'tournament', label: 'Tournament', count: allTeams.filter(t => t.team_type === 'tournament').length },
    { id: 'reusable', label: 'My Teams', count: allTeams.filter(t => t.team_type === 'reusable').length },
    { id: 'invitations', label: 'Invitations', count: teamInvitationStats.pending }
  ];

  const pairTabs = [
    { id: 'all', label: 'All Pairs', count: allPairs.length },
    { id: 'tournament', label: 'Tournament', count: allPairs.filter(p => p.pair_type === 'tournament').length },
    { id: 'reusable', label: 'My Pairs', count: allPairs.filter(p => p.pair_type === 'reusable').length },
    { id: 'invitations', label: 'Invitations', count: pairInvitationStats.pending }
  ];

  const currentTabs = mainTab === 'teams' ? teamTabs : pairTabs;
  const currentInvitations = mainTab === 'teams' ? teamInvitations : pairInvitations;
  const currentInvitationStats = mainTab === 'teams' ? teamInvitationStats : pairInvitationStats;
  const currentItems = mainTab === 'teams' ? filteredTeams : filteredPairs;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
      <Navbar />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-3 shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                  My Teams & Pairs
                </h1>
                <p className="text-sm text-gray-600 mt-1">Manage your teams, pairs and memberships</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              <span>Create</span>
            </button>
          </div>
        </div>
      </header>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">What would you like to create?</h2>
            <p className="text-gray-600 mb-6">Choose whether you want to create a team or a pair</p>
            
            <div className="space-y-3">
              {/* Create Team Button */}
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  navigate('/teams/create');
                }}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-200 rounded-xl transition-all group"
              >
                <div className="bg-blue-600 p-3 rounded-lg group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">Create Team</h3>
                  <p className="text-sm text-gray-600">Build a team with multiple players</p>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Create Pair Button */}
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  navigate('/pairs/create');
                }}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-200 rounded-xl transition-all group"
              >
                <div className="bg-purple-600 p-3 rounded-lg group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">Create Pair</h3>
                  <p className="text-sm text-gray-600">Form a doubles pair with a partner</p>
                </div>
                <ArrowRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full mt-4 px-4 py-2 text-gray-600 hover:text-gray-900 font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Tabs: Teams vs Pairs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6">
          <div className="border-b-2 border-gray-200">
            <nav className="flex">
              <button
                onClick={() => {
                  handleMainTabChange('teams');
                  setSearchTerm('');
                  setSportFilter('');
                }}
                className={`flex-1 py-5 px-6 text-center font-bold text-lg transition-all duration-200 border-b-4 ${
                  mainTab === 'teams'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-6 h-6" />
                  <span>Teams</span>
                  <span className={`ml-1 px-2.5 py-0.5 rounded-full text-sm font-bold ${
                    mainTab === 'teams'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {allTeams.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => {
                  handleMainTabChange('pairs');
                  setSearchTerm('');
                  setSportFilter('');
                }}
                className={`flex-1 py-5 px-6 text-center font-bold text-lg transition-all duration-200 border-b-4 ${
                  mainTab === 'pairs'
                    ? 'border-purple-600 text-purple-600 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-6 h-6" />
                  <span>Pairs</span>
                  <span className={`ml-1 px-2.5 py-0.5 rounded-full text-sm font-bold ${
                    mainTab === 'pairs'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {allPairs.length}
                  </span>
                </div>
              </button>
            </nav>
          </div>

          {/* Sub-tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {currentTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleSubTabChange(tab.id)}
                  className={`flex-1 py-4 px-6 text-center font-semibold transition-all duration-200 border-b-2 ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
              </div>

              {/* Sport Filter */}
              <div className="sm:w-64 relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all appearance-none bg-white"
                >
                  <option value="">All Sports</option>
                  {sports.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              {(searchTerm || sportFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSportFilter('');
                  }}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2 text-gray-600"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Invitations Tab Content */}
        {activeTab === 'invitations' ? (
          <div className="space-y-6">
            {/* Invitation Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <Mail className="w-8 h-8 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-500">TOTAL</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{currentInvitationStats.total}</p>
                <p className="text-sm text-gray-600 mt-1">All Invitations</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 text-yellow-600" />
                  <span className="text-sm font-semibold text-gray-500">PENDING</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{currentInvitationStats.pending}</p>
                <p className="text-sm text-gray-600 mt-1">Awaiting Response</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <span className="text-sm font-semibold text-gray-500">ACCEPTED</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{currentInvitationStats.accepted}</p>
                <p className="text-sm text-gray-600 mt-1">Joined {mainTab === 'teams' ? 'Teams' : 'Pairs'}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <span className="text-sm font-semibold text-gray-500">REJECTED</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{currentInvitationStats.rejected}</p>
                <p className="text-sm text-gray-600 mt-1">Declined</p>
              </div>
            </div>

            {/* Invitations List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading invitations...</p>
                </div>
              </div>
            ) : currentInvitations.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
                <Mail className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No invitations</h3>
                <p className="text-gray-600">You don't have any {mainTab} invitations yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200"
                  >
                    {/* Card Header with Gradient */}
                    <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2.5">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">{invitation.team_name || invitation.pair_name || 'Invitation'}</h3>
                            <div className="flex items-center gap-2">
                              <p className="text-primary-100 text-sm font-medium">{invitation.sport_name || 'Unknown Sport'}</p>
                              {invitation.invitation_type === 'pair' && (
                                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded">
                                  Pair Invitation
                                </span>
                              )}
                              {invitation.invitation_type === 'partnership' && (
                                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded">
                                  Partnership
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                          invitation.status === 'pending'
                            ? 'bg-yellow-400 text-yellow-900'
                            : invitation.status === 'accepted'
                            ? 'bg-green-400 text-green-900'
                            : 'bg-red-400 text-red-900'
                        }`}>
                          {invitation.status}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="px-6 py-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Invited By */}
                        <div className="flex items-start gap-3">
                          <div className="bg-primary-50 rounded-lg p-2 mt-0.5">
                            <UserCheck className="w-4 h-4 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Invited By</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {invitation.initiator_first_name || invitation.inviter_first_name} {invitation.initiator_last_name || invitation.inviter_last_name}
                            </p>
                          </div>
                        </div>

                        {/* Date */}
                        <div className="flex items-start gap-3">
                          <div className="bg-primary-50 rounded-lg p-2 mt-0.5">
                            <Calendar className="w-4 h-4 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Invitation Date</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {new Date(invitation.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Message */}
                      {invitation.message && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4 border-l-4 border-primary-500">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Message</p>
                          <p className="text-sm text-gray-700 italic">"{invitation.message}"</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {invitation.status === 'pending' && (
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => mainTab === 'teams' 
                              ? handleAcceptTeamInvitation(invitation.id, invitation.team_id)
                              : handleAcceptPairInvitation(invitation.id)
                            }
                            disabled={processingInvitation === invitation.id}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:shadow-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingInvitation === invitation.id ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-5 h-5" />
                                <span>Accept Invitation</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => mainTab === 'teams'
                              ? handleRejectTeamInvitation(invitation.id, invitation.team_id)
                              : handleRejectPairInvitation(invitation.id)
                            }
                            disabled={processingInvitation === invitation.id}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-red-600 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingInvitation === invitation.id ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-5 h-5" />
                                <span>Decline</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Responded Date for Accepted/Rejected */}
                      {invitation.status !== 'pending' && invitation.responded_at && (
                        <div className="flex items-center gap-2 pt-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>
                            {invitation.status === 'accepted' ? 'Accepted' : 'Declined'} on{' '}
                            {new Date(invitation.responded_at).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Teams/Pairs Grid */
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading {mainTab}...</p>
                </div>
              </div>
            ) : currentItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
            <Users className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No {mainTab} found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || sportFilter
                ? 'Try adjusting your filters'
                : `Create your first ${mainTab === 'teams' ? 'team' : 'pair'} to get started`}
            </p>
            {!searchTerm && !sportFilter && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                Create {mainTab === 'teams' ? 'Team' : 'Pair'}
              </button>
            )}
          </div>
        ) : mainTab === 'teams' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => {
              const roles = getUserRole(team);
              
              return (
                <div
                  key={team.id}
                  onClick={() => navigate(`/teams/${team.id}?view=${mainTab}&tab=${activeTab}`)}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 overflow-hidden group"
                >
                  {/* Team Header */}
                  <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-white">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1 line-clamp-1">{team.name}</h3>
                        <p className="text-primary-100 text-sm">{team.sport_name || 'Unknown Sport'}</p>
                      </div>
                      {team.logo ? (
                        <div className="bg-white rounded-lg p-1 w-12 h-12 overflow-hidden">
                          <img 
                            src={team.logo} 
                            alt={`${team.name} logo`}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<div class="bg-white/20 backdrop-blur-sm rounded-lg p-2 w-12 h-12 flex items-center justify-center"><svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg></div>';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                          <Users className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    
                    {/* Role Badges */}
                    <div className="flex flex-wrap gap-2">
                      {roles.map(role => getRoleBadge(role))}
                    </div>
                  </div>

                  {/* Team Info */}
                  <div className="p-6">
                    <div className="space-y-3">
                      {/* Members Count */}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">
                          {team.current_size || 0} / {team.max_players} members
                        </span>
                      </div>

                      {/* Captain */}
                      {team.captain_name && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Shield className="w-4 h-4" />
                          <span className="text-sm">Captain: {team.captain_name}</span>
                        </div>
                      )}

                      {/* Tournament */}
                      {team.tournament_name && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Trophy className="w-4 h-4" />
                          <span className="text-sm line-clamp-1">{team.tournament_name}</span>
                        </div>
                      )}

                      {/* Team Type Badge */}
                      <div className="pt-2 border-t border-gray-100">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          team.team_type === 'tournament'
                            ? 'bg-purple-100 text-purple-700'
                            : team.team_type === 'temporary'
                            ? 'bg-cyan-100 text-cyan-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {team.team_type === 'tournament' ? 'Tournament Team' : team.team_type === 'temporary' ? 'Temporary Team' : 'Reusable Team'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <div className="h-1 bg-gradient-to-r from-primary-600 to-primary-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Pairs Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPairs.map((pair) => {
              // Determine user's role in the pair
              const isCreator = pair.created_by === user?.id;
              const isPlayer1 = pair.player1_id === user?.id;
              const isPlayer2 = pair.player2_id === user?.id;
              
              return (
                <div
                  key={pair.id}
                  onClick={() => navigate(`/pairs/${pair.id}?view=${mainTab}&tab=${activeTab}`)}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 overflow-hidden group"
                >
                  {/* Pair Header */}
                  <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-6 text-white">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1 line-clamp-1">{pair.name}</h3>
                        <p className="text-purple-100 text-sm">{pair.sport_name || 'Unknown Sport'}</p>
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                        <Users className="w-6 h-6" />
                      </div>
                    </div>
                    
                    {/* Role Badge */}
                    <div className="flex flex-wrap gap-2">
                      {isCreator && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border bg-yellow-100 text-yellow-800 border-yellow-200">
                          <Crown className="w-3 h-3" />
                          Owner
                        </span>
                      )}
                      {(isPlayer1 || isPlayer2) && !isCreator && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border bg-green-100 text-green-800 border-green-200">
                          <UserCheck className="w-3 h-3" />
                          Member
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pair Info */}
                  <div className="p-6">
                    <div className="space-y-3">
                      {/* Players */}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">
                          {pair.player1_name ? (
                            <span>{pair.player1_name}</span>
                          ) : (
                            <span className="text-red-500 font-semibold">Not Set</span>
                          )}
                          {' & '}
                          {pair.player2_name ? (
                            <span>{pair.player2_name}</span>
                          ) : (
                            <span className="text-red-500 font-semibold">Not Set</span>
                          )}
                        </span>
                      </div>

                      {/* Tournament */}
                      {pair.tournament_name && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Trophy className="w-4 h-4" />
                          <span className="text-sm line-clamp-1">{pair.tournament_name}</span>
                        </div>
                      )}

                      {/* Pair Type & Status Badges */}
                      <div className="pt-2 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          pair.pair_type === 'tournament'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {pair.pair_type === 'tournament' ? 'Tournament Pair' : 'Reusable Pair'}
                        </span>
                        
                        {/* Status Badge */}
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          pair.status === 'locked'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {pair.status === 'locked' ? '🔒 Locked' : '📝 Draft'}
                        </span>
                      </div>

                      {/* View Details Button */}
                      <div className="pt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/pairs/${pair.id}?view=${mainTab}&tab=${activeTab}`);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg"
                        >
                          <ArrowRight className="w-4 h-4" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <div className="h-1 bg-gradient-to-r from-purple-600 to-purple-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>

      {/* Invitation Modal */}
      {showInvitationModal && selectedInvitation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className={`p-6 border-b border-gray-200 ${
              mainTab === 'teams' ? 'bg-gradient-to-r from-blue-50 to-blue-100' : 'bg-gradient-to-r from-purple-50 to-purple-100'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {mainTab === 'teams' ? 'Team' : 'Pair'} Invitation
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    You've been invited to join {mainTab === 'teams' ? 'a team' : 'a pair'}
                  </p>
                </div>
                <button
                  onClick={closeInvitationModal}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Team/Pair Info */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl ${
                    mainTab === 'teams' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-purple-500 to-purple-600'
                  }`}>
                    {selectedInvitation.team_name?.charAt(0) || selectedInvitation.pair_name?.charAt(0) || 'T'}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedInvitation.team_name || selectedInvitation.pair_name}
                    </h3>
                    {selectedInvitation.sport_name && (
                      <p className="text-sm text-gray-600 mt-1">
                        <Trophy className="w-4 h-4 inline mr-1" />
                        {selectedInvitation.sport_name}
                      </p>
                    )}
                    {selectedInvitation.tournament_name && (
                      <p className="text-sm text-gray-600 mt-1">
                        <Trophy className="w-4 h-4 inline mr-1" />
                        Tournament: {selectedInvitation.tournament_name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Invitation Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-700">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Invited By</p>
                    <p className="font-semibold">
                      {mainTab === 'pairs' 
                        ? `${selectedInvitation.inviter_first_name || ''} ${selectedInvitation.inviter_last_name || ''}`.trim() || 'Pair Owner'
                        : `${selectedInvitation.initiator_first_name || ''} ${selectedInvitation.initiator_last_name || ''}`.trim() || 'Team Owner'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Invitation Date</p>
                    <p className="font-semibold">
                      {new Date(selectedInvitation.invited_at || selectedInvitation.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Team-specific details */}
                {mainTab === 'teams' && (
                  <>
                    {selectedInvitation.member_count !== undefined && (
                      <div className="flex items-center gap-3 text-gray-700">
                        <Users className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Current Members</p>
                          <p className="font-semibold">
                            {selectedInvitation.member_count} / {selectedInvitation.max_players || 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedInvitation.captain_name && (
                      <div className="flex items-center gap-3 text-gray-700">
                        <Crown className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Team Captain</p>
                          <p className="font-semibold">{selectedInvitation.captain_name}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Pair-specific details */}
                {mainTab === 'pairs' && selectedInvitation.metadata && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <UserCheck className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Position</p>
                      <p className="font-semibold capitalize">
                        {selectedInvitation.metadata.position?.replace('_', ' ') || 'Player'}
                      </p>
                    </div>
                  </div>
                )}

                {selectedInvitation.message && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-900 mb-1">Message:</p>
                    <p className="text-blue-800">{selectedInvitation.message}</p>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              {selectedInvitation.status !== 'pending' && (
                <div className={`p-4 rounded-lg border-2 ${
                  selectedInvitation.status === 'accepted'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {selectedInvitation.status === 'accepted' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <p className={`font-semibold ${
                      selectedInvitation.status === 'accepted' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {selectedInvitation.status === 'accepted' ? 'Already Accepted' : 'Already Declined'}
                    </p>
                  </div>
                  {selectedInvitation.responded_at && (
                    <p className="text-sm text-gray-600 mt-1">
                      on {new Date(selectedInvitation.responded_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {selectedInvitation.status === 'pending' && (
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
                <button
                  onClick={handleRejectFromModal}
                  disabled={processingInvitation === selectedInvitation.id}
                  className="flex-1 px-6 py-3 bg-white border-2 border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingInvitation === selectedInvitation.id ? (
                    <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      <span>Decline</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleAcceptFromModal}
                  disabled={processingInvitation === selectedInvitation.id}
                  className={`flex-1 px-6 py-3 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    mainTab === 'teams'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                      : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                  }`}
                >
                  {processingInvitation === selectedInvitation.id ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Accept Invitation</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTeamsPage;
