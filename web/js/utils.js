// Check if a price change string like "+1.25%" or "-0.44%" represents a gain.
// Defaults to true (green) when no value is given.
export function isTrendUp(changeText) {
  if (!changeText) return true;
  return !changeText.trim().startsWith("-");
}

// Return a small SVG sparkline — a simple up or down line used in the watchlist.
export function sparkline(isUp = true) {
  const upPoints = "0,24 14,18 25,20 38,9 51,13 62,4 74,8";
  const downPoints = "0,7 15,11 26,6 39,15 52,12 74,21";
  const points = isUp ? upPoints : downPoints;
  const color = isUp ? "var(--green)" : "var(--red)";

  return `
    <svg class="sparkline" viewBox="0 0 74 28" aria-hidden="true">
      <polyline class="line" style="stroke:${color}" points="${points}" />
    </svg>
  `;
}

// Convert a Unix timestamp to a human-readable "time ago" string.
// For example: 300 seconds ago becomes "5m ago".
export function formatTimeAgo(timestamp) {
  const secondsAgo = Math.floor(Date.now() / 1000 - timestamp);

  if (secondsAgo < 60) return "just now";

  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;

  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo}h ago`;

  const daysAgo = Math.floor(hoursAgo / 24);
  return `${daysAgo}d ago`;
}

// Show a short popup message at the bottom of the screen, then fade it out.
export function showToast(message) {
  const existingToast = document.querySelector(".toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  // Small delay before adding "visible" so the CSS fade-in transition plays
  setTimeout(() => toast.classList.add("visible"), 10);

  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 200);
  }, 2400);
}
