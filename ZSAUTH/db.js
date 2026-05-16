const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'claims.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

// Load DB
function load() {
  if (!fs.existsSync(DB_FILE)) return { claims: {} };
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { claims: {} };
  }
}

// Save DB
function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Check if user already claimed
function hasClaimed(userId) {
  const db = load();
  return !!db.claims[userId];
}

// Mark user as claimed
function markClaimed(userId, key) {
  const db = load();
  db.claims[userId] = { key, claimedAt: new Date().toISOString() };
  save(db);
}

// Reset a user's claim (admin use)
function resetClaim(userId) {
  const db = load();
  delete db.claims[userId];
  save(db);
}

// Get total number of claims
function getTotalClaims() {
  const db = load();
  return Object.keys(db.claims).length;
}

module.exports = { hasClaimed, markClaimed, resetClaim, getTotalClaims };
