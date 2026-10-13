/**
 * MatchScheduling Component - Enhanced with Custom Groups Support
 * 
 * This is an enhanced version that includes custom groups functionality.
 * To integrate into existing MatchScheduling.jsx:
 * 
 * 1. Add the imports
 * 2. Add the state variables
 * 3. Add the checkCustomGroups function
 * 4. Add the custom groups UI section
 * 5. Update the generate brackets logic
 */

// ========== STEP 1: ADD IMPORTS ==========
import CustomGroupsManager from '../components/CustomGroupsManager';
import GroupStageDisplay from '../components/GroupStageDisplay';

// ========== STEP 2: ADD STATE VARIABLES ==========
// Add these to your existing state declarations
const [useCustomGroups, setUseCustomGroups] = useState(false);
const [customGroups, setCustomGroups] = useState([]);
const [customGroupsValidation, setCustomGroupsValidation] = useState(null);

// ========== STEP 3: ADD CHECK CUSTOM GROUPS FUNCTION ==========
const checkCustomGroups = async () => {
  try {
    const response = await api.get(`/tournaments/${tournamentId}/custom-groups`);
    const groups = response.data.data || [];
    
    if (groups.length > 0) {
      setCustomGroups(groups);
      setUseCustomGroups(true);
      
      // Fetch validation
      const validationResponse = await api.get(`/tournaments/${tournamentId}/custom-groups/validate`);
      setCustomGroupsValidation(validationResponse.data.data);
    } else {
      setUseCustomGroups(false);
      setCustomGroups([]);
      setCustomGroupsValidation(null);
    }
  } catch (error) {
    console.error('Error checking custom groups:', error);
    setUseCustomGroups(false);
  }
};

// ========== STEP 4: ADD USEEFFECT TO CHECK GROUPS ==========
// Add this useEffect after your existing useEffects
useEffect(() => {
  if (tournamentId && tournament?.format_type === 'groups_knockout') {
    checkCustomGroups();
  }
}, [tournamentId, tournament]);

// ========== STEP 5: ADD CUSTOM GROUPS UI SECTION ==========
// Add this in your render, after the seeding section and before schedule config

{tournament?.format_type === 'groups_knockout' && currentStep === 1 && (
  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">
          <Users className="w-6 h-6" />
          Group Configuration
        </h3>
        <p className="text-sm text-purple-700 mt-1">
          Choose how to organize participants into groups
        </p>
      </div>
      
      {/* Toggle Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (useCustomGroups && customGroups.length > 0) {
              if (!confirm('Switch to auto-generation? This will not delete your custom groups.')) {
                return;
              }
            }
            setUseCustomGroups(!useCustomGroups);
          }}
          className={`px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 ${
            useCustomGroups
              ? 'bg-purple-500 text-white shadow-lg'
              : 'bg-white text-purple-700 border-2 border-purple-300 hover:border-purple-400'
          }`}
        >
          {useCustomGroups ? '✓ Using Custom Groups' : 'Use Custom Groups'}
        </button>
      </div>
    </div>

    {/* Content */}
    {useCustomGroups ? (
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
    ) : (
      // Auto-Generation UI
      <div className="bg-white rounded-lg p-6 border-2 border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900">Automatic Group Generation</h4>
            <p className="text-sm text-gray-600">
              System will create equal-sized groups automatically
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Size
            </label>
            <input
              type="number"
              min="2"
              max={participants.length}
              value={scheduleConfig.groupSize}
              onChange={(e) => setScheduleConfig({
                ...scheduleConfig, 
                groupSize: parseInt(e.target.value) || 2
              })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                scheduleConfig.groupSize > participants.length 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-300'
              }`}
            />
            {scheduleConfig.groupSize > participants.length && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-semibold">
                <span>⚠️</span>
                <span>Group size cannot exceed total participants ({participants.length})</span>
              </p>
            )}
          </div>
          
          {/* Preview */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-purple-900 mb-2">📊 Group Calculation</p>
            <div className="space-y-1 text-xs text-purple-700">
              <p><strong>Total Participants:</strong> {participants.length}</p>
              <p><strong>Group Size:</strong> {scheduleConfig.groupSize}</p>
              <p><strong>Number of Groups:</strong> {Math.ceil(participants.length / scheduleConfig.groupSize)}</p>
              <p className="text-purple-600 mt-2">
                <strong>Note:</strong> Participants will be distributed evenly using snake seeding
              </p>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
)}

// ========== STEP 6: UPDATE GENERATE BRACKETS LOGIC ==========
// Replace your existing handleGenerateBrackets function with this:

const handleGenerateBrackets = async () => {
  try {
    setGeneratingBrackets(true);

    // Validate custom groups if using them
    if (tournament.format_type === 'groups_knockout' && useCustomGroups) {
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

    // Prepare schedule data
    const scheduleData = {
      start_date: scheduleConfig.startDate,
      matches_per_day: scheduleConfig.matchesPerDay,
      match_duration: scheduleConfig.matchDuration,
      break_between_matches: scheduleConfig.breakBetweenMatches,
      start_time: scheduleConfig.startTime,
      end_time: scheduleConfig.endTime
    };

    // Only send group_size if NOT using custom groups
    if (tournament.format_type === 'groups_knockout' && !useCustomGroups) {
      scheduleData.group_size = scheduleConfig.groupSize;
    }

    // console.log('Generating brackets with config:', scheduleData);
    // console.log('Using custom groups:', useCustomGroups);

    const response = await api.post(
      `/tournaments/${tournamentId}/generate-brackets`, 
      scheduleData
    );

    

    // Show success message
    alert('✅ Brackets generated successfully!');

    // Navigate to matches page
    navigate(`/tournaments/${tournamentId}/matches`);
    
  } catch (error) {
    console.error('Error generating brackets:', error);
    const message = error.response?.data?.message || 'Failed to generate brackets';
    alert(`❌ ${message}`);
    setGeneratingBrackets(false);
  }
};

// ========== STEP 7: ADD VALIDATION CHECK BEFORE GENERATE BUTTON ==========
// Update your generate button's disabled condition:

<button
  onClick={handleGenerateBrackets}
  disabled={
    generatingBrackets || 
    !scheduleConfig.startDate || 
    (tournament.format_type === 'groups_knockout' && !useCustomGroups && scheduleConfig.groupSize > participants.length) ||
    (tournament.format_type === 'groups_knockout' && useCustomGroups && !customGroupsValidation?.all_assigned)
  }
  className="flex items-center gap-2 px-8 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 font-semibold text-lg"
>
  {generatingBrackets ? (
    <>
      <Loader className="w-5 h-5 animate-spin" />
      Generating...
    </>
  ) : (
    <>
      <Play className="w-5 h-5" />
      Generate Brackets
    </>
  )}
</button>

// ========== ADDITIONAL: DISPLAY CUSTOM GROUPS IN PREVIEW ==========
// In your bracket preview section, add this for groups_knockout:

{tournament?.format_type === 'groups_knockout' && useCustomGroups && customGroups.length > 0 && (
  <div className="mb-6">
    <h4 className="text-lg font-bold text-gray-900 mb-4">Custom Groups Preview</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {customGroups.map((group) => (
        <div key={group.id} className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-bold text-purple-900">{group.group_name}</h5>
            <span className="text-xs font-semibold text-purple-700">
              {group.current_size} participants
            </span>
          </div>
          <div className="space-y-2">
            {group.participants.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <img
                  src={p.profile_image || '/default-avatar.png'}
                  alt={p.participant_name}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-gray-900">{p.participant_name}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-purple-200 text-xs text-purple-700">
            <strong>Matches:</strong> {(group.current_size * (group.current_size - 1)) / 2}
          </div>
        </div>
      ))}
    </div>
  </div>
)}

/**
 * INTEGRATION COMPLETE!
 * 
 * Your MatchScheduling component now supports:
 * ✅ Custom groups with drag-and-drop
 * ✅ Variable group sizes
 * ✅ Real-time validation
 * ✅ Backward compatibility with auto-generation
 * ✅ Visual feedback and previews
 * 
 * Next steps:
 * 1. Test custom group creation
 * 2. Test drag-and-drop assignment
 * 3. Test bracket generation with custom groups
 * 4. Test switching between custom and auto modes
 * 5. Verify matches display correctly by group
 */

export default MatchScheduling;
