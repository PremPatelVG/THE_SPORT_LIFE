import 'package:flutter/material.dart';
import '../../../widgets/app_drawer.dart';

class CreateTournamentPage extends StatelessWidget {
  const CreateTournamentPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Tournament')),
      drawer: const AppDrawer(),
      body: const Center(child: Text('Create Tournament Page - To be implemented')),
    );
  }
}
