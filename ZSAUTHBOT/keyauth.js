const axios = require('axios');

// KeyAuth API config — set these in your .env
// KEYAUTH_SELLER_KEY = your seller key from KeyAuth dashboard
// KEYAUTH_APP_NAME   = your app name
// KEYAUTH_APP_SECRET = your app secret
// KEYAUTH_APP_VERSION = e.g. "1.0"

const SELLER_KEY = process.env.KEYAUTH_SELLER_KEY;
const APP_NAME   = process.env.KEYAUTH_APP_NAME;
const APP_SECRET = process.env.KEYAUTH_APP_SECRET;
const APP_VER    = process.env.KEYAUTH_APP_VERSION || '1.0';

const BASE_URL = 'https://keyauth.win/api/seller/';
const CLIENT_URL = 'https://keyauth.win/api/1.2/';

/**
 * Fetches all keys from KeyAuth for your app via Seller API.
 * Returns array of key objects: { key, uses, maxuses, ... }
 */
async function fetchAllKeys() {
  const res = await axios.get(BASE_URL, {
    params: {
      sellerkey: SELLER_KEY,
      type: 'fetchallkeys',
    }
  });

  if (!res.data.success) {
    throw new Error(`KeyAuth fetchallkeys failed: ${res.data.message}`);
  }

  // res.data.keys is array of { key, uses, maxuses, expiry, ... }
  return res.data.keys;
}

/**
 * Finds and returns a key that still has remaining uses (uses < maxuses).
 * Returns key string or null if none available.
 */
async function fetchAvailableKey() {
  const keys = await fetchAllKeys();

  // Filter keys that have uses remaining
  const available = keys.filter(k => {
    const uses = parseInt(k.uses) || 0;
    const maxuses = parseInt(k.maxuses) || 0;
    // maxuses of 0 usually means unlimited — treat as available
    return maxuses === 0 || uses < maxuses;
  });

  if (available.length === 0) return null;

  // Return the first available key string
  return available[0].key;
}

/**
 * Checks if a specific key has remaining uses by trying to init with it.
 * Returns true if valid/available, false if used up or invalid.
 */
async function checkKeyAvailable(key) {
  try {
    const params = new URLSearchParams({
      type: 'init',
      ver: APP_VER,
      name: APP_NAME,
      ownerid: await getOwnerId(),
    });

    const initRes = await axios.post(CLIENT_URL, params);
    if (!initRes.data.success) return false;

    const sessionid = initRes.data.sessionid;

    const loginParams = new URLSearchParams({
      type: 'license',
      key,
      sessionid,
      name: APP_NAME,
      ownerid: await getOwnerId(),
    });

    const loginRes = await axios.post(CLIENT_URL, loginParams);
    return loginRes.data.success === true;
  } catch {
    return false;
  }
}

// Cache ownerid so we don't re-fetch it constantly
let _ownerId = null;
async function getOwnerId() {
  if (_ownerId) return _ownerId;
  // ownerid is the same as your seller key for KeyAuth
  _ownerId = SELLER_KEY;
  return _ownerId;
}

/**
 * Main export: get an available key that has uses remaining.
 * Iterates through keys until one works.
 */
async function getAvailableKey() {
  const keys = await fetchAllKeys();

  for (const k of keys) {
    const uses    = parseInt(k.uses)    || 0;
    const maxuses = parseInt(k.maxuses) || 0;

    const hasUses = maxuses === 0 || uses < maxuses;
    if (hasUses) {
      return k.key;
    }
  }

  return null; // no keys with remaining uses
}

/**
 * Count of keys that still have remaining uses.
 */
async function getAvailableKeyCount() {
  const keys = await fetchAllKeys();
  return keys.filter(k => {
    const uses    = parseInt(k.uses)    || 0;
    const maxuses = parseInt(k.maxuses) || 0;
    return maxuses === 0 || uses < maxuses;
  }).length;
}

module.exports = { getAvailableKey, getAvailableKeyCount };
