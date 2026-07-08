# AssetsX - Mobile App

AssetsX is a stock market tracking mobile application built with **Flutter**. It shows live stock prices, a portfolio overview, market news, and lets users track their watchlist - all powered by real-time data from the **Finnhub API**.

This is the **mobile app** half of the AssetsX project. The companion web app lives in [`../web`](../web), and the mobile app links directly to it from the Markets screen.

> Built as part of the Semester 4 **Frontend Designing** module.

---

## Features

- **Live stock data** - real-time prices and daily change percentages fetched from Finnhub for AAPL, MSFT, TSLA, NVDA, AMZN, and BTC
- **Home dashboard** - portfolio value, daily P/L, watchlist summary, and market status at a glance
- **Markets screen** - trending news and a live price table for all tracked symbols
- **Stock detail screen** - price chart, key statistics (market cap, P/E ratio, dividend yield, average volume), and Buy/Sell actions
- **Portfolio screen** - asset allocation breakdown
- **Location detection** - automatically detects and displays the user's country using GPS + OpenStreetMap reverse geocoding
- **Authentication flow** - sign in / sign up screen with email-based session
- **Pro upgrade screen** - subscription feature showcase
- **Web app integration** - one-tap link to the AssetsX web app from within the mobile app

---

## Screens

| Screen | Description |
|---|---|
| Auth | Sign in / sign up |
| Home | Portfolio summary, stats, and watchlist |
| Markets | News + live price table |
| Stock Detail | Price chart and key statistics |
| Portfolio | Asset allocation |
| Profile | User info and settings |
| Pro | Subscription upgrade |

---

## Tech Stack

| Package | Purpose |
|---|---|
| `http` | API requests to Finnhub and OpenStreetMap |
| `fl_chart` | Line charts for stock price history |
| `geolocator` | Device GPS location detection |
| `url_launcher` | Opens the companion web app in the browser |

**Platform support:** Android and iOS, both tested on physical/emulated devices.

---



## Running it

You need Flutter installed and a free [Finnhub](https://finnhub.io) API key. Replace `YOUR_FINNHUB_API_KEY` in the files under `lib/screens/`, then:

```bash
flutter pub get
flutter run
```

---

## Project Structure

```
assets_x/
├── lib/
│   ├── main.dart                  # App entry point, bottom navigation
│   └── screens/
│       ├── auth_screen.dart
│       ├── home_screen.dart
│       ├── markets_screen.dart
│       ├── stock_detail_screen.dart
│       ├── portfolio_screen.dart
│       ├── profile_screen.dart
│       └── pro_screen.dart
├── images/                        # App icon source
├── android/                       # Android platform config
├── ios/                           # iOS platform config
└── pubspec.yaml                   # Dependencies
```

---



