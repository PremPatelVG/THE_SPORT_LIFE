import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CustomGroupsManager from '../components/CustomGroupsManager';
import {
  ArrowLeft,
  Loader,
  Trophy,
  Play,
  Check,
  Calendar,
  MapPin,
  User,
  Users,
  Clock,
  AlertCircle
} from 'lucide-react';
import api from '../config/api';

const MatchScheduling = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1); // 1: Seeds, 2: Preview, 3: Schedule, 4: Confirm
  const [seeds, setSeeds] = useState([]);
  const [savingSeeds, setSavingSeeds] = useState(false);
  const [generatingBrackets, setGeneratingBrackets] = useState(false);
  const [bracketPreview, setBracketPreview] = useState(null);
  const [editingBracket, setEditingBracket] = useState(false);
  
  // Custom Groups state (always true for groups_knockout)
  const [useCustomGroups, setUseCustomGroups] = useState(true);
  const [customGroups, setCustomGroups] = useState([]);
  const [customGroupsValidation, setCustomGroupsValidation] = useState(null);
  const [customGroupsForPreview, setCustomGroupsForPreview] = useState([]);
  
  // Scheduling state
  const [scheduleConfig, setScheduleConfig] = useState({
    startDate: '',
    endDate: '',
    matchesPerDay: 4,
    matchDuration: 60, // minutes
    breakBetweenMatches: 15, // minutes
    startTime: '09:00',
    endTime: '18:00',
    groupSize: 4 // For groups_knockout format
  });

  // Calculate optimal schedule based on total matches
  const calculateOptimalSchedule = () => {
    // For knockout tournaments, total matches = participants - 1
    // bracketPreview only shows first round, so we need to calculate all rounds
    let totalMatches = 0;
    
    if (tournament?.format_type === 'knockout' && participants.length > 0) {
      // Knockout: Total matches = number of participants - 1
      totalMatches = participants.length - 1;
    } else if (bracketPreview?.length) {
      // Fallback to bracket preview length for other formats
      totalMatches = bracketPreview.length;
    }
    
    // Validate required values
    if (!totalMatches || !scheduleConfig.startDate) return null;
    
    // Ensure matchesPerDay is a valid number
    const matchesPerDay = parseInt(scheduleConfig.matchesPerDay);
    if (!matchesPerDay || matchesPerDay < 1 || isNaN(matchesPerDay)) return null;

    // If matches per day exceeds total matches, adjust it
    const actualMatchesPerDay = Math.min(matchesPerDay, totalMatches);
    
    // Calculate minimum days needed
    const daysNeeded = Math.ceil(totalMatches / actualMatchesPerDay);
    
    // Calculate end date
    const startDate = new Date(scheduleConfig.startDate);
    if (isNaN(startDate.getTime())) return null; // Invalid date check
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + daysNeeded - 1);
    
    return {
      totalMatches,
      actualMatchesPerDay,
      daysNeeded,
      calculatedEndDate: endDate.toISOString().split('T')[0],
      matchesScheduled: actualMatchesPerDay * daysNeeded
    };
  };

  const optimalSchedule = calculateOptimalSchedule();

  useEffect(() => {
    if (tournamentId) {
      fetchData();
    }
  }, [tournamentId]);

  // Set match duration from tournament config when tournament is loaded
  useEffect(() => {
    if (tournament?.match_config?.estimated_duration) {
      setScheduleConfig(prev => ({
        ...prev,
        matchDuration: tournament.match_config.estimated_duration
      }));
    }
  }, [tournament]);

  // Check for custom groups when tournament is loaded
  useEffect(() => {
    if (tournamentId && tournament?.format_type === 'groups_knockout') {
      checkCustomGroups();
    }
  }, [tournamentId, tournament]);

  const checkCustomGroups = async () => {
    try {
      const response = await api.get(`/tournaments/${tournamentId}/custom-groups`);
      const groups = response.data.data || [];
      
      if (groups.length > 0) {
        setCustomGroups(groups);
        setCustomGroupsForPreview(groups); // For preview display
        setUseCustomGroups(true);
        
        // Fetch validation
        const validationResponse = await api.get(`/tournaments/${tournamentId}/custom-groups/validate`);
        setCustomGroupsValidation(validationResponse.data.data);
      } else {
        setUseCustomGroups(false);
        setCustomGroups([]);
        setCustomGroupsForPreview([]);
        setCustomGroupsValidation(null);
      }
    } catch (error) {
      console.error('Error checking custom groups:', error);
      setUseCustomGroups(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // First, get tournament details to know the category
      const tournamentRes = await api.get(`/tournaments/${tournamentId}`);
      const tournamentData = tournamentRes.data.data;
      setTournament(tournamentData);

      let participantsList = [];

      // Fetch participants based on tournament category
      if (tournamentData.category === 'singles') {
        // For SINGLES: Fetch locked players
        const registrationsRes = await api.get(`/registrations/tournaments/${tournamentId}`);
        const registrationsData = registrationsRes.data.data;
        const allRegistrations = registrationsData?.all || [];
        
        participantsList = allRegistrations
          .filter(r => r.status === 'locked')
          .map(p => ({
            id: p.id,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email,
            type: 'player',
            seed_number: p.seed_number
          }));
          
      } else if (tournamentData.category === 'pairs' || tournamentData.category === 'doubles') {
        // For PAIRS/DOUBLES: Fetch locked pairs
        const pairsRes = await api.get(`/tournaments/${tournamentId}/pairs`);
        
        
        // Handle response structure: { data: { pairs: [...], total, locked, draft } }
        const responseData = pairsRes.data.data || pairsRes.data;
        let pairsData = responseData.pairs || responseData || [];
        
        // Ensure it's an array
        if (!Array.isArray(pairsData)) {
          console.warn('Pairs data is not an array:', pairsData);
          pairsData = [];
        }

        // Validate minimum pairs requirement
        if (pairsData.length < 2) {
          alert(`Cannot schedule matches. At least 2 pairs must be created for this tournament. Currently ${pairsData.length} pair(s) exist.`);
          navigate(`/tournaments/${tournamentId}/manage`);
          return;
        }
        
        participantsList = pairsData
          .filter(pair => pair.status === 'locked')
          .map(pair => ({
            id: pair.id,
            name: pair.name || `Pair ${pair.id}`,
            type: 'pair',
            seed_number: pair.seed_number,
            members: [
              { 
                name: `${pair.player1_first_name} ${pair.player1_last_name}`,
                skill: pair.player1_skill 
              },
              { 
                name: `${pair.player2_first_name} ${pair.player2_last_name}`,
                skill: pair.player2_skill 
              }
            ]
          }));
          
      } else if (tournamentData.category === 'teams') {
        // For TEAMS: Fetch locked teams
        const teamsRes = await api.get(`/tournaments/${tournamentId}/teams`);
        
        
        // Handle response structure: { data: { teams: [...], total, locked, draft } }
        const responseData = teamsRes.data.data || teamsRes.data;
        let teamsData = responseData.teams || responseData || [];
        
        // Ensure it's an array
        if (!Array.isArray(teamsData)) {
          console.warn('Teams data is not an array:', teamsData);
          teamsData = [];
        }

        // Validate minimum teams requirement
        if (teamsData.length < 2) {
          alert(`Cannot schedule matches. At least 2 teams must be created for this tournament. Currently ${teamsData.length} team(s) exist.`);
          navigate(`/tournaments/${tournamentId}/manage`);
          return;
        }
        
        participantsList = teamsData
          .filter(team => team.status === 'locked')
          .map(team => ({
            id: team.id,
            name: team.name || `Team ${team.id}`,
            type: 'team',
            seed_number: team.seed_number,
            members: team.members || []
          }));
      }

      setParticipants(participantsList);

      // Initialize seeds
      const initialSeeds = participantsList.map((p, index) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        currentSeed: p.seed_number || index + 1,
        newSeed: p.seed_number || index + 1
      }));
      setSeeds(initialSeeds);

      // Check tournament status to determine step
      if (tournamentData.status === 'ongoing') {
        setCurrentStep(3); // Already generated, go to scheduling
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      alert('Failed to load tournament data');
      navigate(`/tournaments/${tournamentId}/manage`);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedChange = (id, newSeed) => {
    setSeeds(seeds.map(s => s.id === id ? { ...s, newSeed: parseInt(newSeed) } : s));
  };

  const handleSaveSeeds = async () => {
    try {
      setSavingSeeds(true);
      await api.post(`/tournaments/${tournamentId}/assign-seeds`, {
        seeds: seeds.map(s => ({ participant_id: s.id, seed_number: s.newSeed }))
      });
      alert('Seeds assigned successfully!');
      setCurrentStep(2); // Move to generate brackets step
    } catch (error) {
      console.error('Failed to save seeds:', error);
      alert(error.response?.data?.error || 'Failed to save seeds');
    } finally {
      setSavingSeeds(false);
    }
  };

  const handleSkipSeeding = () => {
    setCurrentStep(2);
  };

  const handlePreviewBrackets = async () => {
    // Validate numeric fields if they are provided
    if (scheduleConfig.matchesPerDay && (scheduleConfig.matchesPerDay === '' || scheduleConfig.matchesPerDay < 1)) {
      alert('⚠️ Please enter a valid number for Matches Per Day (minimum 1)');
      return;
    }
    if (scheduleConfig.matchDuration && (scheduleConfig.matchDuration === '' || scheduleConfig.matchDuration < 1)) {
      alert('⚠️ Please enter a valid Total Match Duration (minimum 1 minute)');
      return;
    }
    if (scheduleConfig.breakBetweenMatches !== undefined && scheduleConfig.breakBetweenMatches !== null && 
        (scheduleConfig.breakBetweenMatches === '' || scheduleConfig.breakBetweenMatches < 0)) {
      alert('⚠️ Please enter a valid Break Between Matches (minimum 0 minutes)');
      return;
    }

    try {
      setGeneratingBrackets(true);
      
      
      // Prepare request body - only send relevant values based on format
      const requestBody = {};
      
      // Schedule config (optional for all formats)
      if (scheduleConfig.startDate) {
        requestBody.start_date = scheduleConfig.startDate;
      }
      if (scheduleConfig.endDate) {
        requestBody.end_date = scheduleConfig.endDate;
      }
      if (scheduleConfig.matchesPerDay) {
        requestBody.matches_per_day = scheduleConfig.matchesPerDay;
      }
      if (scheduleConfig.matchDuration) {
        requestBody.match_duration = scheduleConfig.matchDuration;
      }
      if (scheduleConfig.breakBetweenMatches) {
        requestBody.break_between_matches = scheduleConfig.breakBetweenMatches;
      }
      if (scheduleConfig.startTime) {
        requestBody.start_time = scheduleConfig.startTime;
      }
      if (scheduleConfig.endTime) {
        requestBody.end_time = scheduleConfig.endTime;
      }
      
      // Group-specific config (only for groups_knockout format)
      if (tournament.format_type === 'groups_knockout') {
        if (scheduleConfig.groupSize) {
          requestBody.group_size = scheduleConfig.groupSize;
        }
        if (scheduleConfig.qualifiersPerGroup) {
          requestBody.qualifiers_per_group = scheduleConfig.qualifiersPerGroup;
        }
      }
      

      
      // Call backend API to get accurate match preview
      const response = await api.post(`/tournaments/${tournamentId}/preview-matches`, requestBody);

      const preview = response.data.data;
      
      
      
      // if (preview.format === 'groups_knockout') {
      //   console.log(`   Group stage: ${preview.groupStageMatches} matches`);
      //   console.log(`   Knockout: ${preview.knockoutMatches} matches`);
      //   console.log(`   Total qualifiers: ${preview.totalQualifiers}`);
      //   console.log(`   Qualifiers per group: ${preview.qualifiersPerGroup.join(', ')}`);
      // } else if (preview.format === 'knockout') {
      //   console.log(`   Bracket size: ${preview.bracketSize}`);
      //   console.log(`   Byes: ${preview.byes}`);
      //   console.log(`   Total rounds: ${preview.totalRounds}`);
      // }

      // Set bracket preview directly from API response
      setBracketPreview(preview.matchups);
      setCurrentStep(2);
      
    } catch (error) {
      console.error('Failed to preview brackets:', error);
      alert(error.response?.data?.error || 'Failed to generate bracket preview');
    } finally {
      setGeneratingBrackets(false);
    }
  };

  const handleConfirmBrackets = async () => {
    // Validate numeric fields
    if (!scheduleConfig.matchesPerDay || scheduleConfig.matchesPerDay === '' || scheduleConfig.matchesPerDay < 1) {
      alert('⚠️ Please enter a valid number for Matches Per Day (minimum 1)');
      return;
    }
    if (!scheduleConfig.matchDuration || scheduleConfig.matchDuration === '' || scheduleConfig.matchDuration < 1) {
      alert('⚠️ Please enter a valid Total Match Duration (minimum 1 minute)');
      return;
    }
    if (!scheduleConfig.breakBetweenMatches || scheduleConfig.breakBetweenMatches === '' || scheduleConfig.breakBetweenMatches < 0) {
      alert('⚠️ Please enter a valid Break Between Matches (minimum 0 minutes)');
      return;
    }

    // Use optimal schedule values
    const finalSchedule = optimalSchedule || {
      actualMatchesPerDay: scheduleConfig.matchesPerDay,
      calculatedEndDate: scheduleConfig.endDate
    };

    const confirmMessage = `Confirm and start tournament?\n\n` +
      `Format: ${tournament.format_type}\n` +
      `Participants: ${participants.length}\n` +
      `Start Date: ${scheduleConfig.startDate}\n` +
      `End Date: ${finalSchedule.calculatedEndDate}\n` +
      `Matches Per Day: ${finalSchedule.actualMatchesPerDay}\n\n` +
      `This will create all matches and start the tournament.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setGeneratingBrackets(true);
      
      // Validate custom groups (mandatory for groups_knockout)
      if (tournament.format_type === 'groups_knockout') {
        if (!customGroupsValidation?.all_assigned) {
          alert('⚠️ Please assign all participants to groups before generating brackets');
          setGeneratingBrackets(false);
          return;
        }
        
        // Check each group has at least 2 participants
        const invalidGroups = customGroups.filter(g => g.current_size < 2);
        if (invalidGroups.length > 0) {
          alert(`⚠️ The following groups have less than 2 participants: ${invalidGroups.map(g => g.group_name).join(', ')}`);
          setGeneratingBrackets(false);
          return;
        }
      }
      
      // Send schedule configuration with bracket generation
      const scheduleData = {
        start_date: scheduleConfig.startDate,
        end_date: finalSchedule.calculatedEndDate,
        matches_per_day: finalSchedule.actualMatchesPerDay,
        match_duration: scheduleConfig.matchDuration,
        break_between_matches: scheduleConfig.breakBetweenMatches,
        start_time: scheduleConfig.startTime,
        end_time: scheduleConfig.endTime
      };

      // Custom groups are mandatory for groups_knockout, no group_size needed

      

      const response = await api.post(`/tournaments/${tournamentId}/generate-brackets`, scheduleData);
      alert('Tournament started successfully!\n\n' + 
            `Format: ${response.data.data.format}\n` +
            `Matches created: ${response.data.data.first_round_matches || response.data.data.total_matches || 'N/A'}`);
      
      // Navigate back to tournament detail page
      navigate(`/tournaments/${tournamentId}`);
    } catch (error) {
      console.error('Failed to start tournament:', error);
      alert(error.response?.data?.message || error.response?.data?.error || 'Failed to start tournament');
    } finally {
      setGeneratingBrackets(false);
    }
  };

  const handleSwapParticipants = (matchId, position) => {
    // Allow manual editing of matchups
    setEditingBracket(true);
    // Implementation for swapping participants in preview
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/tournaments/${tournamentId}/manage`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Tournament Management
          </button>

          <h1 className="text-3xl font-bold text-gray-900">Match Scheduling</h1>
          <p className="text-gray-600 mt-1">{tournament.name}</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex-1 text-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <p className="mt-2 text-sm font-medium">Assign Positions</p>
            </div>

            <div className={`flex-1 h-1 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>

            <div className={`flex-1 text-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <p className="mt-2 text-sm font-medium">Review Matchups</p>
            </div>

            <div className={`flex-1 h-1 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>

            <div className={`flex-1 text-center ${currentStep >= 3 ? 'text-primary-500' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${
                currentStep >= 3 ? 'bg-primary-500 text-white' : 'bg-gray-200'
              }`}>
                3
              </div>
              <p className="mt-2 text-sm font-medium">Schedule Matches</p>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Step 1: Assign Positions */}
          {currentStep === 1 && (
            <div>
              {/* Show different heading based on format */}
              {tournament.format_type === 'groups_knockout' ? (
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 1: Create Custom Groups (Required)</h2>
              ) : (
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 1: Assign Draw Positions (Optional)</h2>
              )}
              
              {/* Group Configuration (Only for groups_knockout) - BEFORE positioning */}
              {tournament.format_type === 'groups_knockout' && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
                  {/* Header */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                      <Users className="w-6 h-6" />
                      Custom Groups Configuration
                    </h3>
                    <p className="text-sm text-purple-700 mt-1">
                      Create groups and drag participants to assign them
                    </p>
                  </div>

                  {/* Content */}
                  <div>
                    {/* Validation Warning */}
                    {customGroupsValidation && !customGroupsValidation.all_assigned && (
                      <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <AlertCircle className="w-5 h-5" />
                          <p className="font-semibold">
                            {customGroupsValidation.unassigned_participants} participant(s) not assigned to any group
                          </p>
                        </div>
                        <p className="text-sm text-yellow-700 mt-1">
                          Please assign all participants before generating brackets
                        </p>
                      </div>
                    )}
                    
                    {/* Custom Groups Manager */}
                    <CustomGroupsManager
                      tournamentId={tournamentId}
                      participants={participants}
                      onGroupsUpdated={checkCustomGroups}
                    />
                  </div>
                </div>
              )}
              
              {/* Seeding Recommendation */}
              {(() => {
                const count = participants.length;
                const isRoundRobin = tournament.format_type === 'round_robin' || tournament.format_type === 'league';
                const isGroupsKnockout = tournament.format_type === 'groups_knockout';
                
                if (isGroupsKnockout) {
                  // Only show info box if groups are created
                  if (customGroupsForPreview && customGroupsForPreview.length > 0) {
                    return (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                          <Trophy className="w-5 h-5 text-purple-600 mt-0.5" />
                          <div>
                            <p className="font-semibold text-purple-900">🏆 Groups + Knockout Format</p>
                            <p className="text-sm text-purple-700 mt-1">
                              You have created custom groups for your {count} participants.
                            </p>
                            <p className="text-sm text-purple-700 mt-2">
                              <strong>How it works:</strong>
                            </p>
                            <ul className="text-sm text-purple-700 mt-2 ml-4 list-disc space-y-1">
                              <li><strong>Group Stage:</strong> Round-robin within each group (everyone plays everyone in their group)</li>
                              <li><strong>Knockout Stage:</strong> Top 2 from each group advance to knockout bracket</li>
                              <li><strong>Seeding:</strong> Seeds 1, 2, 3... are distributed across groups based on your custom assignments</li>
                            </ul>
                            <p className="text-sm text-purple-700 mt-2">
                              Participants are organized by groups below for easy identification.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null; // Don't show anything if groups not created
                }
                
                if (isRoundRobin) {
                  // Round Robin / League - Seeding is optional
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-blue-900">ℹ️ Seeding is Optional</p>
                          <p className="text-sm text-blue-700 mt-1">
                            In Round Robin format, everyone plays everyone. Seeding only affects:
                          </p>
                          <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc space-y-1">
                            <li><strong>Match order</strong> - Lower seeds play first</li>
                            <li><strong>Tiebreakers</strong> - If players finish with same points</li>
                            <li><strong>Tournament records</strong> - For ranking purposes</li>
                          </ul>
                          <p className="text-sm text-blue-700 mt-2">
                            You can skip this step if you don't need specific seeding.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Knockout format - Check for byes
                const isPowerOfTwo = count > 0 && (count & (count - 1)) === 0;
                const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(count)));
                const byesNeeded = nextPowerOfTwo - count;
                
                return isPowerOfTwo ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-blue-900">Perfect Bracket Size</p>
                        <p className="text-sm text-blue-700 mt-1">
                          You have {count} {
                            tournament?.category === 'singles' ? 'players' :
                            tournament?.category === 'doubles' ? 'pairs' :
                            tournament?.category === 'teams' ? 'teams' :
                            'participants'
                          } - a perfect bracket size! Seeding is optional. 
                          You can skip this step and use automatic seeding (1, 2, 3...).
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Trophy className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-orange-900">⚠️ Positioning Recommended</p>
                        <p className="text-sm text-orange-700 mt-1">
                          You have {count} {
                            tournament?.category === 'singles' ? 'players' :
                            tournament?.category === 'doubles' ? 'pairs' :
                            tournament?.category === 'teams' ? 'teams' :
                            'participants'
                          }. The bracket will be expanded to {nextPowerOfTwo} positions, 
                          giving <strong>{byesNeeded} bye{byesNeeded > 1 ? 's' : ''}</strong> (automatic advancement to Round 2).
                        </p>
                        <p className="text-sm text-orange-700 mt-2">
                          <strong>Recommendation:</strong> Assign positions so your top {byesNeeded} {
                            tournament?.category === 'singles' ? 'player' :
                            tournament?.category === 'doubles' ? 'pair' :
                            tournament?.category === 'teams' ? 'team' :
                            'participant'
                          }{byesNeeded > 1 ? 's' : ''} get{byesNeeded === 1 ? 's' : ''} the bye{byesNeeded > 1 ? 's' : ''}.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Only show seeding section if groups are created (for groups_knockout) or always (for other formats) */}
              {(tournament.format_type !== 'groups_knockout' || (customGroupsForPreview && customGroupsForPreview.length > 0)) && (
                <>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
                    <p className="text-sm text-blue-800 font-semibold mb-2">🎯 How to assign positions:</p>
                    <div className="flex items-center gap-4 text-xs text-blue-700 mb-2">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h4m0 0V4m0 4l-4 4m16-4h-4m0 0V4m0 4l4 4M4 16h4m0 0v4m0-4l-4-4m16 4h-4m0 0v4m0-4l4-4" />
                        </svg>
                        <strong>Drag & Drop</strong> to reorder
                      </span>
                      <span>or</span>
                      <span><strong>Type numbers</strong> to assign positions manually</span>
                    </div>
                    {tournament.format_type === 'knockout' && (
                      <p className="text-xs text-blue-700 mt-2">
                        <strong>💡 Color coding:</strong> Participants with the <strong>same background color</strong> will play against each other in Round 1
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Seeding List - Different layout for groups_knockout */}
              {tournament.format_type === 'groups_knockout' ? (
                // GROUPS + KNOCKOUT: Show participants grouped by groups
                <div className="space-y-6 mb-8">
                  {(() => {
                    // If custom groups exist, use them for display
                    if (customGroupsForPreview && customGroupsForPreview.length > 0) {
                      return customGroupsForPreview.map((group, groupIndex) => {
                        const groupName = group.group_name.replace('Group ', '');
                        const groupColors = [
                          { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900', header: 'bg-blue-100' },
                          { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-900', header: 'bg-purple-100' },
                          { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-900', header: 'bg-pink-100' },
                          { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-900', header: 'bg-orange-100' },
                          { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-900', header: 'bg-cyan-100' },
                          { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-900', header: 'bg-indigo-100' },
                        ];
                        const groupColor = groupColors[groupIndex % groupColors.length];
                        
                        return (
                          <div key={group.id} className={`border-2 ${groupColor.border} rounded-lg overflow-hidden`}>
                            {/* Group Header */}
                            <div className={`${groupColor.header} px-4 py-3 border-b-2 ${groupColor.border}`}>
                              <h3 className={`font-bold text-lg ${groupColor.text}`}>
                                {group.group_name}
                                <span className="ml-2 text-sm font-normal opacity-75">
                                  ({group.participants.length} participants)
                                </span>
                              </h3>
                            </div>
                            
                            {/* Group Participants */}
                            <div className={`${groupColor.bg} p-4 space-y-3`}>
                              {group.participants.map((participant) => (
                                <div 
                                  key={participant.id}
                                  className={`flex items-center gap-4 p-4 bg-white rounded-lg border-2 ${groupColor.border} border-opacity-50 shadow-sm`}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="font-medium text-gray-900 text-lg">{participant.participant_name}</div>
                                      <span className={`inline-flex items-center gap-1 px-2 py-1 ${groupColor.bg} ${groupColor.text} text-xs font-semibold rounded-full border ${groupColor.border}`}>
                                        {groupName}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    }
                    
                    // Don't show auto-generated preview - groups must be created manually
                    return null;
                    
                    // Use configurable group size
                    const groupSize = scheduleConfig.groupSize || 4;
                    const groupCount = Math.ceil(count / groupSize);
                    
                    const sortedSeeds = [...seeds].sort((a, b) => a.newSeed - b.newSeed);
                    
                    // Distribute participants across groups (snake seeding)
                    const groups = Array.from({ length: groupCount }, () => []);
                    for (let i = 0; i < sortedSeeds.length; i++) {
                      const groupIndex = i % groupCount;
                      groups[groupIndex].push(sortedSeeds[i]);
                    }
                    
                    return groups.map((groupParticipants, groupIndex) => {
                      const groupName = String.fromCharCode(65 + groupIndex); // A, B, C...
                      const groupColors = [
                        { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900', header: 'bg-blue-100' },
                        { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-900', header: 'bg-purple-100' },
                        { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-900', header: 'bg-pink-100' },
                        { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-900', header: 'bg-orange-100' },
                        { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-900', header: 'bg-cyan-100' },
                        { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-900', header: 'bg-indigo-100' },
                      ];
                      const groupColor = groupColors[groupIndex % groupColors.length];
                      
                      return (
                        <div key={groupIndex} className={`border-2 ${groupColor.border} rounded-lg overflow-hidden`}>
                          {/* Group Header */}
                          <div className={`${groupColor.header} px-4 py-3 border-b-2 ${groupColor.border}`}>
                            <h3 className={`font-bold text-lg ${groupColor.text}`}>
                              Group {groupName}
                              <span className="ml-2 text-sm font-normal opacity-75">
                                ({groupParticipants.length} participants)
                              </span>
                            </h3>
                          </div>
                          
                          {/* Group Participants */}
                          <div className={`${groupColor.bg} p-4 space-y-3`}>
                            {groupParticipants.map((participant, participantIndex) => {
                              const globalIndex = sortedSeeds.findIndex(s => s.id === participant.id);
                              
                              return (
                                <div 
                                  key={participant.id} 
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('text/plain', globalIndex.toString());
                                    e.currentTarget.style.opacity = '0.5';
                                  }}
                                  onDragEnd={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                                    
                                    if (draggedIndex !== globalIndex) {
                                      // Swap the seed numbers
                                      const newSeeds = [...seeds];
                                      const draggedParticipant = sortedSeeds[draggedIndex];
                                      const targetParticipant = sortedSeeds[globalIndex];
                                      
                                      const draggedSeed = draggedParticipant.newSeed;
                                      const targetSeed = targetParticipant.newSeed;
                                      
                                      // Find and update in original array
                                      const draggedIdx = newSeeds.findIndex(s => s.id === draggedParticipant.id);
                                      const targetIdx = newSeeds.findIndex(s => s.id === targetParticipant.id);
                                      
                                      newSeeds[draggedIdx].newSeed = targetSeed;
                                      newSeeds[targetIdx].newSeed = draggedSeed;
                                      
                                      setSeeds(newSeeds);
                                    }
                                  }}
                                  className={`flex items-center gap-4 p-4 bg-white rounded-lg border-2 ${groupColor.border} hover:border-opacity-100 border-opacity-50 transition-all cursor-move shadow-sm hover:shadow-md`}
                                >
                                  <div className="flex-shrink-0 text-gray-400 hover:text-amber-600 transition-colors cursor-grab active:cursor-grabbing">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h4m0 0V4m0 4l-4 4m16-4h-4m0 0V4m0 4l4 4M4 16h4m0 0v4m0-4l-4-4m16 4h-4m0 0v4m0-4l4-4" />
                                    </svg>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <label className="block text-xs text-gray-500 mb-1">Seed</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max={seeds.length}
                                      value={participant.newSeed}
                                      onChange={(e) => handleSeedChange(participant.id, e.target.value)}
                                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold text-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="font-medium text-gray-900 text-lg">{participant.name}</div>
                                      <span className={`inline-flex items-center gap-1 px-2 py-1 ${groupColor.bg} ${groupColor.text} text-xs font-semibold rounded-full border ${groupColor.border}`}>
                                        Group {groupName}
                                      </span>
                                    </div>
                                    {participant.currentSeed !== participant.newSeed && (
                                      <div className="text-sm text-blue-600">
                                        Changed from seed {participant.currentSeed}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                // KNOCKOUT / ROUND ROBIN: Show flat list
                <div className="space-y-3 mb-8">
                  {seeds.sort((a, b) => a.newSeed - b.newSeed).map((participant, index) => {
                    // Calculate if this seed will get a bye
                    const count = participants.length;
                    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(count)));
                    const byesNeeded = nextPowerOfTwo - count;
                    const willGetBye = tournament.format_type === 'knockout' && byesNeeded > 0 && participant.newSeed <= byesNeeded;
                  
                  // Calculate matchup color for knockout and round-robin tournaments
                  let matchupColor = null;
                  let opponentSeed = null;
                  let opponentSeeds = []; // For round-robin (multiple opponents)
                  
                  if (tournament.format_type === 'knockout' && !willGetBye) {
                    // Generate standard seeding to find opponent
                    const generateSeeding = (size) => {
                      if (size === 2) return [1, 2];
                      const half = size / 2;
                      const upper = generateSeeding(half);
                      const lower = upper.map(seed => size + 1 - seed);
                      const result = [];
                      for (let i = 0; i < half; i++) {
                        result.push(upper[i]);
                        result.push(lower[i]);
                      }
                      return result;
                    };
                    
                    const seeding = generateSeeding(nextPowerOfTwo);
                    const seedPosition = seeding.indexOf(participant.newSeed);
                    
                    // Find opponent position (pairs are at even/odd indices)
                    const opponentPosition = seedPosition % 2 === 0 ? seedPosition + 1 : seedPosition - 1;
                    opponentSeed = seeding[opponentPosition];
                    
                    // Only show color if opponent exists (not a bye position)
                    if (opponentSeed && opponentSeed <= count) {
                      // Assign color based on match number (pair index)
                      const matchNumber = Math.floor(seedPosition / 2);
                      const colors = [
                        { bg: 'bg-blue-50', border: 'border-blue-300', hover: 'hover:border-blue-400', text: 'text-blue-700' },
                        { bg: 'bg-purple-50', border: 'border-purple-300', hover: 'hover:border-purple-400', text: 'text-purple-700' },
                        { bg: 'bg-pink-50', border: 'border-pink-300', hover: 'hover:border-pink-400', text: 'text-pink-700' },
                        { bg: 'bg-orange-50', border: 'border-orange-300', hover: 'hover:border-orange-400', text: 'text-orange-700' },
                        { bg: 'bg-cyan-50', border: 'border-cyan-300', hover: 'hover:border-cyan-400', text: 'text-cyan-700' },
                        { bg: 'bg-indigo-50', border: 'border-indigo-300', hover: 'hover:border-indigo-400', text: 'text-indigo-700' },
                        { bg: 'bg-rose-50', border: 'border-rose-300', hover: 'hover:border-rose-400', text: 'text-rose-700' },
                        { bg: 'bg-primary-50', border: 'border-teal-300', hover: 'hover:border-teal-400', text: 'text-teal-700' },
                      ];
                      matchupColor = colors[matchNumber % colors.length];
                    }
                  } else if (tournament.format_type === 'round_robin') {
                    // For round-robin, show all opponents this player will face
                    // In round-robin, everyone plays everyone else
                    opponentSeeds = [];
                    for (let i = 1; i <= count; i++) {
                      if (i !== participant.newSeed) {
                        opponentSeeds.push(i);
                      }
                    }
                    
                    // Assign a color based on seed number for visual grouping
                    const colors = [
                      { bg: 'bg-blue-50', border: 'border-blue-300', hover: 'hover:border-blue-400', text: 'text-blue-700' },
                      { bg: 'bg-purple-50', border: 'border-purple-300', hover: 'hover:border-purple-400', text: 'text-purple-700' },
                      { bg: 'bg-pink-50', border: 'border-pink-300', hover: 'hover:border-pink-400', text: 'text-pink-700' },
                      { bg: 'bg-orange-50', border: 'border-orange-300', hover: 'hover:border-orange-400', text: 'text-orange-700' },
                      { bg: 'bg-cyan-50', border: 'border-cyan-300', hover: 'hover:border-cyan-400', text: 'text-cyan-700' },
                      { bg: 'bg-indigo-50', border: 'border-indigo-300', hover: 'hover:border-indigo-400', text: 'text-indigo-700' },
                      { bg: 'bg-rose-50', border: 'border-rose-300', hover: 'hover:border-rose-400', text: 'text-rose-700' },
                      { bg: 'bg-primary-50', border: 'border-teal-300', hover: 'hover:border-teal-400', text: 'text-teal-700' },
                    ];
                    matchupColor = colors[(participant.newSeed - 1) % colors.length];
                  }
                  
                  return (
                  <div 
                    key={participant.id} 
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', index.toString());
                      e.currentTarget.style.opacity = '0.5';
                    }}
                    onDragEnd={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                      const sortedSeeds = [...seeds].sort((a, b) => a.newSeed - b.newSeed);
                      
                      if (draggedIndex !== index) {
                        // Swap the seed numbers
                        const newSeeds = [...seeds];
                        const draggedParticipant = sortedSeeds[draggedIndex];
                        const targetParticipant = sortedSeeds[index];
                        
                        const draggedSeed = draggedParticipant.newSeed;
                        const targetSeed = targetParticipant.newSeed;
                        
                        // Find and update in original array
                        const draggedIdx = newSeeds.findIndex(s => s.id === draggedParticipant.id);
                        const targetIdx = newSeeds.findIndex(s => s.id === targetParticipant.id);
                        
                        newSeeds[draggedIdx].newSeed = targetSeed;
                        newSeeds[targetIdx].newSeed = draggedSeed;
                        
                        setSeeds(newSeeds);
                      }
                    }}
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-move ${
                      willGetBye 
                        ? 'bg-gradient-to-r from-primary-50 to-green-50 border-primary-300 hover:border-primary-400 shadow-md' 
                        : matchupColor
                        ? `${matchupColor.bg} ${matchupColor.border} ${matchupColor.hover} shadow-sm`
                        : 'bg-gray-50 hover:bg-gray-100 border-transparent hover:border-amber-300'
                    }`}
                  >
                    <div className="flex-shrink-0 text-gray-400 hover:text-amber-600 transition-colors cursor-grab active:cursor-grabbing">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h4m0 0V4m0 4l-4 4m16-4h-4m0 0V4m0 4l4 4M4 16h4m0 0v4m0-4l-4-4m16 4h-4m0 0v4m0-4l4-4" />
                      </svg>
                    </div>
                    <div className="flex-shrink-0">
                      <label className="block text-xs text-gray-500 mb-1">Seed</label>
                      <input
                        type="number"
                        min="1"
                        max={seeds.length}
                        value={participant.newSeed}
                        onChange={(e) => handleSeedChange(participant.id, e.target.value)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold text-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-medium text-gray-900 text-lg">{participant.name}</div>
                        {willGetBye && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-600 text-xs font-semibold rounded-full border border-primary-300">
                            <Trophy className="w-3 h-3" />
                            BYE - Auto advances to Round 2
                          </span>
                        )}
                        {matchupColor && opponentSeed && (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 ${matchupColor.bg} ${matchupColor.text} text-xs font-semibold rounded-full border ${matchupColor.border}`}>
                            vs Seed #{opponentSeed}
                          </span>
                        )}
                        {tournament.format_type === 'round_robin' && opponentSeeds.length > 0 && (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 ${matchupColor.bg} ${matchupColor.text} text-xs font-semibold rounded-full border ${matchupColor.border}`}>
                            Plays vs: {opponentSeeds.map(s => `#${s}`).join(', ')}
                          </span>
                        )}
                      </div>
                      {participant.currentSeed !== participant.newSeed && (
                        <div className="text-sm text-blue-600">
                          Changed from seed {participant.currentSeed}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={handlePreviewBrackets}
                  disabled={generatingBrackets}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Skip & Preview Brackets
                </button>
                <button
                  onClick={async () => {
                    await handleSaveSeeds();
                    await handlePreviewBrackets();
                  }}
                  disabled={
                    savingSeeds || 
                    generatingBrackets || 
                    (tournament.format_type === 'groups_knockout' && (!customGroupsValidation?.all_assigned || customGroups.length === 0))
                  }
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  title={
                    tournament.format_type === 'groups_knockout' && (!customGroupsValidation?.all_assigned || customGroups.length === 0)
                      ? 'Please create groups and assign all participants first'
                      : ''
                  }
                >
                  {savingSeeds || generatingBrackets ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Save Seeds & Preview Brackets
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Preview Brackets */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 2: Review Bracket Matchups</h2>
              
              {/* Tournament Info */}
              {tournament?.format_type === 'knockout' && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-purple-900 mb-1">🏆 Knockout Tournament</p>
                      <p className="text-xs text-purple-700">
                        <strong>{participants.length} participants</strong> will compete in <strong>{participants.length - 1} total matches</strong> across all rounds
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-900">{participants.length - 1}</p>
                      <p className="text-xs text-purple-600">Total Matches</p>
                    </div>
                  </div>
                </div>
              )}
              
              {tournament?.format_type === 'groups_knockout' && bracketPreview && (
                <div className="bg-gradient-to-r from-primary-50 to-primary-50 border-2 border-primary-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-primary-700 mb-1">🏆 Groups + Knockout Tournament</p>
                      <p className="text-xs text-primary-600">
                        <strong>{participants.length} participants</strong> in <strong>{Math.ceil(participants.length / (scheduleConfig.groupSize || 4))} groups</strong>
                        {' • '}
                        <strong>{bracketPreview.filter(m => !m.isKnockout).length} group matches</strong>
                        {' + '}
                        <strong>{bracketPreview.filter(m => m.isKnockout).length} knockout matches</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-700">{bracketPreview.length}</p>
                      <p className="text-xs text-primary-500">Total Matches</p>
                    </div>
                  </div>
                </div>
              )}
              
              {tournament.format_type !== 'round_robin' && tournament.format_type !== 'league' ? (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
                  <p className="text-sm text-blue-800 font-semibold mb-2">🎯 Customize Matchups:</p>
                  <div className="flex items-center gap-4 text-xs text-blue-700">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h4m0 0V4m0 4l-4 4m16-4h-4m0 0V4m0 4l4 4M4 16h4m0 0v4m0-4l-4-4m16 4h-4m0 0v4m0-4l4-4" />
                      </svg>
                      <strong>Drag & Drop</strong> participants between matches to customize matchups
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-green-50 to-primary-50 border-l-4 border-green-500 p-4 rounded-r-lg mb-6">
                  <p className="text-sm text-green-800 font-semibold mb-2">✅ Round-Robin Format:</p>
                  <div className="text-xs text-green-700">
                    <p>All matches are automatically generated. Every player will play against every other player.</p>
                    <p className="mt-1 italic">Drag & drop is disabled as matchups are already optimal.</p>
                  </div>
                </div>
              )}

              {/* Bracket Preview */}
              {bracketPreview && bracketPreview.length > 0 ? (
                <div className="mb-8">
                  {/* Group matches by group name (for groups_knockout) or round (for others) */}
                  {(() => {
                    // For groups_knockout, group by groupName first, then by round
                    if (tournament.format_type === 'groups_knockout') {
                      const groupStageMatches = bracketPreview.filter(m => !m.isKnockout);
                      const knockoutMatches = bracketPreview.filter(m => m.isKnockout);
                      
                      // Group stage matches by group
                      const matchesByGroup = {};
                      groupStageMatches.forEach((match, globalIndex) => {
                        const groupKey = match.groupName || 'Unknown';
                        if (!matchesByGroup[groupKey]) {
                          matchesByGroup[groupKey] = [];
                        }
                        matchesByGroup[groupKey].push({ ...match, globalIndex });
                      });
                      
                      // Knockout matches by round
                      const knockoutByRound = {};
                      knockoutMatches.forEach((match, globalIndex) => {
                        const roundKey = match.roundName || `Round ${match.round}`;
                        if (!knockoutByRound[roundKey]) {
                          knockoutByRound[roundKey] = [];
                        }
                        knockoutByRound[roundKey].push({ ...match, globalIndex: bracketPreview.indexOf(match) });
                      });
                      
                      return (
                        <>
                          {/* Group Stage Matches */}
                          {Object.keys(matchesByGroup).sort().map(groupName => {
                            const groupMatches = matchesByGroup[groupName];
                            return (
                              <div key={groupName} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-4 border-2 border-blue-200">
                                <h3 className="font-bold text-blue-900 mb-4 text-lg">{groupName} - Round Robin Matchups</h3>
                                <div className="space-y-3">
                                  {groupMatches.map((match) => {
                                    return (
                                      <div key={match.id} className="bg-white border-2 border-blue-200 rounded-lg p-4 hover:border-blue-400 transition-all shadow-sm">
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                              <span className="text-sm font-semibold text-gray-500">Match {match.id}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                              {/* Participant 1 */}
                                              <div className="flex-1 bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-semibold text-blue-600">
                                                    {match.participant1?.name || 'TBD'}
                                                  </span>
                                                  {match.participant1 && (
                                                    <span className="text-xs text-blue-500">Seed {seeds.find(s => s.id === match.participant1.id)?.newSeed || '-'}</span>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              {/* VS */}
                                              <div className="text-gray-400 font-bold text-sm">VS</div>
                                              
                                              {/* Participant 2 */}
                                              <div className="flex-1 bg-orange-50 p-3 rounded-lg border-2 border-orange-200">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-semibold text-orange-600">
                                                    {match.participant2?.name || 'TBD'}
                                                  </span>
                                                  {match.participant2 && (
                                                    <span className="text-xs text-orange-500">Seed {seeds.find(s => s.id === match.participant2.id)?.newSeed || '-'}</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Knockout Stage Matches */}
                          {Object.keys(knockoutByRound).map(roundName => {
                            const roundMatches = knockoutByRound[roundName];
                            return (
                              <div key={roundName} className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-6 mb-4 border-2 border-amber-300">
                                <h3 className="font-bold text-amber-900 mb-4 text-lg">{roundName} Matchups</h3>
                                <div className="space-y-3">
                                  {roundMatches.map((match) => {
                                    return (
                                      <div key={match.id} className="bg-white border-2 border-amber-200 rounded-lg p-4 hover:border-amber-400 transition-all shadow-sm">
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                              <span className="text-sm font-semibold text-gray-500">Match {match.id}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                              {/* Participant 1 */}
                                              <div className="flex-1 bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-semibold text-blue-600">
                                                    {match.participant1?.name || 'TBD'}
                                                  </span>
                                                </div>
                                              </div>
                                              
                                              {/* VS */}
                                              <div className="text-gray-400 font-bold text-sm">VS</div>
                                              
                                              {/* Participant 2 */}
                                              <div className="flex-1 bg-orange-50 p-3 rounded-lg border-2 border-orange-200">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-semibold text-orange-600">
                                                    {match.participant2?.name || 'TBD'}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      );
                    }
                    
                    // For other formats, group by round
                    const matchesByRound = {};
                    bracketPreview.forEach((match, globalIndex) => {
                      const roundKey = match.round || 1;
                      if (!matchesByRound[roundKey]) {
                        matchesByRound[roundKey] = [];
                      }
                      matchesByRound[roundKey].push({ ...match, globalIndex });
                    });
                    
                    return Object.keys(matchesByRound).sort((a, b) => Number(a) - Number(b)).map(roundNum => {
                      const roundMatches = matchesByRound[roundNum];
                      const firstMatch = roundMatches[0];
                      const roundName = firstMatch.roundName || `Round ${roundNum}`;
                      
                      return (
                        <div key={roundNum} className="bg-gray-50 rounded-lg p-6 mb-4">
                          <h3 className="font-semibold text-gray-900 mb-4">{roundName} Matchups</h3>
                          <div className="space-y-3">
                            {roundMatches.map((match, roundIndex) => {
                              const matchIndex = match.globalIndex; // Use global index for drag/drop
                              return (
                        <div key={match.id} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-sm font-semibold text-gray-500">Match {match.id}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                {/* Participant 1 */}
                                <div 
                                  className={`flex-1 bg-blue-50 p-3 rounded-lg border-2 border-transparent transition-all ${
                                    (match.participant1 && match.participant2 && tournament.format_type !== 'round_robin' && tournament.format_type !== 'league') 
                                      ? 'hover:border-blue-400 cursor-move' 
                                      : 'cursor-not-allowed opacity-75'
                                  }`}
                                  draggable={!!(match.participant1 && match.participant2 && tournament.format_type !== 'round_robin' && tournament.format_type !== 'league')}
                                  onDragStart={(e) => {
                                    if (match.participant1 && match.participant2) {
                                      e.dataTransfer.effectAllowed = 'move';
                                      e.dataTransfer.setData('application/json', JSON.stringify({
                                        matchIndex,
                                        position: 1,
                                        participant: match.participant1
                                      }));
                                      e.currentTarget.style.opacity = '0.5';
                                    }
                                  }}
                                  onDragEnd={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                  }}
                                  onDragOver={(e) => {
                                    // Only allow drop if match is complete (both participants filled)
                                    if (match.participant1 && match.participant2) {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = 'move';
                                      e.currentTarget.classList.add('ring-2', 'ring-amber-400');
                                    }
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.classList.remove('ring-2', 'ring-amber-400');
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('ring-2', 'ring-amber-400');
                                    
                                    // Don't allow dropping on matches with TBD
                                    if (!match.participant1 || !match.participant2) return;
                                    
                                    const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
                                    const { matchIndex: dragMatchIndex, position: dragPosition, participant: dragParticipant } = dragData;
                                    
                                    // Don't swap with itself
                                    if (dragMatchIndex === matchIndex && dragPosition === 1) return;
                                    
                                    // Get source match
                                    const sourceMatch = bracketPreview[dragMatchIndex];
                                    
                                    // VALIDATION: Prevent same player from playing against themselves
                                    const targetParticipant = match.participant1;
                                    const otherParticipantInTargetMatch = match.participant2;
                                    
                                    // Check if dragged participant would face themselves in target match
                                    if (dragParticipant.id === otherParticipantInTargetMatch.id) {
                                      alert('❌ Invalid swap: A player cannot play against themselves!');
                                      return;
                                    }
                                    
                                    // Check if target participant would face themselves in source match
                                    const otherParticipantInSourceMatch = dragPosition === 1 ? sourceMatch.participant2 : sourceMatch.participant1;
                                    if (targetParticipant.id === otherParticipantInSourceMatch.id) {
                                      alert('❌ Invalid swap: A player cannot play against themselves!');
                                      return;
                                    }
                                    
                                    // Both source and target must be complete (already checked above)
                                    // Swap participants
                                    const newBracket = [...bracketPreview];
                                    
                                    if (dragPosition === 1) {
                                      newBracket[dragMatchIndex].participant1 = targetParticipant;
                                    } else {
                                      newBracket[dragMatchIndex].participant2 = targetParticipant;
                                    }
                                    newBracket[matchIndex].participant1 = dragParticipant;
                                    
                                    setBracketPreview(newBracket);
                                  }}
                                >
                                  {match.participant1 ? (
                                    <div className="flex items-center gap-2">
                                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h4m0 0V4m0 4l-4 4m16-4h-4m0 0V4m0 4l4 4M4 16h4m0 0v4m0-4l-4-4m16 4h-4m0 0v4m0-4l4-4" />
                                      </svg>
                                      <div className="flex-1">
                                        <p className="font-semibold text-blue-900">{match.participant1.name}</p>
                                        <div className="flex items-center gap-2">
                                          <p className="text-xs text-blue-600">Seed {seeds.find(s => s.id === match.participant1.id)?.newSeed || '-'}</p>
                                          {match.participant1.isBye && (
                                            <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full font-semibold">BYE</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-gray-400 italic font-semibold">TBD</p>
                                  )}
                                </div>
                                
                                <span className="text-gray-400 font-bold text-lg">VS</span>
                                
                                {/* Participant 2 */}
                                <div 
                                  className={`flex-1 bg-orange-50 p-3 rounded-lg border-2 border-transparent transition-all ${
                                    (match.participant1 && match.participant2 && tournament.format_type !== 'round_robin' && tournament.format_type !== 'league') 
                                      ? 'hover:border-orange-400 cursor-move' 
                                      : 'cursor-not-allowed opacity-75'
                                  }`}
                                  draggable={!!(match.participant1 && match.participant2 && tournament.format_type !== 'round_robin' && tournament.format_type !== 'league')}
                                  onDragStart={(e) => {
                                    if (match.participant1 && match.participant2) {
                                      e.dataTransfer.effectAllowed = 'move';
                                      e.dataTransfer.setData('application/json', JSON.stringify({
                                        matchIndex,
                                        position: 2,
                                        participant: match.participant2
                                      }));
                                      e.currentTarget.style.opacity = '0.5';
                                    }
                                  }}
                                  onDragEnd={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                  }}
                                  onDragOver={(e) => {
                                    // Only allow drop if match is complete (both participants filled)
                                    if (match.participant1 && match.participant2) {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = 'move';
                                      e.currentTarget.classList.add('ring-2', 'ring-amber-400');
                                    }
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.classList.remove('ring-2', 'ring-amber-400');
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('ring-2', 'ring-amber-400');
                                    
                                    // Don't allow dropping on matches with TBD
                                    if (!match.participant1 || !match.participant2) return;
                                    
                                    const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
                                    const { matchIndex: dragMatchIndex, position: dragPosition, participant: dragParticipant } = dragData;
                                    
                                    // Don't swap with itself
                                    if (dragMatchIndex === matchIndex && dragPosition === 2) return;
                                    
                                    // Get source match
                                    const sourceMatch = bracketPreview[dragMatchIndex];
                                    
                                    // VALIDATION: Prevent same player from playing against themselves
                                    const targetParticipant = match.participant2;
                                    const otherParticipantInTargetMatch = match.participant1;
                                    
                                    // Check if dragged participant would face themselves in target match
                                    if (dragParticipant.id === otherParticipantInTargetMatch.id) {
                                      alert('❌ Invalid swap: A player cannot play against themselves!');
                                      return;
                                    }
                                    
                                    // Check if target participant would face themselves in source match
                                    const otherParticipantInSourceMatch = dragPosition === 1 ? sourceMatch.participant2 : sourceMatch.participant1;
                                    if (targetParticipant.id === otherParticipantInSourceMatch.id) {
                                      alert('❌ Invalid swap: A player cannot play against themselves!');
                                      return;
                                    }
                                    
                                    // Both source and target must be complete (already checked above)
                                    // Swap participants
                                    const newBracket = [...bracketPreview];
                                    
                                    if (dragPosition === 1) {
                                      newBracket[dragMatchIndex].participant1 = targetParticipant;
                                    } else {
                                      newBracket[dragMatchIndex].participant2 = targetParticipant;
                                    }
                                    newBracket[matchIndex].participant2 = dragParticipant;
                                    
                                    setBracketPreview(newBracket);
                                  }}
                                >
                                  {match.participant2 ? (
                                    <div className="flex items-center gap-2">
                                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h4m0 0V4m0 4l-4 4m16-4h-4m0 0V4m0 4l4 4M4 16h4m0 0v4m0-4l-4-4m16 4h-4m0 0v4m0-4l4-4" />
                                      </svg>
                                      <div className="flex-1">
                                        <p className="font-semibold text-orange-900">{match.participant2.name}</p>
                                        <div className="flex items-center gap-2">
                                          <p className="text-xs text-orange-600">Seed {seeds.find(s => s.id === match.participant2.id)?.newSeed || '-'}</p>
                                          {match.participant2.isBye && (
                                            <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full font-semibold">BYE</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-gray-400 italic font-semibold">TBD</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}

                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-primary-600">
                      <strong>✓ Ready to confirm:</strong> Matchups are set! You can still drag participants to swap them, or click "Confirm & Start Tournament" to proceed.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center mb-8">
                  <Loader className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Generating bracket preview...</p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Seeding
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!bracketPreview}
                  className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold text-lg"
                >
                  <Calendar className="w-6 h-6" />
                  Next: Schedule Matches
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Schedule Matches */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 3: Schedule Matches</h2>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
                <p className="text-sm text-blue-800 font-semibold mb-2">📅 Configure Tournament Schedule:</p>
                <p className="text-xs text-blue-700">Set the tournament dates, daily match limits, and time slots for all matches.</p>
              </div>

              {/* Tournament Date Range */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Tournament Start Date
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={scheduleConfig.startDate}
                      onChange={(e) => setScheduleConfig({...scheduleConfig, startDate: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Tournament will start on this date</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date <span className="text-gray-400">(Auto-calculated)</span>
                    </label>
                    <input
                      type="date"
                      value={optimalSchedule?.calculatedEndDate || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      {optimalSchedule ? `Calculated based on ${optimalSchedule.totalMatches} matches` : 'Will be calculated automatically'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Group Size Configuration removed - custom groups are mandatory for groups_knockout */}
              {false && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Group Configuration
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Participants Per Group <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="2"
                        max={participants.length}
                        value={scheduleConfig.groupSize}
                        onChange={(e) => setScheduleConfig({...scheduleConfig, groupSize: parseInt(e.target.value) || 2})}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          scheduleConfig.groupSize > participants.length ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {scheduleConfig.groupSize > participants.length ? (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-semibold">
                          <span>⚠️</span>
                          <span>Group size cannot exceed total participants ({participants.length})</span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">
                          Number of participants in each group (2-{participants.length})
                        </p>
                      )}
                    </div>
                    
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-purple-900 mb-2">📊 Group Calculation</p>
                      <div className="space-y-1 text-xs text-purple-700">
                        <p><strong>Total Participants:</strong> {participants.length}</p>
                        <p><strong>Group Size:</strong> {scheduleConfig.groupSize}</p>
                        <p><strong>Number of Groups:</strong> {Math.ceil(participants.length / scheduleConfig.groupSize)}</p>
                        <p className="text-purple-600 mt-2">
                          <strong>Note:</strong> Top 2 from each group advance to knockout stage
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Custom Groups Info */}
              {tournament.format_type === 'groups_knockout' && customGroupsForPreview && customGroupsForPreview.length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    ✓ Using Custom Groups
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {customGroupsForPreview.map((group, index) => (
                      <div key={group.id} className="bg-white border border-purple-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-purple-900 mb-2">{group.group_name}</p>
                        <div className="space-y-1 text-xs text-gray-700">
                          <p><strong>Participants:</strong> {group.participants.length}</p>
                          <p><strong>Matches:</strong> {(group.participants.length * (group.participants.length - 1)) / 2}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-xs text-purple-600 mt-4">
                    💡 Groups were configured in Step 1. Top 2 from each group will advance to knockout stage.
                  </p>
                </div>
              )}

              {/* Daily Schedule Configuration */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-500" />
                  Daily Schedule Configuration
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Matches Per Day
                    </label>
                    <input
                      type="text"
                      value={scheduleConfig.matchesPerDay}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string or valid numbers
                        if (value === '' || /^\d+$/.test(value)) {
                          setScheduleConfig({...scheduleConfig, matchesPerDay: value === '' ? '' : parseInt(value)});
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter number of matches per day"
                    />
                    {optimalSchedule && scheduleConfig.matchesPerDay > optimalSchedule.totalMatches && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>You only have {optimalSchedule.totalMatches} matches. System will use {optimalSchedule.actualMatchesPerDay} matches/day.</span>
                      </p>
                    )}
                    {(!optimalSchedule || scheduleConfig.matchesPerDay <= optimalSchedule.totalMatches) && (
                      <p className="text-xs text-gray-500 mt-1">Maximum number of matches per day</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Match Duration {tournament?.sport_name?.toLowerCase() === 'football' || tournament?.match_config?.break_duration ? '(including break)' : ''}
                    </label>
                    <input
                      type="text"
                      value={scheduleConfig.matchDuration}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string or valid numbers
                        if (value === '' || /^\d+$/.test(value)) {
                          setScheduleConfig({...scheduleConfig, matchDuration: value === '' ? '' : parseInt(value)});
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter match duration in minutes"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Duration in minutes for each match (Default: {tournament?.match_config?.estimated_duration || 'N/A'} min from tournament config)
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Break Between Matches (minutes)
                    </label>
                    <input
                      type="text"
                      value={scheduleConfig.breakBetweenMatches}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string or valid numbers
                        if (value === '' || /^\d+$/.test(value)) {
                          setScheduleConfig({...scheduleConfig, breakBetweenMatches: value === '' ? '' : parseInt(value)});
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter break duration (e.g., 10, 15, 20)"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Daily Time Slot
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={scheduleConfig.startTime}
                        onChange={(e) => setScheduleConfig({...scheduleConfig, startTime: e.target.value})}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={scheduleConfig.endTime}
                        onChange={(e) => setScheduleConfig({...scheduleConfig, endTime: e.target.value})}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Tournament operating hours</p>
                  </div>
                </div>
              </div>

              {/* Schedule Summary */}
              {optimalSchedule && (
                <div className="bg-gradient-to-r from-primary-50 to-primary-50 border-2 border-primary-200 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-primary-700 mb-3 flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    📊 Calculated Schedule Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-primary-500 font-medium">Total Matches</p>
                      <p className="text-2xl font-bold text-primary-700">{optimalSchedule.totalMatches}</p>
                    </div>
                    <div>
                      <p className="text-primary-500 font-medium">Tournament Days</p>
                      <p className="text-2xl font-bold text-primary-700">{optimalSchedule.daysNeeded}</p>
                      <p className="text-xs text-primary-500 mt-1">
                        {new Date(scheduleConfig.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(optimalSchedule.calculatedEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-primary-500 font-medium">Matches/Day</p>
                      <p className="text-2xl font-bold text-primary-700">{optimalSchedule.actualMatchesPerDay}</p>
                      {scheduleConfig.matchesPerDay > optimalSchedule.totalMatches && (
                        <p className="text-xs text-amber-600 mt-1">Auto-adjusted</p>
                      )}
                    </div>
                    <div>
                      <p className="text-primary-500 font-medium">Match Duration</p>
                      <p className="text-2xl font-bold text-primary-700">{scheduleConfig.matchDuration}m</p>
                      <p className="text-xs text-primary-500 mt-1">
                        +{scheduleConfig.breakBetweenMatches}m break
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-primary-200">
                    <p className="text-sm text-primary-600">
                      <strong>Daily Schedule:</strong> {scheduleConfig.startTime} - {scheduleConfig.endTime} 
                      {scheduleConfig.matchDuration && scheduleConfig.breakBetweenMatches && (
                        <span className="text-primary-500 ml-2">
                          ({optimalSchedule.actualMatchesPerDay} matches × {parseInt(scheduleConfig.matchDuration) + parseInt(scheduleConfig.breakBetweenMatches)}min = {optimalSchedule.actualMatchesPerDay * (parseInt(scheduleConfig.matchDuration) + parseInt(scheduleConfig.breakBetweenMatches))}min/day)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Matchups
                </button>
                <button
                  onClick={handleConfirmBrackets}
                  disabled={
                    generatingBrackets || 
                    !scheduleConfig.startDate || 
                    (tournament.format_type === 'groups_knockout' && scheduleConfig.groupSize > participants.length)
                  }
                  className="flex items-center gap-2 px-8 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 font-semibold text-lg"
                >
                  {generatingBrackets ? (
                    <>
                      <Loader className="w-6 h-6 animate-spin" />
                      Starting Tournament...
                    </>
                  ) : (
                    <>
                      <Play className="w-6 h-6" />
                      Confirm & Start Tournament
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchScheduling;
