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
  let params = { seo: seo };
  reply.view('/src/pages/index.hbs', params);
});

// POST route for handling form submissions
fastify.post('/', function (request, reply) {
  let params = { seo: seo };
  reply.view('/src/pages/index.hbs', params);
});

// Spotify API authentication setup
const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi({
  clientId: spotifyClientId,
  clientSecret: spotifyClientSecret,
  redirectUri: 'https://xpnplaylist.glitch.me/callback',
});

// Spotify login route
fastify.get('/login', function (request, reply) {
  const scopes = ['user-read-private', 'user-read-email', 'user-top-read'];
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
  reply.redirect(authorizeURL);
});

// Spotify callback route
fastify.get('/callback', async function (request, reply) {
    const { code } = request.query;
    console.log('Authorization code:', code);
    try {
        const data = await spotifyApi.authorizationCodeGrant(code);
        console.log('Access Token:', data.body['access_token']);
        console.log('Refresh Token:', data.body['refresh_token']);

        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);

        // Fetch user's profile information and top tracks
        const [me, topTracksData] = await Promise.all([
            spotifyApi.getMe(),
            spotifyApi.getMyTopTracks()
        ]);

        let params = {
            name: me.body.display_name, // User's display name
            topTracks: topTracksData.body.items, // User's top tracks
            seo: seo // SEO data
        };

        // Render index.hbs with user data and top tracks
        reply.view('/src/pages/index.hbs', params);
    } catch (error) {
        console.error('Authentication or data fetch error:', error);
        reply.status(500).send('Error during authentication or data fetching');
    }
});


// Route to display top tracks
// Route to display top tracks
fastify.get('/top-tracks', async function (request, reply) {
  try {
      const topTracks = await spotifyApi.getMyTopTracks();
      let tracks = topTracks.body.items;

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
