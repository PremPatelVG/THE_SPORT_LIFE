import 'package:flutter/material.dart';
import '../../../widgets/app_drawer.dart';

class CreateTeamPage extends StatelessWidget {
  const CreateTeamPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Team')),
      drawer: const AppDrawer(),
      body: const Center(child: Text('Create Team Page - To be implemented')),
    );
  }
}
