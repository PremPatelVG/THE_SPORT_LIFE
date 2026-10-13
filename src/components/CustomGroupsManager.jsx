import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  GripVertical,
  X,
  Save,
  RefreshCw
} from 'lucide-react';
import api from '../config/api';

/**
 * CustomGroupsManager Component
 * Allows organizers to create custom groups with drag-and-drop participant assignment
 */
const CustomGroupsManager = ({ tournamentId, participants, onGroupsUpdated }) => {
  const [groups, setGroups] = useState([]);
  const [unassignedParticipants, setUnassignedParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedParticipant, setDraggedParticipant] = useState(null);
  const [draggedFromGroup, setDraggedFromGroup] = useState(null);
  const [validation, setValidation] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newGroups, setNewGroups] = useState([
    { name: 'Group A', max_participants: 4, selectedParticipants: [] }
  ]);

  useEffect(() => {
    if (tournamentId) {
      fetchCustomGroups();
    }
  }, [tournamentId]);

  const fetchCustomGroups = async () => {
    try {
      setLoading(true);
      
      // Fetch existing custom groups
      const groupsResponse = await api.get(`/tournaments/${tournamentId}/custom-groups`);
      const existingGroups = groupsResponse.data.data || [];
      
      if (existingGroups.length > 0) {
        setGroups(existingGroups);
        
        // Fetch unassigned participants
        const unassignedResponse = await api.get(`/tournaments/${tournamentId}/custom-groups/unassigned`);
        setUnassignedParticipants(unassignedResponse.data.data || []);
        
        // Fetch validation status
        const validationResponse = await api.get(`/tournaments/${tournamentId}/custom-groups/validate`);
        setValidation(validationResponse.data.data);
      } else {
        // No custom groups exist - show all participants as unassigned
        setGroups([]);
        setUnassignedParticipants(participants);
        setValidation({
          total_participants: participants.length,
          assigned_participants: 0,
          unassigned_participants: participants.length,
          all_assigned: false,
          ready_for_bracket_generation: false
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching custom groups:', error);
      setLoading(false);
      // Initialize with all participants unassigned
      setGroups([]);
      setUnassignedParticipants(participants);
    }
  };

  const handleCreateGroups = async () => {
    try {
      // Show confirmation dialog
      const confirmed = window.confirm(
        'Are you sure you want to create these groups?\n\n' +
        'You can edit them later using the Update button.'
      );
      
      if (!confirmed) {
        return;
      }
      
      setSaving(true);
      
      // Validate group names are unique
      const names = newGroups.map(g => g.name.trim());
      const uniqueNames = new Set(names);
      if (names.length !== uniqueNames.size) {
        alert('Group names must be unique!');
        setSaving(false);
        return;
      }
      
      // Check if any participants are selected
      const hasManualSelection = newGroups.some(g => g.selectedParticipants && g.selectedParticipants.length > 0);
      
      // Create groups (with or without auto-assign)
      const groupsToCreate = newGroups.map(g => ({
        name: g.name,
        max_participants: g.max_participants
      }));
      
      const response = await api.post(`/tournaments/${tournamentId}/custom-groups`, {
        groups: groupsToCreate,
        autoAssign: !hasManualSelection // Only auto-assign if no manual selection
      });
      
      const createdGroups = response.data.data;
      
      // If manual selection, assign selected participants to groups
      if (hasManualSelection) {
        const assignments = [];
        
        newGroups.forEach((group, index) => {
          const createdGroup = createdGroups[index];
          if (group.selectedParticipants && group.selectedParticipants.length > 0) {
            group.selectedParticipants.forEach(participantId => {
              assignments.push({
                group_id: createdGroup.id,
                participant_id: participantId
              });
            });
          }
        });
        
        if (assignments.length > 0) {
          await api.post(`/tournaments/${tournamentId}/custom-groups/assign`, {
            assignments
          });
        }
        
        alert(`✅ Groups created with ${assignments.length} participants assigned!\n\nYou can drag-and-drop to adjust positions if needed.`);
      } else {
        // Show auto-assign message
        if (response.data.auto_assigned) {
          alert('✅ Groups created and participants auto-assigned based on seed/ranking!\n\nYou can now drag-and-drop to adjust positions if needed.');
        }
      }
      
      // Refresh groups data
      await fetchCustomGroups();
      
      setShowCreateModal(false);
      setSaving(false);
      
      if (onGroupsUpdated) {
        onGroupsUpdated();
      }
    } catch (error) {
      console.error('Error creating groups:', error);
      alert(error.response?.data?.message || 'Failed to create groups');
      setSaving(false);
    }
  };

  const handleUpdateGroups = async () => {
    try {
      // Show confirmation dialog
      const confirmed = window.confirm(
        '⚠️ UPDATE GROUPS\n\n' +
        'This will:\n' +
        '- Delete all existing groups\n' +
        '- Create new groups with your updated configuration\n' +
        '- Re-assign participants based on your selection\n\n' +
        'Are you sure you want to update?'
      );
      
      if (!confirmed) {
        return;
      }
      
      setSaving(true);
      
      // Validate group names are unique
      const names = newGroups.map(g => g.name.trim());
      const uniqueNames = new Set(names);
      if (names.length !== uniqueNames.size) {
        alert('Group names must be unique!');
        setSaving(false);
        return;
      }
      
      // Validate no duplicate participant assignments across groups
      const allSelectedParticipants = [];
      newGroups.forEach((group, index) => {
        if (group.selectedParticipants && group.selectedParticipants.length > 0) {
          group.selectedParticipants.forEach(participantId => {
            if (allSelectedParticipants.includes(participantId)) {
              throw new Error(`Participant ID ${participantId} is assigned to multiple groups!`);
            }
            allSelectedParticipants.push(participantId);
          });
        }
      });
      
      // console.log('=== UPDATE GROUPS DEBUG ===');
      // console.log('New groups configuration:', newGroups);
      // console.log('All selected participants:', allSelectedParticipants);
      // console.log('Available participants:', participants.map(p => ({ id: p.id, name: p.name })));
      
      // Check if any participants are selected
      const hasManualSelection = newGroups.some(g => g.selectedParticipants && g.selectedParticipants.length > 0);
      
      // Update groups (delete + recreate)
      const groupsToUpdate = newGroups.map(g => ({
        name: g.name,
        max_participants: g.max_participants
      }));
      
      
      
      const response = await api.put(`/tournaments/${tournamentId}/custom-groups`, {
        groups: groupsToUpdate,
        autoAssign: !hasManualSelection
      });
      
      const updatedGroups = response.data.data;
      
      
      // If manual selection, assign selected participants to groups
      if (hasManualSelection) {
        const assignments = [];
        
        newGroups.forEach((group, index) => {
          const updatedGroup = updatedGroups[index];
          if (group.selectedParticipants && group.selectedParticipants.length > 0) {
            group.selectedParticipants.forEach(participantId => {
              // Validate participant exists
              const participantExists = participants.some(p => p.id === participantId);
              if (!participantExists) {
                console.error(`Participant ${participantId} not found in participants list!`);
                throw new Error(`Participant ID ${participantId} not found!`);
              }
              
              assignments.push({
                group_id: updatedGroup.id,
                participant_id: participantId
              });
            });
          }
        });
        
        
        
        if (assignments.length > 0) {
          await api.post(`/tournaments/${tournamentId}/custom-groups/assign`, {
            assignments
          });
        }
        
        alert(`✅ Groups updated with ${assignments.length} participants assigned!`);
      } else {
        if (response.data.auto_assigned) {
          alert('✅ Groups updated and participants auto-assigned!');
        }
      }
      
      // Refresh groups data
      await fetchCustomGroups();
      
      setShowUpdateModal(false);
      setSaving(false);
      
      if (onGroupsUpdated) {
        onGroupsUpdated();
      }
    } catch (error) {
      console.error('Error updating groups:', error);
      alert(error.response?.data?.message || 'Failed to update groups');
      setSaving(false);
    }
  };

  const handleDeleteGroups = async () => {
    if (!confirm('⚠️ WARNING: Are you sure you want to delete all groups?\n\nThis action will:\n- Delete all custom groups\n- Unassign all participants\n- Cannot be undone\n\nAre you sure?')) {
      return;
    }
    
    try {
      setSaving(true);
      await api.delete(`/tournaments/${tournamentId}/custom-groups`);
      
      setGroups([]);
      setUnassignedParticipants(participants);
      setValidation(null);
      setSaving(false);
      
      if (onGroupsUpdated) {
        onGroupsUpdated();
      }
    } catch (error) {
      console.error('Error deleting groups:', error);
      alert(error.response?.data?.message || 'Failed to delete groups');
      setSaving(false);
    }
  };

  const handleFixDuplicates = async () => {
    if (!confirm('🔧 FIX DUPLICATE ASSIGNMENTS\n\nThis will:\n- Find participants assigned to multiple groups\n- Keep only the first assignment for each participant\n- Remove duplicate assignments\n\nContinue?')) {
      return;
    }
    
    try {
      setSaving(true);
      const response = await api.post(`/tournaments/${tournamentId}/custom-groups/fix-duplicates`);
      
      alert(`✅ ${response.data.message}\n\nFixed: ${response.data.data.fixed} duplicate assignments\nParticipants affected: ${response.data.data.participants_affected}`);
      
      // Refresh groups data
      await fetchCustomGroups();
      
      setSaving(false);
      
      if (onGroupsUpdated) {
        onGroupsUpdated();
      }
    } catch (error) {
      console.error('Error fixing duplicates:', error);
      alert(error.response?.data?.message || 'Failed to fix duplicates');
      setSaving(false);
    }
  };

  const handleOpenUpdateModal = () => {
    // Pre-populate the form with existing groups
    const existingGroupsConfig = groups.map(group => ({
      name: group.group_name,
      max_participants: group.max_participants || 4,
      selectedParticipants: (group.participants || []).map(p => p.participant_id)
    }));
    
    // console.log('=== OPEN UPDATE MODAL DEBUG ===');
    // console.log('Existing groups from backend:', groups);
    // console.log('Mapped groups config:', existingGroupsConfig);
    // console.log('Available participants prop:', participants);
    
    // Validate that all selected participants exist in the participants list
    const allSelectedIds = existingGroupsConfig.flatMap(g => g.selectedParticipants || []);
    const participantIds = participants.map(p => p.id);
    const missingParticipants = allSelectedIds.filter(id => !participantIds.includes(id));
    
    if (missingParticipants.length > 0) {
      console.error('WARNING: Some selected participants are not in the participants list:', missingParticipants);
      alert(`⚠️ Warning: Some participants in groups (IDs: ${missingParticipants.join(', ')}) are not in the current participants list. This may cause issues.`);
    }
    
    setNewGroups(existingGroupsConfig.length > 0 ? existingGroupsConfig : [
      { name: 'Group A', max_participants: 4, selectedParticipants: [] }
    ]);
    setShowUpdateModal(true);
  };

  const handleDragStart = (e, participant, fromGroupId = null) => {
    setDraggedParticipant(participant);
    setDraggedFromGroup(fromGroupId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetGroupId) => {
    e.preventDefault();
    
    if (!draggedParticipant) return;
    
    try {
      // Check if dropping to same group
      if (draggedFromGroup === targetGroupId) {
        setDraggedParticipant(null);
        setDraggedFromGroup(null);
        return;
      }
      
      // Check group capacity
      const targetGroup = groups.find(g => g.id === targetGroupId);
      if (targetGroup.max_participants && targetGroup.current_size >= targetGroup.max_participants) {
        alert(`Group "${targetGroup.group_name}" is full (max: ${targetGroup.max_participants})`);
        setDraggedParticipant(null);
        setDraggedFromGroup(null);
        return;
      }
      
      // Assign participant to group
      await api.post(`/tournaments/${tournamentId}/custom-groups/assign`, {
        assignments: [
          { group_id: targetGroupId, participant_id: draggedParticipant.id }
        ]
      });
      
      // Refresh groups
      await fetchCustomGroups();
      
      setDraggedParticipant(null);
      setDraggedFromGroup(null);
      
      if (onGroupsUpdated) {
        onGroupsUpdated();
      }
    } catch (error) {
      console.error('Error assigning participant:', error);
      alert(error.response?.data?.message || 'Failed to assign participant');
      setDraggedParticipant(null);
      setDraggedFromGroup(null);
    }
  };

  const handleRemoveFromGroup = async (participantId, groupId) => {
    try {
      // Move participant back to unassigned by removing from group
      // We'll need to refresh after this
      await fetchCustomGroups();
      
      if (onGroupsUpdated) {
        onGroupsUpdated();
      }
    } catch (error) {
      console.error('Error removing participant:', error);
    }
  };

  const addNewGroupField = () => {
    const nextLetter = String.fromCharCode(65 + newGroups.length); // A, B, C, etc.
    setNewGroups([...newGroups, { name: `Group ${nextLetter}`, max_participants: 4, selectedParticipants: [] }]);
  };

  const removeGroupField = (index) => {
    if (newGroups.length === 1) {
      alert('At least one group is required');
      return;
    }
    setNewGroups(newGroups.filter((_, i) => i !== index));
  };

  const updateGroupField = (index, field, value) => {
    const updated = [...newGroups];
    updated[index][field] = value;
    setNewGroups(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        <span className="ml-3 text-gray-600">Loading groups...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Custom Groups Configuration</h3>
          <p className="text-sm text-gray-600 mt-1">
            Create groups and drag participants to assign them
          </p>
        </div>
        
        <div className="flex gap-2">
          {groups.length === 0 ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Groups
            </button>
          ) : (
            <button
              onClick={handleOpenUpdateModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Update Groups
            </button>
          )}
        </div>
      </div>

      {/* Validation Status */}
      {validation && (
        <div className={`p-4 rounded-lg border-2 ${
          validation.all_assigned 
            ? 'bg-green-50 border-green-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start gap-3">
            {validation.all_assigned ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className={`font-semibold ${
                validation.all_assigned ? 'text-green-900' : 'text-yellow-900'
              }`}>
                {validation.all_assigned ? 'All Participants Assigned ✓' : 'Assignment Incomplete'}
              </h4>
              <div className="mt-2 space-y-1 text-sm">
                <p className={validation.all_assigned ? 'text-green-700' : 'text-yellow-700'}>
                  <strong>Total Participants:</strong> {validation.total_participants}
                </p>
                <p className={validation.all_assigned ? 'text-green-700' : 'text-yellow-700'}>
                  <strong>Assigned:</strong> {validation.assigned_participants} | 
                  <strong className="ml-2">Unassigned:</strong> {validation.unassigned_participants}
                </p>
              </div>
              
              {/* Check for duplicate assignments */}
              {validation.unassigned_participants < 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded-lg">
                  <p className="text-sm text-red-800 font-semibold mb-2">
                    🚨 Duplicate Assignments Detected!
                  </p>
                  <p className="text-xs text-red-700 mb-3">
                    Some participants are assigned to multiple groups. This will cause issues with bracket generation.
                  </p>
                  <button
                    onClick={handleFixDuplicates}
                    disabled={saving}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    🔧 Fix Duplicates Now
                  </button>
                </div>
              )}
              
              {!validation.all_assigned && validation.unassigned_participants >= 0 && (
                <p className="mt-2 text-xs text-yellow-600 font-medium">
                  ⚠️ Please assign all participants to groups before generating brackets
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Groups Display */}
      {groups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, group.id)}
              className={`border-2 rounded-lg p-4 transition-all ${
                group.is_full 
                  ? 'border-gray-300 bg-gray-50' 
                  : 'border-purple-300 bg-white hover:border-purple-400 hover:shadow-md'
              }`}
            >
              {/* Group Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-bold text-gray-900">{group.group_name}</h4>
                  <p className="text-xs text-gray-500">
                    {group.current_size} / {group.max_participants || '∞'} participants
                  </p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  group.is_full 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {group.is_full ? 'Full' : 'Available'}
                </div>
              </div>

              {/* Participants List */}
              <div className="space-y-2 min-h-[100px]">
                {group.participants.length === 0 ? (
                  <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-sm text-gray-400">Drop participants here</p>
                  </div>
                ) : (
                  group.participants.map((participant) => (
                    <div
                      key={participant.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, participant, group.id)}
                      className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg cursor-move hover:bg-purple-100 transition-colors"
                    >
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <img
                        src={participant.profile_image || '/default-avatar.png'}
                        alt={participant.participant_name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="flex-1 text-sm font-medium text-gray-900">
                        {participant.participant_name}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Group Stats */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  <strong>Matches in group:</strong> {group.current_size > 1 ? (group.current_size * (group.current_size - 1)) / 2 : 0}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unassigned Participants section removed - participants are auto-assigned to groups */}

      {/* Update Groups Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Update Custom Groups</h3>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Note:</strong> Updating will delete existing groups and create new ones with your configuration.
                </p>
              </div>

              <div className="space-y-4">
                {newGroups.map((group, index) => {
                  const selectedInOtherGroups = newGroups
                    .filter((_, i) => i !== index)
                    .flatMap(g => g.selectedParticipants || []);
                  
                  const availableParticipants = participants.filter(
                    p => !selectedInOtherGroups.includes(p.id)
                  );
                  
                  return (
                    <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Group Name
                            </label>
                            <input
                              type="text"
                              value={group.name}
                              onChange={(e) => updateGroupField(index, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder="e.g., Group A"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Max Participants
                            </label>
                            <input
                              type="number"
                              min="2"
                              value={group.max_participants || ''}
                              onChange={(e) => updateGroupField(index, 'max_participants', parseInt(e.target.value) || null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder="e.g., 4"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Participants ({(group.selectedParticipants || []).length} selected)
                          </label>
                          
                          {/* Warning for hidden selected participants */}
                          {(() => {
                            const hiddenSelected = (group.selectedParticipants || []).filter(
                              id => !availableParticipants.some(p => p.id === id)
                            );
                            return hiddenSelected.length > 0 ? (
                              <div className="mb-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-800">
                                ⚠️ {hiddenSelected.length} selected participant(s) not visible (may be selected in other groups)
                              </div>
                            ) : null;
                          })()}
                          
                          <div className="border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto bg-white">
                            {availableParticipants.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-2">
                                All participants assigned to other groups
                              </p>
                            ) : (
                              availableParticipants.map((participant) => {
                                const isSelected = (group.selectedParticipants || []).includes(participant.id);
                                return (
                                  <label
                                    key={participant.id}
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-purple-50 transition-colors ${
                                      isSelected ? 'bg-purple-100' : ''
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const selected = group.selectedParticipants || [];
                                        if (e.target.checked) {
                                          if (group.max_participants && selected.length >= group.max_participants) {
                                            alert(`Group "${group.name}" is full (max: ${group.max_participants})`);
                                            return;
                                          }
                                          updateGroupField(index, 'selectedParticipants', [...selected, participant.id]);
                                        } else {
                                          updateGroupField(index, 'selectedParticipants', selected.filter(id => id !== participant.id));
                                        }
                                      }}
                                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-gray-900">{participant.name}</span>
                                    {participant.seed_number && (
                                      <span className="text-xs text-gray-500">(Seed {participant.seed_number})</span>
                                    )}
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeGroupField(index)}
                        disabled={newGroups.length === 1}
                        className="mt-8 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={addNewGroupField}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Group
                </button>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateGroups}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Update Groups
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Groups Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Create Custom Groups</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {newGroups.map((group, index) => {
                  // Get already selected participants from other groups
                  const selectedInOtherGroups = newGroups
                    .filter((_, i) => i !== index)
                    .flatMap(g => g.selectedParticipants || []);
                  
                  // Available participants for this group
                  const availableParticipants = participants.filter(
                    p => !selectedInOtherGroups.includes(p.id)
                  );
                  
                  return (
                    <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Group Name
                            </label>
                            <input
                              type="text"
                              value={group.name}
                              onChange={(e) => updateGroupField(index, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder="e.g., Group A"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Max Participants
                            </label>
                            <input
                              type="number"
                              min="2"
                              value={group.max_participants || ''}
                              onChange={(e) => updateGroupField(index, 'max_participants', parseInt(e.target.value) || null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder="e.g., 4"
                            />
                          </div>
                        </div>
                        
                        {/* Participant Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Participants ({(group.selectedParticipants || []).length} selected)
                          </label>
                          <div className="border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto bg-white">
                            {availableParticipants.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-2">
                                All participants assigned to other groups
                              </p>
                            ) : (
                              availableParticipants.map((participant) => {
                                const isSelected = (group.selectedParticipants || []).includes(participant.id);
                                return (
                                  <label
                                    key={participant.id}
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-purple-50 transition-colors ${
                                      isSelected ? 'bg-purple-100' : ''
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const selected = group.selectedParticipants || [];
                                        if (e.target.checked) {
                                          // Check capacity
                                          if (group.max_participants && selected.length >= group.max_participants) {
                                            alert(`Group "${group.name}" is full (max: ${group.max_participants})`);
                                            return;
                                          }
                                          updateGroupField(index, 'selectedParticipants', [...selected, participant.id]);
                                        } else {
                                          updateGroupField(index, 'selectedParticipants', selected.filter(id => id !== participant.id));
                                        }
                                      }}
                                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-gray-900">{participant.name}</span>
                                    {participant.seed_number && (
                                      <span className="text-xs text-gray-500">(Seed {participant.seed_number})</span>
                                    )}
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeGroupField(index)}
                        disabled={newGroups.length === 1}
                        className="mt-8 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={addNewGroupField}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Group
                </button>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroups}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Create Groups
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {groups.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Custom Groups Yet</h3>
          <p className="text-gray-600 mb-4">
            Create custom groups to manually organize participants
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Custom Groups
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomGroupsManager;
