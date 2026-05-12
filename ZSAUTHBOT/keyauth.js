const axios = require('axios');
require('dotenv').config();

// KeyAuth Application Credentials from your dashboard
const APP_NAME    = process.env.KEYAUTH_APP_NAME;     // e.g. ZSCHEAT
const OWNER_ID    = process.env.KEYAUTH_OWNER_ID;     // Account Owner ID
const APP_SECRET  = process.env.KEYAUTH_APP_SECRET;   // Application Secret
const APP_VER     = process.env.KEYAUTH_APP_VERSION || '1.0';

const SELLER_URL  = 'https://keyauth.win/api/seller/';

/**
 * Fetch all license keys from KeyAuth using Seller API
 * Returns array of key objects: { key, uses, maxuses, expiry, ... }
 */
async function fetchAllKeys() {
  const res = await axios.get(SELLER_URL, {
    params: {
      sellerkey: APP_SECRET,  // Application Secret acts as seller key
      type: 'fetchallkeys',
    }
  });

  if (!res.data.success) {
    throw new Error(`KeyAuth error: ${res.data.message}`);
  }

  return res.data.keys; // array of key objects
}

/**
 * Returns a key that still has remaining uses.
 * Skips keys where uses >= maxuses.
 * Returns key string or null if none available.
 */
async function getAvailableKey() {
  const keys = await fetchAllKeys();

  for (const k of keys) {
    const uses    = parseInt(k.uses)    || 0;
    const maxuses = parseInt(k.maxuses) || 0;

    // maxuses = 0 means unlimited — always available
    // otherwise only give if uses remaining
    if (maxuses === 0 || uses < maxuses) {
      return k.key;
    }
  }

  return null; // all keys exhausted
}

/**
 * Returns count of keys that still have remaining uses.
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
