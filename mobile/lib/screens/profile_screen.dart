import 'package:flutter/material.dart';
import 'auth_screen.dart';
import 'pro_screen.dart';

class ProfileScreen extends StatelessWidget {
  final String userEmail;
  const ProfileScreen({super.key, this.userEmail = 'john@example.com'});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF131315),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1F1F21),
        title: const Text(
          'Profile',
          style: TextStyle(
            color: Color(0xFFE4E2E4),
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Profile card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF0A192F),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  // Avatar
                  const CircleAvatar(
                    radius: 40,
                    backgroundColor: Color(0xFF39393B),
                    child: Text(
                      'P',
                      style: TextStyle(
                        color: Color(0xFFE4E2E4),
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'AssetsX',
                    style: TextStyle(
                      color: Color(0xFFE4E2E4),
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    userEmail,
                    style: const TextStyle(
                      color: Color(0xFFC5C6CD),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Menu items
            _menuItem(
              icon: Icons.star,
              label: 'Upgrade to Pro',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const ProScreen(),
                  ),
                );
              },
              highlight: true,
            ),

            _menuItem(
              icon: Icons.person_outline,
              label: 'Edit Profile',
              onTap: () {},
            ),

            _menuItem(
              icon: Icons.notifications_outlined,
              label: 'Notifications',
              onTap: () {},
            ),

            _menuItem(
              icon: Icons.security_outlined,
              label: 'Security',
              onTap: () {},
            ),

            _menuItem(
              icon: Icons.help_outline,
              label: 'Help & Support',
              onTap: () {},
            ),

            const SizedBox(height: 8),

            // Sign in button
            _menuItem(
              icon: Icons.login,
              label: 'Sign Out',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const AuthScreen(),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  // Reusable menu item widget
  Widget _menuItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool highlight = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: highlight
              ? const Color(0xFF0A192F)
              : const Color(0xFF1B1B1D),
          borderRadius: BorderRadius.circular(10),
          border: highlight
              ? Border.all(color: const Color(0xFFB9C7E4))
              : Border.all(color: const Color(0xFF1B1B1D)),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: highlight
                  ? const Color(0xFFB9C7E4)
                  : const Color(0xFFC5C6CD),
              size: 20,
            ),
            const SizedBox(width: 14),
            Text(
              label,
              style: TextStyle(
                color: highlight
                    ? const Color(0xFFB9C7E4)
                    : const Color(0xFFE4E2E4),
                fontSize: 15,
                fontWeight: FontWeight.w500,
              ),
            ),
            const Spacer(),
            const Icon(
              Icons.chevron_right,
              color: Color(0xFF8F9097),
              size: 18,
            ),
          ],
        ),
      ),
    );
  }
}