// Require the dotenv package to load environment variables
require('dotenv').config();

// Access your Spotify API credentials this is a test
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

// Require necessary libraries and modules
const path = require('path');
const fastify = require('fastify')({
  logger: false,
});
const { createAuthorizeURL, authorizationCodeGrant, setAccessToken, setRefreshToken, getMe, getMyTopTracks } = require('./spotify-functions'); // Create a separate module for Spotify functions

// Setup static file serving
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/',
});

// Formbody for parsing incoming forms
fastify.register(require('@fastify/formbody'));

// View engine setup
fastify.register(require('@fastify/view'), {
  engine: {
    handlebars: require('handlebars'),
  },
  root: path.join(__dirname, 'src/pages'), // Set the root path for your templates
});

// Load SEO data
const seo = require('./src/seo.json');
if (seo.url === 'glitch-default') {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

// Define a wakeup route
fastify.get('/wakeup', function (request, reply) {
  reply.send('Waking up...');
});

// Home page route
fastify.get('/', function (request, reply) {
  const params = { seo };
  reply.view('/src/pages/index.hbs', params);
});

// POST route for handling form submissions
fastify.post('/', function (request, reply) {
  const params = { seo };
  reply.view('/src/pages/index.hbs', params);
});

// Spotify API authentication setup
const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi({
  clientId: spotifyClientId,
  clientSecret: spotifyClientSecret,
  redirectUri: 'https://xpnplaylist.glitch.me/callback',
});

// Function to fetch user's profile information and top tracks
async function fetchSpotifyData(api) {
  try {
    const me = await getMe(api);
    const topTracks = await getMyTopTracks(api);

    return {
      name: me.body.display_name,
      topTracks: topTracks.body.items,
    };
  } catch (error) {
    throw error;
  }
}

// Spotify login route
fastify.get('/login', function (request, reply) {
  const scopes = ['user-read-private', 'user-read-email', 'user-top-read'];
  const authorizeURL = createAuthorizeURL(spotifyClientId, scopes, 'https://xpnplaylist.glitch.me/callback');

  console.log("Spotify Authorization URL:", authorizeURL); // Log the authorization URL

  reply.redirect(authorizeURL);
});

// Spotify callback route
fastify.get('/callback', async function (request, reply) {
  const { code } = request.query;
  try {
    if (!code) {
      // Handle the case where there's no 'code' query parameter
      throw new Error('Authorization code not found.');
    }

    // Exchange the authorization code for access and refresh tokens
    const data = await authorizationCodeGrant(spotifyApi, code);

    // Set the obtained tokens in the Spotify API object
    setAccessToken(spotifyApi, data.body['access_token']);
    setRefreshToken(spotifyApi, data.body['refresh_token']);

    // Fetch user's profile information and top tracks using the new function
    const spotifyData = await fetchSpotifyData(spotifyApi);
    // Log the spotifyData to inspect its structure
    console.log("Spotify Data:", spotifyData);
    // Render index.hbs with user data and top tracks
    reply.view('/src/pages/index.hbs', {
      name: spotifyData.name,
      topTracks: spotifyData.topTracks,
      seo,
    });
  } catch (error) {
    console.error('Error:', error);
    reply.status(500).send('Error during authentication or data fetching');
  }
});

// Route to display top tracks
fastify.get('/top-tracks', async function (request, reply) {
  try {
    const topTracks = await getMyTopTracks(spotifyApi);
    const tracks = topTracks.body.items;

    reply.view('nametracks.hbs', { tracks }); // Pass the "tracks" data to the template
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    reply.status(500).send('Error fetching or rendering top tracks');
  }
});

// Start the server
fastify.listen({ port: process.env.PORT, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
});

fastify.get('/my-name', function (request, reply) {
  let params = { name: 'Robert Udell' }; // Replace 'Your Name' with your actual name
  reply.view('name.hbs', params);
});

fastify.get('/my-spotify-name', async function (request, reply) {
  try {
    const me = await spotifyApi.getMe(); // Fetches the user's profile information.
    let params = { name: me.body.display_name }; // Gets the display name of the user.
    reply.view('name.hbs', params); // Renders the name template with the user's display name.
  } catch (error) {
    console.error('Error fetching user profile from Spotify:', error);
    reply.status(500).send('Error fetching user profile from Spotify');
  }
});
