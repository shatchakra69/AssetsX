import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class StockDetailScreen extends StatefulWidget {
  final String symbol;
  final String name;
  final double price;
  final double change;

  const StockDetailScreen({
    super.key,
    required this.symbol,
    required this.name,
    required this.price,
    required this.change,
  });

  @override
  State<StockDetailScreen> createState() => _StockDetailScreenState();
}

class _StockDetailScreenState extends State<StockDetailScreen> {
  List<FlSpot> _chartSpots = [];
  bool _isLoading = true;
  String _selectedRange = '1M';

  // Key statistics
  String _marketCap = '2.85T';
  String _peRatio = '28.4';
  String _divYield = '0.55%';
  String _avgVol = '58.2M';

  @override
  void initState() {
    super.initState();
    _getChartData();
  }

  // Get chart data from API
  Future<void> _getChartData() async {
    String url =
        'https://finnhub.io/api/v1/stock/candle?symbol=${widget.symbol}'
        '&resolution=D&from=1700000000&to=1800000000&token=YOUR_FINNHUB_API_KEY';

    try {
      var response = await http.get(Uri.parse(url));

      if (!mounted) return;

      if (response.statusCode == 200) {
        var data = json.decode(response.body);
        if (data['c'] != null) {
          List prices = data['c'];
          List<FlSpot> spots = [];
          for (int i = 0; i < prices.length; i++) {
            spots.add(FlSpot(i.toDouble(), prices[i].toDouble()));
          }
          setState(() {
            _chartSpots = spots;
            _isLoading = false;
          });
          return;
        }
      }
    } catch (e) {
      print('Chart error: $e');
    }

    // Fallback chart data
    _loadFallbackChart();
  }

  void _loadFallbackChart() {
    if (!mounted) return;
    setState(() {
      _chartSpots = [
        const FlSpot(0, 165),
        const FlSpot(1, 168),
        const FlSpot(2, 172),
        const FlSpot(3, 169),
        const FlSpot(4, 174),
        const FlSpot(5, 171),
        const FlSpot(6, 173),
        const FlSpot(7, 176),
        const FlSpot(8, 173.5),
      ];
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    bool isPositive = widget.change >= 0;

    return Scaffold(
      backgroundColor: const Color(0xFF131315),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1F1F21),
        // Back button added automatically by Navigator
        title: Column(
          children: [
            Text(
              widget.symbol,
              style: const TextStyle(
                color: Color(0xFFE4E2E4),
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            Text(
              widget.name,
              style: const TextStyle(
                color: Color(0xFFC5C6CD),
                fontSize: 12,
              ),
            ),
          ],
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFFE4E2E4)),
          onPressed: () {
            Navigator.pop(context);
          },
        ),
      ),
      body: _isLoading
          ? const Center(
        child: CircularProgressIndicator(
          color: Color(0xFFB9C7E4),
        ),
      )
          : SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Price section
            Center(
              child: Column(
                children: [
                  Text(
                    '\$${widget.price.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: Color(0xFFE4E2E4),
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: isPositive
                          ? const Color(0xFF4ADE80).withOpacity(0.1)
                          : const Color(0xFFF87171).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${isPositive ? '+' : ''}${widget.change.toStringAsFixed(2)}%',
                      style: TextStyle(
                        color: isPositive
                            ? const Color(0xFF4ADE80)
                            : const Color(0xFFF87171),
                        fontSize: 14,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Time range buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: ['1D', '1W', '1M', '1Y', 'ALL'].map((range) {
                bool isSelected = _selectedRange == range;
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedRange = range;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? const Color(0xFFB9C7E4)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: const Color(0xFF8F9097),
                      ),
                    ),
                    child: Text(
                      range,
                      style: TextStyle(
                        color: isSelected
                            ? const Color(0xFF233148)
                            : const Color(0xFFC5C6CD),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 16),

            // Line chart
            Container(
              height: 200,
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF1F1F21),
                borderRadius: BorderRadius.circular(12),
              ),
              child: LineChart(
                LineChartData(
                  gridData: const FlGridData(show: false),
                  borderData: FlBorderData(show: false),
                  titlesData: const FlTitlesData(show: false),
                  lineBarsData: [
                    LineChartBarData(
                      spots: _chartSpots,
                      isCurved: true,
                      color: isPositive
                          ? const Color(0xFF4ADE80)
                          : const Color(0xFFF87171),
                      barWidth: 2,
                      dotData: const FlDotData(show: false),
                      belowBarData: BarAreaData(
                        show: true,
                        color: isPositive
                            ? const Color(0xFF4ADE80).withOpacity(0.1)
                            : const Color(0xFFF87171).withOpacity(0.1),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Key Statistics title
            const Text(
              'Key Statistics',
              style: TextStyle(
                color: Color(0xFFE4E2E4),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 12),

            // Stats grid - 2 columns
            Row(
              children: [
                Expanded(
                  child: _statCard('MARKET CAP', _marketCap),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _statCard('P/E RATIO', _peRatio),
                ),
              ],
            ),

            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: _statCard('DIV YIELD', _divYield),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _statCard('AVG VOL', _avgVol),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Buy and Sell buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(
                        color: Color(0xFF44474D),
                        width: 2,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Sell',
                      style: TextStyle(
                        color: Color(0xFFE4E2E4),
                        fontSize: 16,
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
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  // Reusable stat card widget
  Widget _statCard(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1F1F21),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFFC5C6CD),
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: Color(0xFFE4E2E4),
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}