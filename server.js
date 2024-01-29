// Import dependencies
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import Fastify from 'fastify';
import Static from '@fastify/static';
import Formbody from '@fastify/formbody';
import View from '@fastify/view';
import Handlebars from 'handlebars';
import SpotifyWebApi from 'spotify-web-api-node';
import sqlite3 from 'sqlite3';

// Initialize dotenv
dotenv.config();

// Derive the directory name (equivalent to __dirname)
const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Fastify
const fastify = Fastify({ logger: true });

// Initialize Spotify API client
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: 'https://xpnplaylist.glitch.me/callback'
});

// Database Connection
const dbPath = join(__dirname, 'xpn_playlists.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the xpn_playlists.db SQLite database.');
  }
});

// Fastify Plugin Setup
fastify.register(Static, {
  root: join(__dirname, 'public'),
  prefix: '/'
}).register(Formbody)
  .register(View, {
    engine: {
      handlebars: Handlebars
    },
    root: join(__dirname, 'src/pages')
  });

// Import SEO Configuration
let seo = {};

// Async IIFE to load SEO configuration
(async () => {
  try {
    const seoData = await fs.readFile(join(__dirname, 'src/seo.json'), 'utf8');
    seo = JSON.parse(seoData);
  } catch (err) {
    console.error('Error reading SEO configuration:', err);
    // Default to an empty object in case of an error
  }
})();

// Routes
fastify.get('/wakeup', async (req, reply) => reply.send('Waking up...'));
fastify.get('/', async (req, reply) => reply.view('/src/pages/index.hbs', { seo }));

// POST route for handling form submissions
fastify.post('/', function (request, reply) {
  let params = { seo: seo };
  reply.view('/src/pages/index.hbs', params);
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
        console.error('Error in Spotify callback:', error);
        reply.status(500).send('Error during Spotify callback');
    }
});


// Route to display top tracks
fastify.get('/top-tracks', async function (request, reply) {
    try {
        const topTracks = await spotifyApi.getMyTopTracks();
        let tracks = topTracks.body.items;

        reply.view('top-tracks.hbs', { tracks });
    } catch (error) {
        console.error('Error fetching top tracks:', error);
        reply.status(500).send('Error fetching or rendering top tracks');
    }
});

// WXPN Playlist Routes
fastify.get('/songs/:date', async (request, reply) => {
  const date = request.params.date;
  const sql = `
    SELECT songs.artist, songs.song_title, songs.album, songs.image_url, play_history.played_at
    FROM songs
    JOIN play_history ON songs.id = play_history.song_id
    WHERE date(play_history.played_at) = ?
  `;
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(sql, [date], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    reply.send({ data: rows });
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
});

// Start Server
const startServer = async () => {
  try {
    const address = await fastify.listen({ port: process.env.PORT, host: '0.0.0.0' });
    console.log(`Server listening on ${address}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

startServer();
