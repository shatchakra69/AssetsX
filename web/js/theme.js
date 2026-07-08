// Light/dark mode — same localStorage persistence pattern as currency.js
const THEME_KEY = 'assetsx_theme';

// Read the saved theme, defaulting to dark (the app's original look)
export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

// Save the chosen theme and apply it right away
export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
}
