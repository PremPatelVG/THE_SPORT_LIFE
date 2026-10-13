import 'package:flutter/material.dart';
import '../../../widgets/app_drawer.dart';

class TeamDetailPage extends StatelessWidget {
  final String teamId;
  
  const TeamDetailPage({super.key, required this.teamId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Team Details')),
      drawer: const AppDrawer(),
      body: Center(child: Text('Team Detail Page - ID: $teamId')),
    );
  }
}
