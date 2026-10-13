import 'package:flutter/material.dart';
import '../../../widgets/app_drawer.dart';

class MyInvitationsPage extends StatelessWidget {
  const MyInvitationsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Invitations')),
      drawer: const AppDrawer(),
      body: const Center(child: Text('My Invitations Page - To be implemented')),
    );
  }
}
