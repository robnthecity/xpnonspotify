const SpotifyWebApi = require('spotify-web-api-node');

// Function to create Spotify authorization URL
function createAuthorizeURL(clientId, scopes) {
  const spotifyApi = new SpotifyWebApi({ clientId });
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes,null);
  return authorizeURL;
}

// Function to exchange authorization code for access and refresh tokens
async function authorizationCodeGrant(api, code) {
  try {
    const data = await api.authorizationCodeGrant(code);
    return data;
  } catch (error) {
    throw error;
  }
}

// Function to set access token in Spotify API object
function setAccessToken(api, token) {
  api.setAccessToken(token);
}

// Function to set refresh token in Spotify API object
function setRefreshToken(api, token) {
  api.setRefreshToken(token);
}

// Function to get user's profile information
async function getMe(api) {
  try {
    const me = await api.getMe();
    return me;
  } catch (error) {
    throw error;
  }
}

// Function to get user's top tracks
async function getMyTopTracks(api) {
  try {
    const topTracks = await api.getMyTopTracks();
    return topTracks;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  createAuthorizeURL,
  authorizationCodeGrant,
  setAccessToken,
  setRefreshToken,
  getMe,
  getMyTopTracks,
};
