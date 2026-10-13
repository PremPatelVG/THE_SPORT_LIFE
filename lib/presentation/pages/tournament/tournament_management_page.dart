import 'package:flutter/material.dart';
import '../../../widgets/app_drawer.dart';

class TournamentManagementPage extends StatelessWidget {
  final String tournamentId;
  
  const TournamentManagementPage({super.key, required this.tournamentId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tournament Management')),
      drawer: const AppDrawer(),
      body: Center(child: Text('Tournament Management Page - ID: $tournamentId')),
    );
  }
}
