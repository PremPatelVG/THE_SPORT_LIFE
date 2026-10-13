import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import toast from 'react-hot-toast';
import {
  Users,
  Trophy,
  ArrowLeft,
  Send,
  Search,
  X,
  UserPlus
} from 'lucide-react';

const CreatePair = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    sport_id: '',
    name: ''
  });
  
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSports();
  }, []);

  const fetchSports = async () => {
    try {
      const response = await api.get('/sports');
      setSports(response.data.data || []);
    } catch (error) {
      console.error('Error fetching sports:', error);
      toast.error('Failed to load sports');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.sport_id) {
      toast.error('Please select a sport');
      return;
    }
    
    if (!formData.name || formData.name.trim() === '') {
      toast.error('Please enter a pair name');
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.post('/pairs/create', {
        sport_id: formData.sport_id,
        name: formData.name
      });
      
      toast.success('Pair created successfully!');
      // Navigate to pair details to send invitations
      navigate(`/pairs/${response.data.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create pair');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/my-teams')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-2 shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                  Create Pair
                </h1>
                <p className="text-sm text-gray-600">Create a pair and invite players later</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          
          {/* Sport Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Trophy className="w-4 h-4 inline mr-2" />
              Select Sport *
            </label>
            <select
              value={formData.sport_id}
              onChange={(e) => setFormData({ ...formData, sport_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              <option value="">Choose a sport...</option>
              {sports.filter(sport => sport.category === 'racquet').map(sport => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pair Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Pair Name *
            </label>
            <input
              type="text"
              placeholder="Enter pair name (e.g., 'Team Thunder', 'Dynamic Duo')"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              You can invite players after creating the pair
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/my-teams')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.sport_id || !formData.name}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating Pair...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  Create Pair
                </>
              )}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Select the sport you want to create a pair for</li>
            <li>• Enter a name for your pair</li>
            <li>• Click "Create Pair" to create the pair</li>
            <li>• You'll be redirected to pair details page</li>
            <li>• From there, you can send invitations to players</li>
            <li>• Players will accept and join your pair</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default CreatePair;
