import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:geolocator/geolocator.dart';
import 'stock_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // Variables for location
  String _country = 'Getting location...';

  // Variables for stock data
  List _stocks = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
    _getStockData();
  }

  // Returns greeting based on current time
  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  // Get location - same style as professor lecture screen_08
  Future<void> _getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (!mounted) return;
      setState(() { _country = 'Location disabled'; });
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (!mounted) return;
        setState(() { _country = 'Permission denied'; });
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      if (!mounted) return;
      setState(() { _country = 'Permission permanently denied'; });
      return;
    }

    try {
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      final url = Uri.parse(
        'https://nominatim.openstreetmap.org/reverse?format=json'
            '&lat=${position.latitude}&lon=${position.longitude}',
      );
      final response = await http.get(url, headers: {'User-Agent': 'AssetsX-App'});
      if (!mounted) return;
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() { _country = data['address']['country'] ?? 'Unknown'; });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() { _country = 'Germany'; });
    }
  }

  // Get stock data from API - fetches each symbol individually like markets_screen
  Future<void> _getStockData() async {
    // Symbol → full company name mapping
    final Map<String, String> symbolNames = {
      'AAPL': 'Apple Inc.',
      'TSLA': 'Tesla Inc.',
      'MSFT': 'Microsoft',
      'NVDA': 'NVIDIA Corp.',
      'AMZN': 'Amazon.com',
      'BTC-USD': 'Bitcoin',
    };

    List loadedStocks = [];

    for (var symbol in symbolNames.keys) {
      String url =
          'https://finnhub.io/api/v1/quote?symbol=$symbol&token=YOUR_FINNHUB_API_KEY';
      try {
        var response = await http.get(Uri.parse(url));
        if (response.statusCode == 200) {
          var data = json.decode(response.body);
          loadedStocks.add({
            'symbol': symbol == 'BTC-USD' ? 'BTC' : symbol,
            'name': symbolNames[symbol],
            'price': data['c'] ?? 0.0,
            'change': data['dp'] ?? 0.0,
          });
        }
      } catch (e) {
        print('Error fetching $symbol: $e');
      }
    }

    if (!mounted) return;

    if (loadedStocks.isEmpty) {
      _loadFallbackData();
      return;
    }

    setState(() {
      _stocks = loadedStocks;
      _isLoading = false;
    });
  }

  // Fallback data if API fails
  void _loadFallbackData() {
    if (!mounted) return;
    setState(() {
      _stocks = [
        {'symbol': 'AAPL', 'name': 'Apple Inc.', 'price': 173.50, 'change': 1.24},
        {'symbol': 'TSLA', 'name': 'Tesla Inc.', 'price': 212.80, 'change': -0.8},
        {'symbol': 'MSFT', 'name': 'Microsoft', 'price': 420.21, 'change': 0.85},
        {'symbol': 'BTC', 'name': 'Bitcoin', 'price': 64320.00, 'change': -2.10},
        {'symbol': 'NVDA', 'name': 'NVIDIA Corp.', 'price': 201.56, 'change': 0.57},
        {'symbol': 'AMZN', 'name': 'Amazon.com', 'price': 237.23, 'change': -0.32},
      ];
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1F1F21),
        title: const Text(
          'AssetsX',
          style: TextStyle(color: Color(0xFFE4E2E4), fontWeight: FontWeight.bold),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Row(
              children: [
                const Icon(Icons.location_on, color: Color(0xFFB9C7E4), size: 16),
                const SizedBox(width: 4),
                Text(_country, style: const TextStyle(color: Color(0xFFB9C7E4), fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
      backgroundColor: const Color(0xFF131315),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFB9C7E4)))
          : SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            // ── Greeting ──────────────────────────────────────
            Text(
              '${_getGreeting()}, John',
              style: const TextStyle(
                color: Color(0xFFE4E2E4),
                fontSize: 26,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Portfolio synced!',
              style: TextStyle(color: Color(0xFFC5C6CD), fontSize: 13),
            ),

            const SizedBox(height: 10),

            // ── 4 stat cards ──────────────────────────────────
            Row(
              children: [
                Expanded(child: _statCard('PORTFOLIO VALUE', '\$24,580', null, '+\$24,580.00 total')),
                const SizedBox(width: 10),
                Expanded(child: _statCard('DAILY P/L', '+\$580.00', true, '+2.4% today')),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _statCard('WATCHLIST', '${_stocks.length} assets', null, '4 alerts active')),
                const SizedBox(width: 10),
                Expanded(child: _marketStatusCard()),
              ],
            ),

            const SizedBox(height: 24),

            // ── Watchlist title ───────────────────────────────
            const Text(
              'Watchlist',
              style: TextStyle(
                color: Color(0xFFE4E2E4),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 12),

            // ── Stock list ────────────────────────────────────
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _stocks.length,
              itemBuilder: (context, index) {
                var stock = _stocks[index];
                bool isPositive = stock['change'] >= 0;

                return GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => StockDetailScreen(
                          symbol: stock['symbol'],
                          name: stock['name'],
                          price: stock['price'].toDouble(),
                          change: stock['change'].toDouble(),
                        ),
                      ),
                    );
                  },
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1F1F21),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF2A2A2C), width: 1),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: const Color(0xFF39393B),
                          child: Text(
                            stock['symbol'][0],
                            style: const TextStyle(
                              color: Color(0xFFE4E2E4),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                stock['symbol'],
                                style: const TextStyle(
                                  color: Color(0xFFE4E2E4),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                ),
                              ),
                              Text(
                                stock['name'],
                                style: const TextStyle(color: Color(0xFFC5C6CD), fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '\$${stock['price'].toStringAsFixed(2)}',
                              style: const TextStyle(
                                color: Color(0xFFE4E2E4),
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: isPositive
                                    ? const Color(0xFF4ADE80).withOpacity(0.12)
                                    : const Color(0xFFF87171).withOpacity(0.12),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                '${isPositive ? '+' : ''}${stock['change'].toStringAsFixed(2)}%',
                                style: TextStyle(
                                  color: isPositive
                                      ? const Color(0xFF4ADE80)
                                      : const Color(0xFFF87171),
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),

            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  // Stat card widget
  Widget _statCard(String label, String value, bool? isPositive, String? subtitle) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1F1F21),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF2A2A2C), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF8F9097),
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              color: isPositive == null
                  ? const Color(0xFFE4E2E4)
                  : isPositive
                  ? const Color(0xFF4ADE80)
                  : const Color(0xFFF87171),
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(color: Color(0xFF8F9097), fontSize: 11),
            ),
          ],
        ],
      ),
    );
  }

  // Market status card
  Widget _marketStatusCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1F1F21),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF2A2A2C), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'MARKET STATUS',
            style: TextStyle(
              color: Color(0xFF8F9097),
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: Color(0xFF4ADE80),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              const Text(
                'Open',
                style: TextStyle(
                  color: Color(0xFFE4E2E4),
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            _country,
            style: const TextStyle(color: Color(0xFF8F9097), fontSize: 11),
          ),
        ],
      ),
    );
  }
}