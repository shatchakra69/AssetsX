import 'package:flutter/material.dart';

class ProScreen extends StatelessWidget {
  const ProScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF131315),
      appBar: AppBar(
        backgroundColor: const Color(0xFF131315),
        leading: IconButton(
          icon: const Icon(Icons.close, color: Color(0xFFE4E2E4)),
          onPressed: () {
            Navigator.pop(context);
          },
        ),
        title: const Text(
          'AssetsX',
          style: TextStyle(
            color: Color(0xFFE4E2E4),
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 24),

            // Icon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFF0A192F),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: const Color(0xFF44474D),
                ),
              ),
              child: const Icon(
                Icons.rocket_launch_outlined,
                color: Color(0xFFB9C7E4),
                size: 36,
              ),
            ),

            const SizedBox(height: 20),

            // Title
            const Text(
              'Unlock Advanced Trading',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFFE4E2E4),
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 12),

            // Subtitle
            const Text(
              'Elevate your portfolio with institutional-grade tools and real-time insights.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFFC5C6CD),
                fontSize: 16,
                height: 1.5,
              ),
            ),

            const SizedBox(height: 32),

            // Feature 1
            _featureRow(
              icon: Icons.bar_chart,
              title: 'Level 2 Market Data',
              subtitle: 'Deep order book visibility.',
            ),

            const SizedBox(height: 12),

            // Feature 2
            _featureRow(
              icon: Icons.memory,
              title: 'AI Trade Signals',
              subtitle: 'Predictive market trend alerts.',
            ),

            const SizedBox(height: 12),

            // Feature 3
            _featureRow(
              icon: Icons.percent,
              title: 'Zero Commission',
              subtitle: 'Trade without hidden fees.',
            ),

            const SizedBox(height: 32),

            // Start trial button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Starting free trial...'),
                      backgroundColor: Color(0xFF1F1F21),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFB9C7E4),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Start 30-Day Free Trial',
                  style: TextStyle(
                    color: Color(0xFF233148),
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // See all features
            TextButton(
              onPressed: () {},
              child: const Text(
                'See All Features',
                style: TextStyle(
                  color: Color(0xFFB9C7E4),
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Price note
            const Text(
              '\$14.99/month after trial. Cancel anytime.',
              style: TextStyle(
                color: Color(0xFF8F9097),
                fontSize: 12,
              ),
            ),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  // Reusable feature row widget
  Widget _featureRow({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0A192F),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFF44474D),
        ),
      ),
      child: Row(
        children: [
          // Icon circle
          Container(
            width: 48,
            height: 48,
            decoration: const BoxDecoration(
              color: Color(0xFF131315),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: const Color(0xFFB9C7E4),
              size: 22,
            ),
          ),
          const SizedBox(width: 16),
          // Text
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Color(0xFFE4E2E4),
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                subtitle,
                style: const TextStyle(
                  color: Color(0xFFC5C6CD),
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}