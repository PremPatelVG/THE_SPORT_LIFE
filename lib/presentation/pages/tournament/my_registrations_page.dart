import 'package:flutter/material.dart';
import '../../../widgets/app_drawer.dart';

class MyRegistrationsPage extends StatelessWidget {
  const MyRegistrationsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Registrations')),
      drawer: const AppDrawer(),
      body: const Center(child: Text('My Registrations Page - To be implemented')),
    );
  }
}
