const axios = require('axios');
require('dotenv').config();

const OWNER_ID   = process.env.KEYAUTH_OWNER_ID;    // eq1AWn1yMY
const APP_SECRET = process.env.KEYAUTH_APP_SECRET;  // your secret key
const APP_NAME   = process.env.KEYAUTH_APP_NAME;    // ZSCHEAT

/**
 * Fetch all license keys from KeyAuth Seller API
 */
async function fetchAllKeys() {
  const url = `https://keyauth.win/api/seller/?sellerkey=${APP_SECRET}&type=fetchallkeys`;

  console.log('🔍 Fetching keys from KeyAuth...');

  const res = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });

  console.log('KeyAuth response:', JSON.stringify(res.data));

  if (!res.data.success) {
    throw new Error(`KeyAuth error: ${res.data.message}`);
  }

  return res.data.keys || [];
}

/**
 * Returns a key that still has remaining uses.
 */
async function getAvailableKey() {
  const keys = await fetchAllKeys();

  if (!keys || keys.length === 0) return null;

  for (const k of keys) {
    const uses    = parseInt(k.uses)    || 0;
    const maxuses = parseInt(k.maxuses) || 0;

    // maxuses 0 = unlimited, otherwise check remaining uses
    if (maxuses === 0 || uses < maxuses) {
      return k.key;
    }
  }

  return null;
}

/**
 * Returns count of keys with remaining uses.
 */
async function getAvailableKeyCount() {
  const keys = await fetchAllKeys();

  if (!keys || keys.length === 0) return 0;

  return keys.filter(k => {
    const uses    = parseInt(k.uses)    || 0;
    const maxuses = parseInt(k.maxuses) || 0;
    return maxuses === 0 || uses < maxuses;
  }).length;
}

module.exports = { getAvailableKey, getAvailableKeyCount };
