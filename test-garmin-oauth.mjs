// Test script to verify Garmin OAuth signature generation
// Run with: node test-garmin-oauth.js

import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

// Replace these with your actual credentials
const GARMIN_CONSUMER_KEY = '3713481c-7ec3-4e66-975e-fca6e1615dc0';
const GARMIN_CONSUMER_SECRET = 'RZwzK67fynidIl4tbnrLsP+4pMXphozS6URLIEgdPZQ';
const CALLBACK_URL = 'https://www.tribos.studio/garmin/callback';
const GARMIN_REQUEST_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/request_token';

// Initialize OAuth 1.0a client
const oauth = new OAuth({
  consumer: {
    key: GARMIN_CONSUMER_KEY,
    secret: GARMIN_CONSUMER_SECRET,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto
      .createHmac('sha1', key)
      .update(base_string)
      .digest('base64');
  },
});

console.log('🔍 Testing Garmin OAuth 1.0a Request Token...\n');

// Build request with oauth_callback in data
const requestData = {
  url: GARMIN_REQUEST_TOKEN_URL,
  method: 'POST',
  data: { oauth_callback: CALLBACK_URL }
};

const authHeader = oauth.toHeader(oauth.authorize(requestData));

console.log('📋 Request Details:');
console.log('URL:', GARMIN_REQUEST_TOKEN_URL);
console.log('Method: POST');
console.log('Consumer Key:', GARMIN_CONSUMER_KEY);
console.log('Callback URL:', CALLBACK_URL);
console.log('\n📝 Authorization Header:');
console.log(JSON.stringify(authHeader, null, 2));
console.log('\n🔐 Authorization Header String:');
console.log(authHeader.Authorization);

// Make the actual request
console.log('\n🚀 Making request to Garmin...\n');

fetch(GARMIN_REQUEST_TOKEN_URL, {
  method: 'POST',
  headers: {
    ...authHeader
  }
})
.then(async response => {
  console.log('📊 Response Status:', response.status, response.statusText);
  const text = await response.text();

  if (response.ok) {
    console.log('\n✅ SUCCESS! Response:');
    console.log(text);

    // Parse the response
    const params = new URLSearchParams(text);
    console.log('\n📦 Parsed Response:');
    console.log('oauth_token:', params.get('oauth_token'));
    console.log('oauth_token_secret:', params.get('oauth_token_secret'));
    console.log('oauth_callback_confirmed:', params.get('oauth_callback_confirmed'));
  } else {
    console.log('\n❌ ERROR Response:');
    console.log(text);
  }
})
.catch(error => {
  console.error('\n❌ Request Failed:', error.message);
});
