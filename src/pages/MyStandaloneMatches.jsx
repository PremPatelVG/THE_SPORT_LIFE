import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { toast } from 'react-hot-toast';

const MyStandaloneMatches = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, scheduled, in_progress, completed

  useEffect(() => {
    fetchMatches();
  }, [filter]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const response = await api.get(`/standalone-matches/my-matches${params}`);
      setMatches(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (matchId) => {
    if (!window.confirm('Are you sure you want to delete this match?')) {
      return;
    }

    try {
      await api.delete(`/standalone-matches/${matchId}`);
      toast.success('Match deleted successfully');
      fetchMatches();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete match');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Standalone Matches</h1>
        <button
          onClick={() => navigate('/standalone-matches/create')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Create Match
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('scheduled')}
          className={`px-4 py-2 rounded ${filter === 'scheduled' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Scheduled
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-4 py-2 rounded ${filter === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          In Progress
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded ${filter === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Completed
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading matches...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No standalone matches found</p>
          <button
            onClick={() => navigate('/standalone-matches/create')}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Create Your First Match
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {matches.map(match => (
            <div key={match.id} className="border rounded-lg shadow p-4 hover:shadow-lg transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{match.sport_name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(match.status)}`}>
                      {match.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {match.category && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                        {match.category.toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    {match.match_date && (
                      <p>
                        <strong>Date:</strong> {new Date(match.match_date).toLocaleDateString()} 
                        {match.match_time && ` at ${match.match_time}`}
                      </p>
                    )}
                    {match.venue_name && (
                      <p><strong>Venue:</strong> {match.venue_name}</p>
                    )}
                    {match.court_name && (
                      <p><strong>Court:</strong> {match.court_name}</p>
                    )}
                    {match.referee_first_name && (
                      <p>
                        <strong>Referee:</strong> {match.referee_first_name} {match.referee_last_name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Created: {new Date(match.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  {match.status === 'scheduled' && match.referee_id && (
                    <button
                      onClick={() => navigate(`/referee/match/${match.id}`)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      Start Match
                    </button>
                  )}
                  
                  {match.status === 'in_progress' && (
                    <button
                      onClick={() => navigate(`/referee/match/${match.id}`)}
                      className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                    >
                      Continue Match
                    </button>
                  )}
                  
                  {match.status === 'completed' && (
                    <button
                      onClick={() => navigate(`/matches/${match.id}`)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      View Details
                    </button>
                  )}
                  
                  {match.status !== 'in_progress' && (
                    <button
                      onClick={() => handleDelete(match.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyStandaloneMatches;
