import 'package:flutter/material.dart';
import '../../../widgets/app_drawer.dart';

class ChangePasswordPage extends StatelessWidget {
  const ChangePasswordPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Change Password')),
      drawer: const AppDrawer(),
      body: const Center(child: Text('Change Password Page - To be implemented')),
    );
  }
}
