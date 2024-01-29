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
fastify.get('/', async (req, reply) => reply.view('/src/pages/index.hbs', { seo }));

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

// this is my xpn code
const express = require('express');
const sqlite3 = require('sqlite3');
//const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Connect to SQLite database
let db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

app.use(express.static('public')); // Serve static files from 'public' directory
app.use(express.json()); // Parse JSON bodies

// API endpoint to get songs by date
app.get('/songs/:date', (req, res) => {
    const date = req.params.date;
    const sql = `
        SELECT songs.artist, songs.song_title, songs.album, songs.image_url, play_history.played_at
        FROM songs
        JOIN play_history ON songs.id = play_history.song_id
        WHERE date(play_history.played_at) = ?
    `;
    db.all(sql, [date], (err, rows) => {
        if (err) {
            res.status(400).send({error: err.message});
            return;
        }
        res.send({data: rows});
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

