import 'package:flutter/material.dart';
import '../../../widgets/app_drawer.dart';

class TournamentDetailPage extends StatelessWidget {
  final String tournamentId;
  
  const TournamentDetailPage({super.key, required this.tournamentId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tournament Details')),
      drawer: const AppDrawer(),
      body: Center(child: Text('Tournament Detail Page - ID: $tournamentId')),
    );
  }
}
