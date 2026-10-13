import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import store from './store';
import { validateToken, setUser } from './store/slices/authSlice';
import ProtectedRoute from './components/ProtectedRoute';
import AuthRedirect from './components/AuthRedirect';
import LoginNew from './pages/LoginNew';
import RegisterNew from './pages/RegisterNew';
import CompleteProfile from './pages/CompleteProfile';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import CreateTournament from './pages/CreateTournament';
import EditTournament from './pages/EditTournament';
import MyTournaments from './pages/MyTournaments';
import MyRegistrations from './pages/MyRegistrations';
import TournamentManagement from './pages/TournamentManagement';
import TournamentManage from './pages/TournamentManage';
import TournamentInvitations from './pages/TournamentInvitations';
import InvitationDetails from './pages/InvitationDetails';
import TournamentTeamManagement from './pages/TournamentTeamManagement';
import MatchScheduling from './pages/MatchScheduling';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import CreateTeam from './pages/CreateTeam';
import MyTeams from './pages/MyTeams';
import MyInvitations from './pages/MyInvitations';
import MyPairs from './pages/MyPairs';
import CreatePair from './pages/CreatePair';
import PairDetails from './pages/PairDetails';
import MyRefereeRequests from './pages/MyRefereeRequests';
import Matches from './pages/Matches';
import MatchDetails from './pages/MatchDetails';
import RefereeLiveScoring from './pages/RefereeLiveScoring';
import LiveMatchView from './pages/LiveMatchView';
import MatchScoreHistory from './pages/MatchScoreHistory';
import TournamentStandings from './pages/TournamentStandings';
import ParticipantPerformance from './pages/ParticipantPerformance';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import TournamentApprovals from './pages/admin/TournamentApprovals';
import TournamentList from './pages/admin/TournamentList';
import AdminTournamentDetail from './pages/admin/TournamentDetail';
import AdminMatches from './pages/admin/AdminMatches';
import UserList from './pages/admin/UserList';
import AdminManagement from './pages/admin/AdminManagement';

// Public Pages
import PrivacyPolicy from './pages/PrivacyPolicy';
import Support from './pages/Support';

// Standalone Matches
import CreateStandaloneMatch from './pages/CreateStandaloneMatch';
import MyStandaloneMatches from './pages/MyStandaloneMatches';

// My Teams Page
import MyTeamsPage from './pages/MyTeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';

function AppContent() {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  useEffect(() => {
    // Validate token on app mount
    dispatch(validateToken());

    // Listen for auth:logout events from axios interceptor
    const handleLogout = () => {
      dispatch(setUser(null));
    };

    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, [dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
        <Toaster
          position="top-right"
          reverseOrder={false}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#363636',
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="tournaments/approvals" element={<TournamentApprovals />} />
            <Route path="tournaments" element={<TournamentList />} />
            <Route path="tournaments/:id" element={<AdminTournamentDetail />} />
            <Route path="matches" element={<AdminMatches />} />
            <Route path="users" element={<UserList />} />
            <Route path="admins" element={<AdminManagement />} />
          </Route>

          {/* Public Routes */}
          <Route path="/login" element={<LoginNew />} />
          <Route path="/register" element={<RegisterNew />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/support" element={<Support />} />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
          
          {/* Tournament Routes - Protected */}
          <Route
            path="/tournaments"
            element={
              <ProtectedRoute>
                <Tournaments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments/:id"
            element={
              <ProtectedRoute>
                <TournamentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments/:id/standings"
            element={
              <ProtectedRoute>
                <TournamentStandings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments/:tournamentId/participant/:participantId"
            element={
              <ProtectedRoute>
                <ParticipantPerformance />
              </ProtectedRoute>
            }
          />
          
          {/* Tournament Routes - Protected */}
          <Route
            path="/tournaments/create"
            element={
              <ProtectedRoute>
                <CreateTournament />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments/:id/edit"
            element={
              <ProtectedRoute>
                <EditTournament />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments/my-tournaments"
            element={
              <ProtectedRoute>
                <MyTournaments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments/:id/manage"
            element={
              <ProtectedRoute>
                <TournamentManage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments/my-registrations"
            element={
              <ProtectedRoute>
                <MyRegistrations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments/invitations"
            element={
              <ProtectedRoute>
                <TournamentInvitations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments/invitations/:id"
            element={
              <ProtectedRoute>
                <InvitationDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments/:tournamentId/teams"
            element={
              <ProtectedRoute>
                <TournamentTeamManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments/:id/match-scheduling"
            element={
              <ProtectedRoute>
                <MatchScheduling />
              </ProtectedRoute>
            }
          />
          
          {/* Matches Routes - Protected */}
          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <Matches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/:matchId"
            element={
              <ProtectedRoute>
                <MatchDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/:matchId/referee-scoring"
            element={
              <ProtectedRoute>
                <RefereeLiveScoring />
              </ProtectedRoute>
            }
          />
          <Route
            path="/referee/match/:matchId"
            element={
              <ProtectedRoute>
                <RefereeLiveScoring />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/:matchId/live"
            element={<LiveMatchView />}
          />
          <Route
            path="/matches/:matchId/history"
            element={<MatchScoreHistory />}
          />
          
          {/* Team Routes - Protected */}
          <Route
            path="/my-teams"
            element={
              <ProtectedRoute>
                <MyTeamsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams"
            element={
              <ProtectedRoute>
                <Teams />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams/:id"
            element={
              <ProtectedRoute>
                <TeamDetailPage />
              </ProtectedRoute>
            }
          />
          
          {/* Team Routes - Protected */}
          <Route
            path="/teams/create"
            element={
              <ProtectedRoute>
                <CreateTeam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams/my-teams"
            element={
              <ProtectedRoute>
                <MyTeams />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-invitations"
            element={
              <ProtectedRoute>
                <MyInvitations />
              </ProtectedRoute>
            }
          />
          
          {/* Pair Routes - Protected */}
          <Route
            path="/pairs"
            element={
              <ProtectedRoute>
                <MyPairs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pairs/create"
            element={
              <ProtectedRoute>
                <CreatePair />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pairs/:id"
            element={
              <ProtectedRoute>
                <PairDetails />
              </ProtectedRoute>
            }
          />
          
          {/* Referee Routes - Protected */}
          <Route
            path="/referee/requests"
            element={
              <ProtectedRoute>
                <MyRefereeRequests />
              </ProtectedRoute>
            }
          />
          
          {/* Standalone Matches Routes - Protected */}
          <Route
            path="/standalone-matches/create"
            element={
              <ProtectedRoute>
                <CreateStandaloneMatch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/standalone-matches/my-matches"
            element={
              <ProtectedRoute>
                <MyStandaloneMatches />
              </ProtectedRoute>
            }
          />
          
          {/* Default Route */}
          <Route path="/" element={<AuthRedirect to="/dashboard" />} />
          <Route path="*" element={<AuthRedirect to="/dashboard" />} />
        </Routes>
    </>
  );
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
}

export default App;
