require('dotenv').config();
const path = require('path');
const fastify = require('fastify')({ logger: true });
const SpotifyWebApi = require('spotify-web-api-node');

// Initialize Spotify API client
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: 'https://xpnplaylist.glitch.me/callback'
});

// Fastify plugin setup
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/'
}).register(require('@fastify/formbody'))
  .register(require('@fastify/view'), {
    engine: {
      handlebars: require('handlebars')
    },
    root: path.join(__dirname, 'src/pages')
  });

const seo = require('./src/seo.json');
if (seo.url === 'glitch-default') {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

// Routes
fastify.get('/wakeup', async (req, reply) => reply.send('Waking up...'));
// Serve the homepage using the view plugin's configured root directory
fastify.get('/', async (req, reply) => reply.view('index.hbs', { seo }));

fastify.get('/login', async (req, reply) => {
  const scopes = ['user-read-private', 'user-read-email', 'user-top-read'];
  reply.redirect(spotifyApi.createAuthorizeURL(scopes));
});

fastify.get('/callback', async (req, reply) => {
  try {
    if (!req.query.code) {
      throw new Error('No code provided');
    }

    const data = await spotifyApi.authorizationCodeGrant(req.query.code);
    spotifyApi.setAccessToken(data.body['access_token']);
    spotifyApi.setRefreshToken(data.body['refresh_token']);

    const [me, topTracks] = await Promise.all([
      spotifyApi.getMe(),
      spotifyApi.getMyTopTracks()
    ]);

return reply.view('index.hbs', {
  name: me.body.display_name,
  topTracks: topTracks.body.items,
  seo
});
  } catch (error) {
    console.error(error);
    return reply.status(500).send('Authentication error');
  }
});

fastify.get('/top-tracks', async (req, reply) => {
  try {
    const topTracks = await spotifyApi.getMyTopTracks();
    reply.view('nametracks.hbs', { tracks: topTracks.body.items });
  } catch (error) {
    console.error(error);
    reply.status(500).send('Error fetching top tracks');
  }
});

// Start server
fastify.listen({ port: process.env.PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening on ${address}`);
});
