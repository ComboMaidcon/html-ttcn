/* ── Shared utilities ── */

function formatDate(d) { return d.toISOString().split("T")[0]; }

// Handles half hours: 9.5 → "09:30", 25.5 → "01:30 (+1)"
function formatHour(h) {
  const hour = Math.floor(h);
  const mins = (h % 1 >= 0.4) ? "30" : "00";
  if (hour < 24) return `${String(hour).padStart(2,"0")}:${mins}`;
  return `0${hour - 24}:${mins} (+1)`;
}

function genId() { return Math.random().toString(36).slice(2,10); }
function todayStr() { return formatDate(new Date()); }
function parseLocalDate(str) {
  const [y,m,d] = str.split("-").map(Number);
  return new Date(y, m-1, d);
}

// Is a given date a weekend or holiday?
function isWeekend(dateStr) {
  const d = parseLocalDate(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

// Get price for room type based on date + start hour
// Returns price per hour (K)
const PRICING_TABLE = {
  // type: { weekday: [morning, evening], weekend: [morning, evening] }
  "small":          { weekday: [59,  89],  weekend: [65,  109] },
  "medium-classic": { weekday: [79,  109], weekend: [89,  129] },
  "medium-deluxe":  { weekday: [99,  135], weekend: [119, 169] },
  "big":            { weekday: [139, 219], weekend: [149, 249] },
  "cine":           { weekday: [75,  109], weekend: [89,  129] },
  "suite":          { weekday: [99,  135], weekend: [109, 159] },
};

function getRoomPrice(roomType, dateStr, startHour) {
  const table   = PRICING_TABLE[roomType];
  if (!table) return 0;
  const weekend = isWeekend(dateStr);
  const evening = startHour >= 17;
  const slot    = weekend ? table.weekend : table.weekday;
  return evening ? slot[1] : slot[0];
}
