import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
// import 'package:flutter_lucide/flutter_lucide.dart';
import '../presentation/cubits/auth/auth_cubit.dart';
import '../presentation/cubits/auth/auth_state.dart';
import '../core/router/app_router.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: BlocBuilder<AuthCubit, AuthState>(
        builder: (context, state) {
          final user = context.read<AuthCubit>().currentUser;
          
          return ListView(
            padding: EdgeInsets.zero,
            children: [
              UserAccountsDrawerHeader(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF059669), Color(0xFF0D9488)],
                  ),
                ),
                accountName: Text(user?.name ?? 'User'),
                accountEmail: Text(user?.email ?? ''),
                currentAccountPicture: CircleAvatar(
                  backgroundColor: Colors.white,
                  child: Text(
                    user?.name?.substring(0, 1).toUpperCase() ?? 'U',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF059669),
                    ),
                  ),
                ),
              ),
              ListTile(
                leading: const Icon(Icons.dashboard_outlined),
                title: const Text('Dashboard'),
                onTap: () {
                  context.go(AppRouter.dashboard);
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.person_outline),
                title: const Text('Profile'),
                onTap: () {
                  context.go(AppRouter.profileSetup);
                  Navigator.pop(context);
                },
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.emoji_events_outlined),
                title: const Text('Tournaments'),
                onTap: () {
                  context.go(AppRouter.tournaments);
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.checklist_outlined),
                title: const Text('My Tournaments'),
                onTap: () {
                  context.go(AppRouter.myTournaments);
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.assignment_outlined),
                title: const Text('My Registrations'),
                onTap: () {
                  context.go(AppRouter.myRegistrations);
                  Navigator.pop(context);
                },
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.groups_outlined),
                title: const Text('Teams'),
                onTap: () {
                  context.go(AppRouter.teams);
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.shield_outlined),
                title: const Text('My Teams'),
                onTap: () {
                  context.go(AppRouter.myTeams);
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.mail_outline),
                title: const Text('My Invitations'),
                onTap: () {
                  context.go(AppRouter.myInvitations);
                  Navigator.pop(context);
                },
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.lock_outline),
                title: const Text('Change Password'),
                onTap: () {
                  context.go(AppRouter.changePassword);
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.logout),
                title: const Text('Logout'),
                onTap: () {
                  context.read<AuthCubit>().logout();
                  Navigator.pop(context);
                },
              ),
            ],
          );
        },
      ),
    );
  }
}
