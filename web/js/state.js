// Shared data store — market rows, news, and user location are fetched once
// and saved here so every page can read them without making duplicate API calls.
export const appState = {
  marketRows: [],
  newsItems: [],
  userLocation: "Berlin, DE",

  // Set by the stock detail page so Buy/Sell buttons know which stock is being viewed
  currentStockSymbol: '',
  currentStockName: '',
  currentStockPrice: 0,

  // The signed-in user's Firestore profile — filled in by loadUserProfile() in main.js
  uid: '',
  userName: '',
  userWatchlist: [],
  userPlan: 'free',
  emailVerified: false,

  // The signed-in user's real holdings, loaded from Firestore by trade.js's loadPortfolio()
  portfolio: [],
};
