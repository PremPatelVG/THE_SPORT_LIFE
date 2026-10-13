import 'package:flutter/material.dart';
import '../../../widgets/app_drawer.dart';

class TournamentsPage extends StatelessWidget {
  const TournamentsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tournaments')),
      drawer: const AppDrawer(),
      body: const Center(child: Text('Tournaments Page - To be implemented')),
    );
  }
}
