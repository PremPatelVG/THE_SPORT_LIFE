import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../cubits/auth/auth_cubit.dart';
import '../../cubits/auth/auth_state.dart';
import '../../../widgets/app_drawer.dart';
import '../../../core/router/app_router.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthCubit, AuthState>(
      builder: (context, state) {
        if (state is AuthUnauthenticated) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            context.go(AppRouter.login);
          });
          return const SizedBox();
        }

        return Scaffold(
          appBar: AppBar(
            title: const Text('Dashboard'),
          ),
          drawer: const AppDrawer(),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome to SportLife!',
                  style: Theme.of(context).textTheme.displaySmall,
                ),
                const SizedBox(height: 24),
                _buildQuickActions(context),
                const SizedBox(height: 24),
                _buildStatsCards(),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Actions',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 16),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          children: [
            _buildActionCard(
              context,
              'Create Tournament',
              Icons.add_circle,
              () => context.go(AppRouter.createTournament),
            ),
            _buildActionCard(
              context,
              'Create Team',
              Icons.group_add,
              () => context.go(AppRouter.createTeam),
            ),
            _buildActionCard(
              context,
              'View Tournaments',
              Icons.emoji_events,
              () => context.go(AppRouter.tournaments),
            ),
            _buildActionCard(
              context,
              'View Teams',
              Icons.groups,
              () => context.go(AppRouter.teams),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionCard(
    BuildContext context,
    String title,
    IconData icon,
    VoidCallback onTap,
  ) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 48, color: Theme.of(context).primaryColor),
              const SizedBox(height: 12),
              Text(
                title,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsCards() {
    return const Column(
      children: [
        // Add stats cards here
        Card(
          child: ListTile(
            leading: Icon(Icons.emoji_events),
            title: Text('My Tournaments'),
            trailing: Text('0', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          ),
        ),
        Card(
          child: ListTile(
            leading: Icon(Icons.groups),
            title: Text('My Teams'),
            trailing: Text('0', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          ),
        ),
      ],
    );
  }
}
