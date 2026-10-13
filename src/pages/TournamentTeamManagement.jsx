import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  getAvailablePlayers,
  getTournamentTeams,
  createTournamentTeam,
  updateTournamentTeam,
  addTeamMember,
  addTeamMembersBulk,
  removeTeamMember,
  setTeamCaptain,
  lockTeam,
  unlockTeam,
  deleteTournamentTeam,
  getTournamentPairs,
  createPair,
  lockPair,
  unlockPair,
  deletePair,
  bulkLockTeams,
  bulkUnlockTeams,
  bulkLockPairs,
  bulkUnlockPairs
} from '../services/tournamentTeamService';
import { getTournament } from '../services/tournamentService';
import { getImageUrl, getUserInitials } from '../utils/imageUtils';
import {
  Users,
  Plus,
  Lock,
  Unlock,
  Trash2,
  UserCheck,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader,
  Edit,
  Eye,
  CheckSquare,
  Square
} from 'lucide-react';

import PlayerProfileModal from '../components/PlayerProfileModal';

const TournamentTeamManagement = () => {
  const { tournamentId } = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [editingTeam, setEditingTeam] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedPairs, setSelectedPairs] = useState([]);

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tournamentData, playersData] = await Promise.all([
        getTournament(tournamentId),
        getAvailablePlayers(tournamentId)
      ]);

      setTournament(tournamentData);
      setAvailablePlayers(playersData.available_players || []);

      if (tournamentData.category === 'teams') {
        const teamsData = await getTournamentTeams(tournamentId);
        setTeams(teamsData.teams || []);
      } else if (tournamentData.category === 'doubles') {
        const pairsData = await getTournamentPairs(tournamentId);
        setPairs(pairsData.pairs || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <Loader className="w-12 h-12 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
        <Navbar />
        <div className="text-center py-16">
          <p className="text-gray-600">Tournament not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
      <Navbar />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/tournaments/${tournamentId}/manage`)}
              className="p-2 hover:bg-primary-50 rounded-xl transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {tournament.category === 'teams' ? 'Team Management' : 
                 tournament.category === 'doubles' ? 'Pair Management' : 
                 'Player List'}
              </h1>
              <p className="text-sm text-gray-600">{tournament.name}</p>
            </div>
            {tournament.category !== 'singles' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                <Plus className="w-5 h-5" />
                {tournament.category === 'teams' ? 'Create Team' : 'Create Pair'}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Players */}
          <div className="lg:col-span-1">
            <AvailablePlayersList 
              players={availablePlayers}
              category={tournament?.category}
              onPlayerClick={(userId) => {
                setSelectedPlayerId(userId);
                setShowPlayerModal(true);
              }}
            />
          </div>

          {/* Teams/Pairs List */}
          <div className="lg:col-span-2">
            {tournament.category === 'teams' && (
              <TeamsList 
                teams={teams}
                onRefresh={loadData}
                selectedTeams={selectedTeams}
                setSelectedTeams={setSelectedTeams}
                tournamentId={tournamentId}
              />
            )}
            {tournament.category === 'doubles' && (
              <PairsList 
                pairs={pairs}
                onRefresh={loadData}
                selectedPairs={selectedPairs}
                setSelectedPairs={setSelectedPairs}
                tournamentId={tournamentId}
              />
            )}
            {tournament.category === 'singles' && (
              <SinglesPlayersList 
                players={availablePlayers}
              />
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && tournament.category === 'teams' && (
        <CreateTeamModal
          tournamentId={tournamentId}
          availablePlayers={availablePlayers}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadData}
        />
      )}
      {showCreateModal && tournament.category === 'doubles' && (
        <CreatePairModal
          tournamentId={tournamentId}
          availablePlayers={availablePlayers}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadData}
        />
      )}

      {/* Player Profile Modal */}
      {showPlayerModal && selectedPlayerId && (
        <PlayerProfileModal
          userId={selectedPlayerId}
          onClose={() => {
            setShowPlayerModal(false);
            setSelectedPlayerId(null);
          }}
        />
      )}
    </div>
  );
};

// Available Players Component
const AvailablePlayersList = ({ players, category, onPlayerClick }) => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
      <Users className="w-5 h-5 text-primary-500" />
      Available Players ({players.length})
    </h2>
    <div className="space-y-3 max-h-[600px] overflow-y-auto">
      {players.map((player) => (
        <div key={player.user_id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
          <div className="flex items-center gap-3">
            {/* Profile Picture */}
            <div className="relative w-10 h-10 flex-shrink-0">
              {player.profile_image ? (
                <img
                  src={getImageUrl(player.profile_image)}
                  alt={`${player.first_name} ${player.last_name}`}
                  className="w-10 h-10 rounded-full object-cover border-2 border-primary-200"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ display: player.profile_image ? 'none' : 'flex' }}
              >
                {getUserInitials(player.first_name, player.last_name)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-base truncate">
                {player.first_name} {player.last_name}
              </p>
              {player.sport_name && player.skill_level && (
                <span className="text-xs px-2 py-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-md font-medium inline-block mt-1.5 shadow-sm">
                  {player.sport_name} - {player.skill_level}
                </span>
              )}
            </div>
            {/* Eye Icon */}
            <button
              onClick={() => onPlayerClick && onPlayerClick(player.user_id)}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex-shrink-0"
              title="View player details"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
      {players.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          All players assigned
        </p>
      )}
    </div>
  </div>
);

// Teams List Component with Bulk Selection
const TeamsList = ({ teams, onRefresh, selectedTeams, setSelectedTeams, tournamentId }) => {
  const handleSelectAll = () => {
    if (selectedTeams.length === teams.length) {
      setSelectedTeams([]);
    } else {
      setSelectedTeams(teams.map(t => t.id));
    }
  };

  const handleToggleTeam = (teamId) => {
    if (selectedTeams.includes(teamId)) {
      setSelectedTeams(selectedTeams.filter(id => id !== teamId));
    } else {
      setSelectedTeams([...selectedTeams, teamId]);
    }
  };

  const handleBulkLock = async () => {
    if (selectedTeams.length === 0) {
      alert('Please select teams to lock');
      return;
    }
    if (!confirm(`Lock ${selectedTeams.length} selected teams?`)) return;
    
    try {
      const result = await bulkLockTeams(tournamentId, selectedTeams);
      alert(`Locked ${result.data.success.length} teams successfully!`);
      if (result.data.failed.length > 0) {
        alert(`Failed to lock ${result.data.failed.length} teams: ${result.data.failed.map(f => f.reason).join(', ')}`);
      }
      setSelectedTeams([]);
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to bulk lock teams');
    }
  };

  const handleBulkUnlock = async () => {
    if (selectedTeams.length === 0) {
      alert('Please select teams to unlock');
      return;
    }
    if (!confirm(`Unlock ${selectedTeams.length} selected teams?`)) return;
    
    try {
      const result = await bulkUnlockTeams(tournamentId, selectedTeams);
      alert(`Unlocked ${result.data.success.length} teams successfully!`);
      if (result.data.failed.length > 0) {
        alert(`Failed to unlock ${result.data.failed.length} teams: ${result.data.failed.map(f => f.reason).join(', ')}`);
      }
      setSelectedTeams([]);
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to bulk unlock teams');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          Teams ({teams.length})
          {selectedTeams.length > 0 && (
            <span className="ml-2 text-sm text-primary-600">
              ({selectedTeams.length} selected)
            </span>
          )}
        </h2>
        {teams.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
            >
              {selectedTeams.length === teams.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              {selectedTeams.length === teams.length ? 'Deselect All' : 'Select All'}
            </button>
            {selectedTeams.length > 0 && (
              <>
                <button
                  onClick={handleBulkLock}
                  className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 hover:bg-primary-200 rounded flex items-center gap-1"
                >
                  <Lock className="w-4 h-4" />
                  Lock Selected
                </button>
                <button
                  onClick={handleBulkUnlock}
                  className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded flex items-center gap-1"
                >
                  <Unlock className="w-4 h-4" />
                  Unlock Selected
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="space-y-4">
        {teams.map((team) => (
          <TeamCard 
            key={team.id} 
            team={team} 
            onRefresh={onRefresh}
            selected={selectedTeams.includes(team.id)}
            onToggleSelect={() => handleToggleTeam(team.id)}
          />
        ))}
        {teams.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No teams created yet
          </p>
        )}
      </div>
    </div>
  );
};

const TeamCard = ({ team, onRefresh, selected, onToggleSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const handleLock = async () => {
    if (!confirm('Lock this team? You cannot modify it after locking.')) return;
    try {
      await lockTeam(team.id);
      alert('Team locked successfully!');
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to lock team');
    }
  };

  const handleUnlock = async () => {
    if (!confirm('Unlock this team?')) return;
    try {
      await unlockTeam(team.id);
      alert('Team unlocked successfully!');
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to unlock team');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this team?')) return;
    try {
      await deleteTournamentTeam(team.id);
      alert('Team deleted successfully!');
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete team');
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${selected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
      <div className="flex items-center gap-3 mb-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
        />
        <div className="flex items-center justify-between flex-1">
          <h3 className="font-bold text-lg">{team.name}</h3>
          <div className="flex items-center gap-2">
            {team.status === 'locked' ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold flex items-center gap-1">
                <Lock className="w-4 h-4" />
                Locked
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                Draft
              </span>
            )}
          </div>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">
        Captain: {team.captain_first_name} {team.captain_last_name} | 
        Members: {team.member_count}
      </p>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          {expanded ? 'Hide' : 'Show'} Members
        </button>
        {team.status === 'draft' ? (
          <>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded flex items-center gap-1"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleLock}
              className="px-3 py-1 text-sm bg-primary-100 text-primary-600 hover:bg-primary-200 rounded flex items-center gap-1"
            >
              <Lock className="w-4 h-4" />
              Lock
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </>
        ) : (
          <button
            onClick={handleUnlock}
            className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded flex items-center gap-1"
          >
            <Unlock className="w-4 h-4" />
            Unlock
          </button>
        )}
      </div>

      {expanded && team.members && (
        <div className="mt-4 space-y-2">
          {team.members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                {/* Profile Picture */}
                <div className="relative w-10 h-10 flex-shrink-0">
                  {member.profile_image ? (
                    <img
                      src={getImageUrl(member.profile_image)}
                      alt={`${member.first_name} ${member.last_name}`}
                      className="w-10 h-10 rounded-full object-cover border-2 border-primary-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ display: member.profile_image ? 'none' : 'flex' }}
                  >
                    {getUserInitials(member.first_name, member.last_name)}
                  </div>
                </div>
                <div>
                  <p className="font-medium">
                    {member.first_name} {member.last_name}
                    {member.is_captain && (
                      <span className="ml-2 text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                        Captain
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">{member.phone}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditModal && (
        <EditTeamModal
          team={team}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

// Pairs List Component
const PairsList = ({ pairs, onRefresh, selectedPairs, setSelectedPairs, tournamentId }) => {
  const handleSelectAll = () => {
    if (selectedPairs.length === pairs.length) {
      setSelectedPairs([]);
    } else {
      setSelectedPairs(pairs.map(p => p.id));
    }
  };

  const handleTogglePair = (pairId) => {
    if (selectedPairs.includes(pairId)) {
      setSelectedPairs(selectedPairs.filter(id => id !== pairId));
    } else {
      setSelectedPairs([...selectedPairs, pairId]);
    }
  };

  const handleBulkLock = async () => {
    if (selectedPairs.length === 0) {
      alert('Please select pairs to lock');
      return;
    }
    if (!confirm(`Lock ${selectedPairs.length} selected pairs?`)) return;
    
    try {
      const result = await bulkLockPairs(tournamentId, selectedPairs);
      alert(`Locked ${result.data.success.length} pairs successfully!`);
      if (result.data.failed.length > 0) {
        alert(`Failed to lock ${result.data.failed.length} pairs: ${result.data.failed.map(f => f.reason).join(', ')}`);
      }
      setSelectedPairs([]);
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to bulk lock pairs');
    }
  };

  const handleBulkUnlock = async () => {
    if (selectedPairs.length === 0) {
      alert('Please select pairs to unlock');
      return;
    }
    if (!confirm(`Unlock ${selectedPairs.length} selected pairs?`)) return;
    
    try {
      const result = await bulkUnlockPairs(tournamentId, selectedPairs);
      alert(`Unlocked ${result.data.success.length} pairs successfully!`);
      if (result.data.failed.length > 0) {
        alert(`Failed to unlock ${result.data.failed.length} pairs: ${result.data.failed.map(f => f.reason).join(', ')}`);
      }
      setSelectedPairs([]);
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to bulk unlock pairs');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          Pairs ({pairs.length})
          {selectedPairs.length > 0 && (
            <span className="ml-2 text-sm text-primary-600">
              ({selectedPairs.length} selected)
            </span>
          )}
        </h2>
        {pairs.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
            >
              {selectedPairs.length === pairs.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              {selectedPairs.length === pairs.length ? 'Deselect All' : 'Select All'}
            </button>
            {selectedPairs.length > 0 && (
              <>
                <button
                  onClick={handleBulkLock}
                  className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 hover:bg-primary-200 rounded flex items-center gap-1"
                >
                  <Lock className="w-4 h-4" />
                  Lock Selected
                </button>
                <button
                  onClick={handleBulkUnlock}
                  className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded flex items-center gap-1"
                >
                  <Unlock className="w-4 h-4" />
                  Unlock Selected
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="space-y-4">
        {pairs.map((pair) => (
          <PairCard 
            key={pair.id} 
            pair={pair} 
            onRefresh={onRefresh}
            selected={selectedPairs.includes(pair.id)}
            onToggleSelect={() => handleTogglePair(pair.id)}
          />
        ))}
        {pairs.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No pairs created yet
          </p>
        )}
      </div>
    </div>
  );
};

const PairCard = ({ pair, onRefresh, selected, onToggleSelect }) => {
  const handleLock = async () => {
    if (!confirm('Lock this pair?')) return;
    try {
      await lockPair(pair.id);
      alert('Pair locked successfully!');
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to lock pair');
    }
  };

  const handleUnlock = async () => {
    if (!confirm('Unlock this pair?')) return;
    try {
      await unlockPair(pair.id);
      alert('Pair unlocked!');
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to unlock pair');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this pair?')) return;
    try {
      await deletePair(pair.id);
      alert('Pair deleted!');
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete pair');
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${selected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
      <div className="flex items-center gap-3 mb-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
        />
        <div className="flex items-center justify-between flex-1">
          <h3 className="font-bold text-lg">{pair.name}</h3>
          {pair.status === 'locked' ? (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold flex items-center gap-1">
              <Lock className="w-4 h-4" />
              Locked
            </span>
          ) : (
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              Draft
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-gray-50 rounded">
          <div className="flex items-center gap-3">
            {/* Player 1 Profile Picture */}
            <div className="relative w-10 h-10 flex-shrink-0">
              {pair.player1_image ? (
                <img
                  src={getImageUrl(pair.player1_image)}
                  alt={`${pair.player1_first_name} ${pair.player1_last_name}`}
                  className="w-10 h-10 rounded-full object-cover border-2 border-purple-200"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ display: pair.player1_image ? 'none' : 'flex' }}
              >
                {getUserInitials(pair.player1_first_name, pair.player1_last_name)}
              </div>
            </div>
            <div>
              <p className="font-medium">{pair.player1_first_name} {pair.player1_last_name}</p>
              <p className="text-sm text-gray-600">{pair.player1_phone}</p>
            </div>
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <div className="flex items-center gap-3">
            {/* Player 2 Profile Picture */}
            <div className="relative w-10 h-10 flex-shrink-0">
              {pair.player2_image ? (
                <img
                  src={getImageUrl(pair.player2_image)}
                  alt={`${pair.player2_first_name} ${pair.player2_last_name}`}
                  className="w-10 h-10 rounded-full object-cover border-2 border-purple-200"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ display: pair.player2_image ? 'none' : 'flex' }}
              >
                {getUserInitials(pair.player2_first_name, pair.player2_last_name)}
              </div>
            </div>
            <div>
              <p className="font-medium">{pair.player2_first_name} {pair.player2_last_name}</p>
              <p className="text-sm text-gray-600">{pair.player2_phone}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {pair.status === 'draft' ? (
          <>
            <button
              onClick={handleLock}
              className="px-3 py-1 text-sm bg-primary-100 text-primary-600 hover:bg-primary-200 rounded flex items-center gap-1"
            >
              <Lock className="w-4 h-4" />
              Lock
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </>
        ) : (
          <button
            onClick={handleUnlock}
            className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded flex items-center gap-1"
          >
            <Unlock className="w-4 h-4" />
            Unlock
          </button>
        )}
      </div>
    </div>
  );
};

// Singles Players List
const SinglesPlayersList = ({ players }) => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <h2 className="text-lg font-bold text-gray-900 mb-4">
      Locked Players ({players.length})
    </h2>
    <div className="space-y-2">
      {players.map((player, index) => (
        <div key={player.user_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <span className="font-bold text-gray-400">#{index + 1}</span>
          <div className="flex-1">
            <p className="font-medium">{player.first_name} {player.last_name}</p>
            <p className="text-sm text-gray-600">{player.phone}</p>
          </div>
          {player.skill_level && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
              {player.skill_level}
            </span>
          )}
        </div>
      ))}
    </div>
  </div>
);

// Create Team Modal (simplified - will be in separate file)
const CreateTeamModal = ({ tournamentId, availablePlayers, onClose, onSuccess }) => {
  const [teamName, setTeamName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [captainId, setCaptainId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [viewingPlayerId, setViewingPlayerId] = useState(null);
  const [showViewPlayerModal, setShowViewPlayerModal] = useState(false);

  const handleCreate = async () => {
    if (!teamName.trim()) {
      alert('Please enter team name');
      return;
    }
    if (selectedPlayers.length === 0) {
      alert('Please select at least one player');
      return;
    }
    if (!captainId) {
      alert('Please select a captain');
      return;
    }

    try {
      setCreating(true);
      const team = await createTournamentTeam(tournamentId, { name: teamName });
      
      // Add all members in a single API call
      const members = selectedPlayers.map(playerId => ({
        user_id: playerId,
        is_captain: playerId === captainId
      }));
      
      await addTeamMembersBulk(team.id, members);

      alert('Team created successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Create Team</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Enter team name"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold">Select Players</label>
              <span className="text-sm font-semibold px-3 py-1 bg-primary-100 text-primary-600 rounded-full">
                {selectedPlayers.length} Selected
              </span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2 bg-gray-50">
              {availablePlayers.map((player) => (
                <div key={player.user_id} className="flex items-start gap-3 p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedPlayers.includes(player.user_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPlayers([...selectedPlayers, player.user_id]);
                      } else {
                        setSelectedPlayers(selectedPlayers.filter(id => id !== player.user_id));
                        if (captainId === player.user_id) setCaptainId(null);
                      }
                    }}
                    className="w-4 h-4 mt-1 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-base truncate">
                      {player.first_name} {player.last_name}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {player.sport_name && player.skill_level && (
                        <span className="text-xs px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md font-medium shadow-sm">
                          {player.sport_name} - {player.skill_level}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingPlayerId(player.user_id);
                      setShowViewPlayerModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex-shrink-0"
                    title="View player details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {selectedPlayers.length > 0 && (
            <div>
              <label className="block text-sm font-semibold mb-2">Select Captain</label>
              <select
                value={captainId || ''}
                onChange={(e) => setCaptainId(Number(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">Choose captain...</option>
                {selectedPlayers.map((playerId) => {
                  const player = availablePlayers.find(p => p.user_id === playerId);
                  return (
                    <option key={playerId} value={playerId}>
                      {player.first_name} {player.last_name} {player.sport_name && player.skill_level ? `(${player.sport_name} - ${player.skill_level})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
        <div className="p-6 border-t flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            disabled={creating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </div>

      {/* Player Profile Modal */}
      {showViewPlayerModal && viewingPlayerId && (
        <PlayerProfileModal
          userId={viewingPlayerId}
          onClose={() => {
            setShowViewPlayerModal(false);
            setViewingPlayerId(null);
          }}
        />
      )}
    </div>
  );
};

// Create Pair Modal
const CreatePairModal = ({ tournamentId, availablePlayers, onClose, onSuccess }) => {
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [pairName, setPairName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!player1 || !player2) {
      alert('Please select both players');
      return;
    }
    if (player1 === player2) {
      alert('Cannot pair a player with themselves');
      return;
    }

    try {
      setCreating(true);
      await createPair(tournamentId, {
        player1_id: Number(player1),
        player2_id: Number(player2),
        name: pairName || undefined
      });
      alert('Pair created successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create pair');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Create Pair</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Player 1</label>
            <select
              value={player1}
              onChange={(e) => setPlayer1(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">Select player...</option>
              {availablePlayers.map((player) => (
                <option key={player.user_id} value={player.user_id}>
                  {player.first_name} {player.last_name} {player.sport_name && player.skill_level ? `(${player.sport_name} - ${player.skill_level})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Player 2</label>
            <select
              value={player2}
              onChange={(e) => setPlayer2(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">Select player...</option>
              {availablePlayers.filter(p => p.user_id !== Number(player1)).map((player) => (
                <option key={player.user_id} value={player.user_id}>
                  {player.first_name} {player.last_name} {player.sport_name && player.skill_level ? `(${player.sport_name} - ${player.skill_level})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Pair Name (Optional)</label>
            <input
              type="text"
              value={pairName}
              onChange={(e) => setPairName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Auto-generated if empty"
            />
          </div>
        </div>
        <div className="p-6 border-t flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            disabled={creating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Pair'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit Team Modal Component
const EditTeamModal = ({ team, onClose, onSuccess }) => {
  const [teamName, setTeamName] = useState(team.name || '');
  const [description, setDescription] = useState(team.description || '');
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [captainId, setCaptainId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [viewingPlayerId, setViewingPlayerId] = useState(null);
  const [showViewPlayerModal, setShowViewPlayerModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Get available players
      const playersData = await getAvailablePlayers(team.tournament_id);
      setAvailablePlayers(playersData.available_players || []);
      
      // Set currently selected players from team members
      if (team.members && Array.isArray(team.members)) {
        const memberIds = team.members.map(m => m.user_id);
        setSelectedPlayers(memberIds);
        
        // Set current captain
        const captain = team.members.find(m => m.is_captain);
        if (captain) {
          setCaptainId(captain.user_id);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load player data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!teamName.trim()) {
      alert('Team name is required');
      return;
    }

    if (selectedPlayers.length === 0) {
      alert('Please select at least one player');
      return;
    }

    if (!captainId) {
      alert('Please select a captain');
      return;
    }

    try {
      setUpdating(true);
      
      // Update team details
      await updateTournamentTeam(team.id, {
        name: teamName.trim(),
        description: description.trim()
      });

      // Get current members
      const currentMemberIds = team.members ? team.members.map(m => m.user_id) : [];
      
      // Find members to remove (in current but not in selected)
      const membersToRemove = currentMemberIds.filter(id => !selectedPlayers.includes(id));
      
      // Find members to add (in selected but not in current)
      const membersToAdd = selectedPlayers.filter(id => !currentMemberIds.includes(id));
      
      // Remove members
      // console.log('Removing members:', membersToRemove);
      for (const userId of membersToRemove) {
        // console.log('Removing user:', userId, 'from team:', team.id);
        const result = await removeTeamMember(team.id, userId);
        // console.log('Remove result:', result);
      }
      
      // Add new members in a single API call
      if (membersToAdd.length > 0) {
        // console.log('Adding members:', membersToAdd);
        const members = membersToAdd.map(userId => ({
          user_id: userId,
          is_captain: userId === captainId
        }));
        await addTeamMembersBulk(team.id, members);
      }
      
      // Update captain if changed
      const currentCaptain = team.members?.find(m => m.is_captain);
      if (!currentCaptain || currentCaptain.user_id !== captainId) {
        // console.log('Updating captain to:', captainId);
        await setTeamCaptain(team.id, captainId);
      }

      alert('Team updated successfully!');
      onSuccess();
    } catch (error) {
      console.error('Update team error:', error);
      alert(error.response?.data?.message || 'Failed to update team');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8">
          <div className="flex items-center justify-center">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Combine available players with current team members
  const allPlayers = [...availablePlayers];
  if (team.members) {
    team.members.forEach(member => {
      if (!allPlayers.find(p => p.user_id === member.user_id)) {
        allPlayers.push({
          user_id: member.user_id,
          first_name: member.first_name,
          last_name: member.last_name,
          phone: member.phone,
          sport_name: member.sport_name,
          skill_level: member.skill_level
        });
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Edit Team</h2>
          <p className="text-sm text-gray-600 mt-1">Update team details and members</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Team Name *</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter team name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter team description"
              rows={3}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold">Select Players *</label>
              <span className="text-sm font-semibold px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                {selectedPlayers.length} Selected
              </span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2 bg-gray-50">
              {allPlayers.map((player) => (
                <div key={player.user_id} className="flex items-start gap-3 p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedPlayers.includes(player.user_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPlayers([...selectedPlayers, player.user_id]);
                      } else {
                        setSelectedPlayers(selectedPlayers.filter(id => id !== player.user_id));
                        if (captainId === player.user_id) setCaptainId(null);
                      }
                    }}
                    className="w-4 h-4 mt-1 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-base truncate">
                      {player.first_name} {player.last_name}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {player.sport_name && player.skill_level && (
                        <span className="text-xs px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md font-medium shadow-sm">
                          {player.sport_name} - {player.skill_level}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingPlayerId(player.user_id);
                      setShowViewPlayerModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex-shrink-0"
                    title="View player details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {allPlayers.length === 0 && (
                <p className="text-center text-gray-500 py-4">No players available</p>
              )}
            </div>
          </div>

          {selectedPlayers.length > 0 && (
            <div>
              <label className="block text-sm font-semibold mb-2">Select Captain *</label>
              <select
                value={captainId || ''}
                onChange={(e) => setCaptainId(Number(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose captain...</option>
                {selectedPlayers.map((playerId) => {
                  const player = allPlayers.find(p => p.user_id === playerId);
                  return player ? (
                    <option key={playerId} value={playerId}>
                      {player.first_name} {player.last_name} {player.sport_name && player.skill_level ? `(${player.sport_name} - ${player.skill_level})` : ''}
                    </option>
                  ) : null;
                })}
              </select>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> You can only edit unlocked teams. Lock the team when you're done making changes.
            </p>
          </div>
        </div>
        <div className="p-6 border-t flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            disabled={updating}
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={updating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {updating ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                Update Team
              </>
            )}
          </button>
        </div>
      </div>

      {/* Player Profile Modal */}
      {showViewPlayerModal && viewingPlayerId && (
        <PlayerProfileModal
          userId={viewingPlayerId}
          onClose={() => {
            setShowViewPlayerModal(false);
            setViewingPlayerId(null);
          }}
        />
      )}
    </div>
  );
};

export default TournamentTeamManagement;
