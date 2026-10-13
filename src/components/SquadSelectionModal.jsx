import React, { useState, useEffect } from 'react';
import { X, Users, Save, CheckCircle, AlertCircle } from 'lucide-react';
import * as matchSquadService from '../services/matchSquadService';

const SquadSelectionModal = ({ isOpen, onClose, matchId, teamId, teamName, onSquadSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [positionPresets, setPositionPresets] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [error, setError] = useState(null);
  const [matchData, setMatchData] = useState(null);

  useEffect(() => {
    if (isOpen && matchId && teamId) {
      loadSquadData();
    }
  }, [isOpen, matchId, teamId]);

  const loadSquadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await matchSquadService.getTeamMembersForSquad(matchId, teamId);
      
      setTeamMembers(data.team_members || []);
      setPositionPresets(data.position_presets || []);
      setMatchData(data.match || null);
      
      // If existing squad, pre-populate
      if (data.existing_squad && data.existing_squad.length > 0) {
        setSelectedMembers(data.existing_squad.map(member => ({
          user_id: member.user_id,
          position_label: member.position_label,
          jersey_number: member.jersey_number,
          is_starting: member.is_starting,
          is_captain: member.is_captain,
          notes: member.notes
        })));
      } else {
        // Pre-select all members with default positions
        setSelectedMembers(data.team_members.map(member => ({
          user_id: member.user_id,
          position_label: member.position || null,
          jersey_number: member.jersey_number || null,
          is_starting: true,
          is_captain: member.is_captain || false,
          notes: null
        })));
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading squad data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load squad data');
      setLoading(false);
    }
  };

  const handleToggleMember = (userId) => {
    const isSelected = selectedMembers.some(m => m.user_id === userId);
    
    if (isSelected) {
      setSelectedMembers(selectedMembers.filter(m => m.user_id !== userId));
    } else {
      const member = teamMembers.find(m => m.user_id === userId);
      setSelectedMembers([...selectedMembers, {
        user_id: userId,
        position_label: member.position || null,
        jersey_number: member.jersey_number || null,
        is_starting: true,
        is_captain: member.is_captain || false,
        notes: null
      }]);
    }
  };

  const handlePositionChange = (userId, position) => {
    setSelectedMembers(selectedMembers.map(member =>
      member.user_id === userId
        ? { ...member, position_label: position }
        : member
    ));
  };

  const handleJerseyChange = (userId, jerseyNumber) => {
    setSelectedMembers(selectedMembers.map(member =>
      member.user_id === userId
        ? { ...member, jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null }
        : member
    ));
  };

  const handleToggleStarting = (userId) => {
    setSelectedMembers(selectedMembers.map(member =>
      member.user_id === userId
        ? { ...member, is_starting: !member.is_starting }
        : member
    ));
  };

  const handleSaveSquad = async () => {
    if (selectedMembers.length === 0) {
      setError('Please select at least one player');
      return;
    }

    // For football, validate minimum starting players
    if (matchData?.sport_name?.toLowerCase() === 'football' && matchData?.match_config?.players_per_side) {
      const requiredStarting = matchData.match_config.players_per_side;
      const startingCount = selectedMembers.filter(m => m.is_starting).length;
      
      if (startingCount < requiredStarting) {
        setError(`Football requires at least ${requiredStarting} starting players. You have selected ${startingCount}.`);
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      
      await matchSquadService.saveMatchSquad(matchId, teamId, selectedMembers);
      
      setSaving(false);
      
      if (onSquadSaved) {
        onSquadSaved();
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving squad:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save squad');
      setSaving(false);
    }
  };

  const getMemberInfo = (userId) => {
    return teamMembers.find(m => m.user_id === userId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">Select Squad</h2>
              <p className="text-blue-100 text-sm">{teamName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  <strong>Instructions:</strong> Select players for this match and assign their positions/labels. 
                  This information will be displayed on the match details page.
                </p>
                {matchData?.sport_name?.toLowerCase() === 'football' && matchData?.match_config?.players_per_side && (
                  <p className="text-orange-700 text-sm mt-2 font-semibold">
                    ⚽ <strong>Football Requirement:</strong> Minimum {matchData.match_config.players_per_side} starting players required. 
                    Additional players can be added as substitutes.
                  </p>
                )}
              </div>

              {/* Selected Count */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-gray-700 font-medium">
                    Selected: <span className="text-blue-600">{selectedMembers.length}</span> / {teamMembers.length}
                  </p>
                  {matchData?.sport_name?.toLowerCase() === 'football' && matchData?.match_config?.players_per_side && (
                    <p className="text-sm text-gray-600 mt-1">
                      Starting: <span className={`font-semibold ${
                        selectedMembers.filter(m => m.is_starting).length >= matchData.match_config.players_per_side
                          ? 'text-green-600'
                          : 'text-orange-600'
                      }`}>
                        {selectedMembers.filter(m => m.is_starting).length}
                      </span> / {matchData.match_config.players_per_side} (required) | 
                      Substitutes: <span className="text-blue-600">
                        {selectedMembers.filter(m => !m.is_starting).length}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (selectedMembers.length === teamMembers.length) {
                      setSelectedMembers([]);
                    } else {
                      setSelectedMembers(teamMembers.map(member => ({
                        user_id: member.user_id,
                        position_label: member.position || null,
                        jersey_number: member.jersey_number || null,
                        is_starting: true,
                        is_captain: member.is_captain || false,
                        notes: null
                      })));
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedMembers.length === teamMembers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Team Members List */}
              <div className="space-y-3">
                {teamMembers.map((member) => {
                  const isSelected = selectedMembers.some(m => m.user_id === member.user_id);
                  const selectedMember = selectedMembers.find(m => m.user_id === member.user_id);

                  return (
                    <div
                      key={member.user_id}
                      className={`border rounded-lg p-4 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleMember(member.user_id)}
                          className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />

                        {/* Player Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {member.first_name} {member.last_name}
                            </h3>
                            {member.is_captain && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                                Captain
                              </span>
                            )}
                          </div>

                          {isSelected && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                              {/* Position */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Position/Label
                                </label>
                                <select
                                  value={selectedMember?.position_label || ''}
                                  onChange={(e) => handlePositionChange(member.user_id, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="">Select Position</option>
                                  {positionPresets.map((preset) => (
                                    <option key={preset.id} value={preset.position_name}>
                                      {preset.position_name} {preset.position_code && `(${preset.position_code})`}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Jersey Number */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Jersey Number
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  value={selectedMember?.jersey_number || ''}
                                  onChange={(e) => handleJerseyChange(member.user_id, e.target.value)}
                                  placeholder={member.jersey_number || '#'}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>

                              {/* Starting/Substitute */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Status
                                </label>
                                <button
                                  onClick={() => handleToggleStarting(member.user_id)}
                                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    selectedMember?.is_starting
                                      ? 'bg-green-100 text-green-800 border border-green-300'
                                      : 'bg-gray-100 text-gray-700 border border-gray-300'
                                  }`}
                                >
                                  {selectedMember?.is_starting ? 'Starting' : 'Substitute'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveSquad}
            disabled={saving || loading || selectedMembers.length === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg font-medium transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Squad
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SquadSelectionModal;
