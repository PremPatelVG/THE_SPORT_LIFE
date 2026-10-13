import { useState, useEffect } from 'react';
import { X, Trophy, ArrowUp, ArrowDown, Shuffle, Save, AlertCircle, GripVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';

const SeedingModal = ({ tournament, participants, onClose, onSave }) => {
  const [seedingList, setSeedingList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    // Initialize seeding list from participants
    const sorted = [...participants].sort((a, b) => {
      // If seeds already assigned, sort by seed
      if (a.seed_number && b.seed_number) {
        return a.seed_number - b.seed_number;
      }
      // Otherwise sort by registration date
      return new Date(a.registration_date) - new Date(b.registration_date);
    });
    setSeedingList(sorted);
  }, [participants]);

  const moveUp = (index) => {
    if (index === 0) return;
    const newList = [...seedingList];
    [newList[index], newList[index - 1]] = [newList[index - 1], newList[index]];
    setSeedingList(newList);
  };

  const moveDown = (index) => {
    if (index === seedingList.length - 1) return;
    const newList = [...seedingList];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    setSeedingList(newList);
  };

  const randomize = () => {
    const shuffled = [...seedingList].sort(() => Math.random() - 0.5);
    setSeedingList(shuffled);
    toast.success('Seeds randomized');
  };

  // Drag and Drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
    // Add a slight opacity to the dragged item
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const newList = [...seedingList];
    const draggedItem = newList[draggedIndex];
    
    // Remove dragged item
    newList.splice(draggedIndex, 1);
    
    // Insert at new position
    newList.splice(dropIndex, 0, draggedItem);
    
    setSeedingList(newList);
    setDraggedIndex(null);
    setDragOverIndex(null);
    
    toast.success('Position updated');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Prepare seed assignments
      const seedAssignments = seedingList.map((participant, index) => ({
        participant_id: participant.id,
        seed_number: index + 1
      }));

      await onSave(seedAssignments);
      toast.success('Positions assigned successfully!');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to assign positions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Assign Draw Positions</h2>
              <p className="text-white/90 text-sm">
                Order participants for bracket placement (1 to {participants.length})
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 mx-6 mt-6 rounded-r-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">🎯 How to assign positions</p>
              <p className="mb-2">Positioning determines the bracket placement. Participants in positions 1-4 typically get better starting positions in the bracket.</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <GripVertical className="w-3 h-3" />
                  <strong>Drag & Drop</strong> to reorder
                </span>
                <span className="flex items-center gap-1">
                  <ArrowUp className="w-3 h-3" />
                  <ArrowDown className="w-3 h-3" />
                  Use arrows
                </span>
                <span className="flex items-center gap-1">
                  <Shuffle className="w-3 h-3" />
                  Or randomize
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-semibold">{seedingList.length}</span> participants to seed
          </div>
          <button
            onClick={randomize}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all"
          >
            <Shuffle className="w-4 h-4" />
            Randomize
          </button>
        </div>

        {/* Seeding List */}
        <div className="overflow-y-auto max-h-[calc(90vh-350px)] px-6 py-4">
          <div className="space-y-2">
            {seedingList.map((participant, index) => (
              <div
                key={participant.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-move ${
                  draggedIndex === index
                    ? 'bg-amber-50 border-amber-400 shadow-lg scale-105'
                    : dragOverIndex === index
                    ? 'bg-blue-50 border-blue-400 border-dashed'
                    : 'bg-gray-50 border-gray-200 hover:border-amber-300 hover:shadow-md'
                }`}
              >
                {/* Drag Handle */}
                <div className="flex-shrink-0 text-gray-400 hover:text-amber-600 transition-colors cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Seed Number */}
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-white font-bold text-lg">{index + 1}</span>
                </div>

                {/* Participant Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">
                    {participant.participant_name || 
                     participant.team_name ||
                     participant.pair_name ||
                     (participant.first_name && participant.last_name 
                       ? `${participant.first_name} ${participant.last_name}` 
                       : 'Unknown')}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    {participant.participant_type && (
                      <span className="capitalize">{participant.participant_type}</span>
                    )}
                    {(participant.user_email || participant.email) && (
                      <span>• {participant.user_email || participant.email}</span>
                    )}
                    {participant.member_count && (
                      <span>• {participant.member_count} members</span>
                    )}
                  </div>
                </div>

                {/* Move Controls */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className={`p-1.5 rounded-lg transition-all ${
                      index === 0
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === seedingList.length - 1}
                    className={`p-1.5 rounded-lg transition-all ${
                      index === seedingList.length - 1
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Seeds'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeedingModal;
