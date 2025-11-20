require('dotenv').config();
const path = require('path');
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const SpotifyWebApi = require('spotify-web-api-node');

// Initialize Spotify API client
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback'
});

// OAuth scopes used across web and extension flows
const spotifyScopes = [
  'user-read-private',
  'playlist-modify-public',
  'playlist-modify-private'
];

let tokenExpiresAt = 0;

// Fastify plugin setup
fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS']
});

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

const setTokens = (data) => {
  spotifyApi.setAccessToken(data.body['access_token']);
  spotifyApi.setRefreshToken(data.body['refresh_token']);
  tokenExpiresAt = Date.now() + data.body['expires_in'] * 1000;
};

const ensureAccessToken = async () => {
  if (!spotifyApi.getAccessToken()) {
    throw new Error('Spotify is not authenticated');
  }

  if (tokenExpiresAt && Date.now() >= tokenExpiresAt - 30_000) {
    const refreshed = await spotifyApi.refreshAccessToken();
    spotifyApi.setAccessToken(refreshed.body['access_token']);
    if (refreshed.body['refresh_token']) {
      spotifyApi.setRefreshToken(refreshed.body['refresh_token']);
    }
    tokenExpiresAt = Date.now() + refreshed.body['expires_in'] * 1000;
  }
};

// Routes
fastify.get('/wakeup', async (req, reply) => reply.send('Waking up...'));
// Serve the homepage using the view plugin's configured root directory
fastify.get('/', async (req, reply) => reply.view('index.hbs', { seo }));

fastify.get('/login', async (req, reply) => {
  reply.redirect(spotifyApi.createAuthorizeURL(spotifyScopes));
});

fastify.get('/api/login', async (req, reply) => {
  const state = 'extension';
  return reply.send({ authorizeUrl: spotifyApi.createAuthorizeURL(spotifyScopes, state) });
});

fastify.get('/callback', async (req, reply) => {
  try {
    if (!req.query.code) {
      throw new Error('No code provided');
    }

    const data = await spotifyApi.authorizationCodeGrant(req.query.code);
    setTokens(data);

    const [me, topTracks] = await Promise.all([
      spotifyApi.getMe(),
      spotifyApi.getMyTopTracks()
    ]);

    if (req.query.state === 'extension') {
      return reply.type('text/html').send('<p>Spotify is connected. You can close this tab and continue in the extension.</p>');
    }

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

fastify.get('/api/session', async (req, reply) => {
  try {
    await ensureAccessToken();
    const me = await spotifyApi.getMe();
    return reply.send({ authenticated: true, user: me.body, tokenExpiresAt });
  } catch (error) {
    return reply.send({ authenticated: false, error: error.message });
  }
});

fastify.post('/api/add-track', async (req, reply) => {
  const { trackName, artistName, playlistId } = req.body || {};
  if (!trackName) {
    return reply.status(400).send({ error: 'trackName is required' });
  }

  const targetPlaylist = playlistId || process.env.SPOTIFY_PLAYLIST_ID;
  if (!targetPlaylist) {
    return reply.status(400).send({ error: 'No playlistId provided and SPOTIFY_PLAYLIST_ID is not set' });
  }

  try {
    await ensureAccessToken();
    const query = artistName ? `track:${trackName} artist:${artistName}` : trackName;
    const searchResults = await spotifyApi.searchTracks(query, { limit: 1 });
    const track = searchResults.body.tracks?.items?.[0];

    if (!track) {
      return reply.status(404).send({ error: 'No matching track found on Spotify' });
    }

    await spotifyApi.addTracksToPlaylist(targetPlaylist, [track.uri]);

    return reply.send({
      added: true,
      track: {
        name: track.name,
        artists: track.artists.map((artist) => artist.name),
        uri: track.uri
      }
    });
  } catch (error) {
    console.error('Error adding track to playlist', error);
    return reply.status(500).send({ error: 'Failed to add track to playlist' });
  }
});

fastify.get('/top-tracks', async (req, reply) => {
  try {
    await ensureAccessToken();
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
