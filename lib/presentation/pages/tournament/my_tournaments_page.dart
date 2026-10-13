import 'package:flutter/material.dart';
import '../../../widgets/app_drawer.dart';

class MyTournamentsPage extends StatelessWidget {
  const MyTournamentsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Tournaments')),
      drawer: const AppDrawer(),
      body: const Center(child: Text('My Tournaments Page - To be implemented')),
    );
  }
}
