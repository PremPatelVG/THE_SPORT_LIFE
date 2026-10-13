import 'package:flutter/material.dart';
import '../../../widgets/app_drawer.dart';

class TeamsPage extends StatelessWidget {
  const TeamsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Teams')),
      drawer: const AppDrawer(),
      body: const Center(child: Text('Teams Page - To be implemented')),
    );
  }
}
