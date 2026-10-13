import 'package:go_router/go_router.dart';

// Auth pages
import '../../presentation/pages/auth/splash_page.dart';
import '../../presentation/pages/auth/login_page.dart';
import '../../presentation/pages/auth/otp_verification_page.dart';
import '../../presentation/pages/auth/register_page.dart';
import '../../presentation/pages/auth/change_password_page.dart';

// Profile pages
import '../../presentation/pages/profile/profile_setup_page.dart';

// Dashboard
import '../../presentation/pages/dashboard/dashboard_page.dart';

// Tournament pages
import '../../presentation/pages/tournament/tournaments_page.dart';
import '../../presentation/pages/tournament/tournament_detail_page.dart';
import '../../presentation/pages/tournament/create_tournament_page.dart';
import '../../presentation/pages/tournament/my_tournaments_page.dart';
import '../../presentation/pages/tournament/my_registrations_page.dart';
import '../../presentation/pages/tournament/tournament_management_page.dart';

// Team pages
import '../../presentation/pages/team/teams_page.dart';
import '../../presentation/pages/team/team_detail_page.dart';
import '../../presentation/pages/team/create_team_page.dart';
import '../../presentation/pages/team/my_teams_page.dart';
import '../../presentation/pages/team/my_invitations_page.dart';

class AppRouter {
  // Route Names
  // Auth Routes
  static const String splash = '/';
  static const String login = '/login';
  static const String register = '/register';
  static const String verifyOtp = '/verify-otp';
  static const String profileSetup = '/profile-setup';
  static const String changePassword = '/change-password';
  
  // Dashboard Routes
  static const String dashboard = '/dashboard';
  
  // Tournament Routes
  static const String tournaments = '/tournaments';
  static const String tournamentDetail = '/tournaments/:id';
  static const String createTournament = '/tournaments/create';
  static const String myTournaments = '/tournaments/my-tournaments';
  static const String myRegistrations = '/tournaments/my-registrations';
  static const String tournamentManagement = '/tournaments/:id/manage';
  
  // Team Routes
  static const String teams = '/teams';
  static const String teamDetail = '/teams/:id';
  static const String createTeam = '/teams/create';
  static const String myTeams = '/teams/my-teams';
  static const String myInvitations = '/my-invitations';
  
  // Helper methods for routes with parameters
  static String getVerifyOtpRoute(String phoneNumber) => '/verify-otp/$phoneNumber';
  static String getTournamentDetailRoute(String id) => '/tournaments/$id';
  static String getTournamentManagementRoute(String id) => '/tournaments/$id/manage';
  static String getTeamDetailRoute(String id) => '/teams/$id';

  static final GoRouter router = GoRouter(
    initialLocation: splash,
    routes: [
      // Splash Screen
      GoRoute(
        path: splash,
        builder: (context, state) => const SplashPage(),
      ),

      // Public Routes
      GoRoute(
        path: login,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '$verifyOtp/:phoneNumber',
        builder: (context, state) {
          final phoneNumber = state.pathParameters['phoneNumber']!;
          return OtpVerificationPage(phoneNumber: phoneNumber);
        },
      ),
      GoRoute(
        path: profileSetup,
        builder: (context, state) => const ProfileSetupPage(),
      ),
      GoRoute(
        path: register,
        builder: (context, state) => const RegisterPage(),
      ),

      // Protected Routes
      GoRoute(
        path: dashboard,
        builder: (context, state) => const DashboardPage(),
      ),

      GoRoute(
        path: changePassword,
        builder: (context, state) => const ChangePasswordPage(),
      ),

      // Tournament Routes
      GoRoute(
        path: tournaments,
        builder: (context, state) => const TournamentsPage(),
      ),
      GoRoute(
        path: tournamentDetail,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return TournamentDetailPage(tournamentId: id);
        },
      ),
      GoRoute(
        path: createTournament,
        builder: (context, state) => const CreateTournamentPage(),
      ),
      GoRoute(
        path: myTournaments,
        builder: (context, state) => const MyTournamentsPage(),
      ),
      GoRoute(
        path: tournamentManagement,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return TournamentManagementPage(tournamentId: id);
        },
      ),
      GoRoute(
        path: myRegistrations,
        builder: (context, state) => const MyRegistrationsPage(),
      ),

      // Team Routes
      GoRoute(
        path: teams,
        builder: (context, state) => const TeamsPage(),
      ),
      GoRoute(
        path: teamDetail,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return TeamDetailPage(teamId: id);
        },
      ),
      GoRoute(
        path: createTeam,
        builder: (context, state) => const CreateTeamPage(),
      ),
      GoRoute(
        path: myTeams,
        builder: (context, state) => const MyTeamsPage(),
      ),
      GoRoute(
        path: myInvitations,
        builder: (context, state) => const MyInvitationsPage(),
      ),
    ],
  );
}
