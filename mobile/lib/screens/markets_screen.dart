import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';
import 'stock_detail_screen.dart';

class MarketsScreen extends StatefulWidget {
  const MarketsScreen({super.key});

  @override
  State<MarketsScreen> createState() => _MarketsScreenState();
}

class _MarketsScreenState extends State<MarketsScreen> {

  List _stocks = [];
  bool _isLoading = true;

  // News data
  final List _news = [
    {
      'tag': 'Macro',
      'title': 'Fed Rates Update: Central Bank Hints at Pause',
      'time': '2h ago',
    },
    {
      'tag': 'Tech',
      'title': 'Tech Earnings: Major Players Beat Estimates',
      'time': '4h ago',
    },
    {
      'tag': 'Crypto',
      'title': 'Bitcoin Surges Past Key Resistance Level',
      'time': '6h ago',
    },
  ];

  @override
  void initState() {
    super.initState();
    _getStockData();
  }

  // Get stock data from API
  Future<void> _getStockData() async {
    // Symbol → full company name mapping
    final Map<String, String> symbolNames = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft',
      'TSLA': 'Tesla Inc.',
      'NVDA': 'NVIDIA Corp.',
      'AMZN': 'Amazon.com',
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
            'symbol': symbol,
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

    // Use fallback if API fails
    if (loadedStocks.isEmpty) {
      loadedStocks = [
        {'symbol': 'AAPL', 'name': 'Apple Inc.', 'price': 173.50, 'change': 1.24},
        {'symbol': 'MSFT', 'name': 'Microsoft', 'price': 420.21, 'change': 0.85},
        {'symbol': 'TSLA', 'name': 'Tesla Inc.', 'price': 175.22, 'change': -2.83},
        {'symbol': 'NVDA', 'name': 'NVIDIA Corp.', 'price': 1037.99, 'change': 2.18},
        {'symbol': 'AMZN', 'name': 'Amazon.com', 'price': 182.12, 'change': -0.44},
      ];
    }

    setState(() {
      _stocks = loadedStocks;
      _isLoading = false;
    });
  }

  // Open web app - using url_launcher package
  Future<void> _openWebApp() async {
    final Uri url = Uri.parse('https://assetsx-web.vercel.app');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1F1F21),
        title: const Text(
          'Markets',
          style: TextStyle(
            color: Color(0xFFE4E2E4),
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          // Open web app button
          TextButton(
            onPressed: _openWebApp,
            child: const Text(
              'Web App',
              style: TextStyle(color: Color(0xFFB9C7E4)),
            ),
          ),
        ],
      ),
      backgroundColor: const Color(0xFF131315),
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
            // Trending News section
            const Text(
              'Trending News',
              style: TextStyle(
                color: Color(0xFFE4E2E4),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 12),

            // News cards
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _news.length,
              itemBuilder: (context, index) {
                var item = _news[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0A192F),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      // Tag badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF394857),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          item['tag'],
                          style: const TextStyle(
                            color: Color(0xFFB8C8DA),
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Title
                      Expanded(
                        child: Text(
                          item['title'],
                          style: const TextStyle(
                            color: Color(0xFFE4E2E4),
                            fontSize: 14,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Time
                      Text(
                        item['time'],
                        style: const TextStyle(
                          color: Color(0xFFC5C6CD),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),

            const SizedBox(height: 24),

            // Live Market Prices section
            const Text(
              'Live Market Prices',
              style: TextStyle(
                color: Color(0xFFE4E2E4),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 12),

            // Stock table header
            const Row(
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    'Symbol',
                    style: TextStyle(color: Color(0xFFC5C6CD), fontSize: 12),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    'Price',
                    style: TextStyle(color: Color(0xFFC5C6CD), fontSize: 12),
                    textAlign: TextAlign.right,
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    'Change',
                    style: TextStyle(color: Color(0xFFC5C6CD), fontSize: 12),
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),

            const Divider(color: Color(0xFF44474D)),

            // Stock rows
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
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: const BoxDecoration(
                      border: Border(
                        bottom: BorderSide(color: Color(0xFF1F1F21)),
                      ),
                    ),
                    child: Row(
                      children: [
                        // Symbol
                        Expanded(
                          flex: 2,
                          child: Text(
                            stock['symbol'],
                            style: const TextStyle(
                              color: Color(0xFFB9C7E4),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        // Price
                        Expanded(
                          flex: 2,
                          child: Text(
                            '\$${stock['price'].toStringAsFixed(2)}',
                            style: const TextStyle(color: Color(0xFFE4E2E4)),
                            textAlign: TextAlign.right,
                          ),
                        ),
                        // Change
                        Expanded(
                          flex: 2,
                          child: Text(
                            '${isPositive ? '+' : ''}${stock['change'].toStringAsFixed(2)}%',
                            style: TextStyle(
                              color: isPositive
                                  ? const Color(0xFF4ADE80)
                                  : const Color(0xFFF87171),
                              fontWeight: FontWeight.bold,
                            ),
                            textAlign: TextAlign.right,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}