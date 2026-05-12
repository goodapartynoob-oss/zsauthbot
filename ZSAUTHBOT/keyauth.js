const axios = require('axios');
require('dotenv').config();

const APP_SECRET = process.env.KEYAUTH_APP_SECRET;

async function getAvailableKey() {
  try {
    const url = `https://keyauth.win/api/seller/?sellerkey=${APP_SECRET}&type=fetchallkeys`;
    console.log('Calling KeyAuth URL:', url);

    const res = await axios.get(url, { timeout: 15000 });
    console.log('KeyAuth raw response:', JSON.stringify(res.data));

    if (!res.data.success) {
      console.error('KeyAuth failed:', res.data.message);
      return null;
    }

    const keys = res.data.keys || [];
    console.log('Total keys found:', keys.length);

    for (const k of keys) {
      console.log(`Key: ${k.key} | uses: ${k.uses} | maxuses: ${k.maxuses}`);
      const uses    = parseInt(k.uses)    || 0;
      const maxuses = parseInt(k.maxuses) || 0;
      if (maxuses === 0 || uses < maxuses) {
        console.log('Returning available key:', k.key);
        return k.key;
      }
    }

    console.log('No available keys found');
    return null;

  } catch (err) {
    console.error('KeyAuth EXCEPTION:', err.message);
    console.error('Full error:', err);
    throw err;
  }
}

async function getAvailableKeyCount() {
  try {
    const url = `https://keyauth.win/api/seller/?sellerkey=${APP_SECRET}&type=fetchallkeys`;
    const res = await axios.get(url, { timeout: 15000 });

    if (!res.data.success) return 0;

    const keys = res.data.keys || [];
    return keys.filter(k => {
      const uses    = parseInt(k.uses)    || 0;
      const maxuses = parseInt(k.maxuses) || 0;
      return maxuses === 0 || uses < maxuses;
    }).length;
  } catch (err) {
    console.error('KeyAuth count error:', err.message);
    return 0;
  }
}

module.exports = { getAvailableKey, getAvailableKeyCount };
