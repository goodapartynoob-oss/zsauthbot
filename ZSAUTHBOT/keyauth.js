const fs = require('fs');
const path = require('path');

// FREE VERSION — reads username:password pairs from data/users.txt
// Format: one per line → username:password
// Example:
//   user1:pass1
//   user2:pass2

const USERS_FILE = path.join(__dirname, 'data', 'users.txt');
const USED_FILE  = path.join(__dirname, 'data', 'used_users.txt');

if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '');
if (!fs.existsSync(USED_FILE))  fs.writeFileSync(USED_FILE, '');

function getAllUsers() {
  return fs.readFileSync(USERS_FILE, 'utf8')
    .split('\n').map(l => l.trim()).filter(l => l.includes(':'));
}

function getUsedUsers() {
  return fs.readFileSync(USED_FILE, 'utf8')
    .split('\n').map(l => l.trim()).filter(l => l.length > 0);
}

// Returns { username, password } or null if none left
async function fetchUnusedUser() {
  const allUsers  = getAllUsers();
  const usedUsers = getUsedUsers();
  const available = allUsers.filter(u => !usedUsers.includes(u));
  if (available.length === 0) return null;

  const entry = available[0];
  fs.appendFileSync(USED_FILE, entry + '\n');

  const [username, ...rest] = entry.split(':');
  const password = rest.join(':'); // handle passwords that contain ':'
  return { username, password };
}

async function getUnusedUserCount() {
  const allUsers  = getAllUsers();
  const usedUsers = getUsedUsers();
  return allUsers.filter(u => !usedUsers.includes(u)).length;
}

module.exports = { fetchUnusedUser, getUnusedUserCount };
