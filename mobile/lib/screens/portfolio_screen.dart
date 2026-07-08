import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

class PortfolioScreen extends StatelessWidget {
  const PortfolioScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Holdings data
    final List holdings = [
      {
        'symbol': 'AAPL',
        'name': 'Apple Inc. • 45 Shares',
        'value': '\$7,850.25',
        'change': 2.4,
      },
      {
        'symbol': 'AMZN',
        'name': 'Amazon.com • 12 Shares',
        'value': '\$1,620.00',
        'change': -0.8,
      },
      {
        'symbol': 'MSFT',
        'name': 'Microsoft Corp • 20 Shares',
        'value': '\$6,840.40',
        'change': 1.2,
      },
      {
        'symbol': 'BTC',
        'name': 'Bitcoin • 0.15 Coins',
        'value': '\$9,450.00',
        'change': 5.6,
      },
    ];

    return Scaffold(
      backgroundColor: const Color(0xFF131315),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1F1F21),
        title: const Text(
          'Portfolio',
          style: TextStyle(
            color: Color(0xFFE4E2E4),
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Total balance card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF0A192F),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  const Text(
                    'Total Balance',
                    style: TextStyle(
                      color: Color(0xFFC5C6CD),
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    '\$42,850',
                    style: TextStyle(
                      color: Color(0xFFB9C7E4),
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Asset Allocation',
                    style: TextStyle(
                      color: Color(0xFFC5C6CD),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Donut chart
            SizedBox(
              height: 200,
              child: PieChart(
                PieChartData(
                  sectionsSpace: 2,
                  centerSpaceRadius: 60,
                  sections: [
                    PieChartSectionData(
                      value: 50,
                      color: const Color(0xFFB9C7E4),
                      title: '50%',
                      titleStyle: const TextStyle(
                        color: Color(0xFF131315),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                      radius: 40,
                    ),
                    PieChartSectionData(
                      value: 30,
                      color: const Color(0xFF74829D),
                      title: '30%',
                      titleStyle: const TextStyle(
                        color: Color(0xFFE4E2E4),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                      radius: 40,
                    ),
                    PieChartSectionData(
                      value: 20,
                      color: const Color(0xFF515F78),
                      title: '20%',
                      titleStyle: const TextStyle(
                        color: Color(0xFFE4E2E4),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                      radius: 40,
                    ),
                  ],
                ),
              ),
            ),

            // Chart legend
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _legendItem(const Color(0xFFB9C7E4), 'Stocks'),
                const SizedBox(width: 16),
                _legendItem(const Color(0xFF74829D), 'ETFs'),
                const SizedBox(width: 16),
                _legendItem(const Color(0xFF515F78), 'Crypto'),
              ],
            ),

            const SizedBox(height: 24),

            // Current Holdings title
            const Text(
              'Current Holdings',
              style: TextStyle(
                color: Color(0xFFE4E2E4),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 12),

            // Holdings list
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: holdings.length,
              itemBuilder: (context, index) {
                var holding = holdings[index];
                bool isPositive = holding['change'] >= 0;

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0A192F),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      // Symbol circle
                      CircleAvatar(
                        backgroundColor: const Color(0xFF1F1F21),
                        child: Text(
                          holding['symbol'][0],
                          style: const TextStyle(
                            color: Color(0xFFE4E2E4),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Name
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              holding['symbol'],
                              style: const TextStyle(
                                color: Color(0xFFE4E2E4),
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            Text(
                              holding['name'],
                              style: const TextStyle(
                                color: Color(0xFFC5C6CD),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Value and change
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            holding['value'],
                            style: const TextStyle(
                              color: Color(0xFFE4E2E4),
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          Text(
                            '${isPositive ? '+' : ''}${holding['change']}%',
                            style: TextStyle(
                              color: isPositive
                                  ? const Color(0xFF4ADE80)
                                  : const Color(0xFFF87171),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),

            const SizedBox(height: 20),

            // Buy and Sell buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF44474D)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Sell',
                      style: TextStyle(
                        color: Color(0xFFE4E2E4),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFB9C7E4),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Buy',
                      style: TextStyle(
                        color: Color(0xFF233148),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // Legend item widget
  Widget _legendItem(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFFE4E2E4),
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}