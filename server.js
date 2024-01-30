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
import spotifyRoutes from './spotifyRoutes.js'

// Initialize dotenv
dotenv.config();

// Derive the directory name (equivalent to __dirname)
const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Fastify
const fastify = Fastify({ logger: true });

// Register Spotify routes
fastify.register(spotifyRoutes);

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

Handlebars.registerHelper('formatTime', (timestamp) => {
  const date = new Date(timestamp);
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
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
fastify.get('/', async (req, reply) => reply.view('index.hbs', { seo }));

// POST route for handling form submissions
fastify.post('/', function (request, reply) {
  let params = { seo: seo };
  reply.view('index.hbs', params);
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

// WXPN Playlist Routes
// WXPN Playlist Routes
fastify.get('/songs/:date', async (request, reply) => {
  const date = request.params.date;
  const sql = `
    SELECT 
      IFNULL(s.artist, 'Unknown Artist') as artist, 
      IFNULL(s.song, 'Untitled') as song, 
      IFNULL(s.album, 'Unknown Album') as album, 
      s.image,
      s.streamPreview,
      p.played_at
    FROM songs s
    JOIN plays p ON s.id = p.song_id
    WHERE date(p.played_at) = ?
  `;
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(sql, [date], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
    // Render the songs.hbs template with the data
    return reply.view('songs.hbs', { songs: rows, date }); // Add 'return' here
  } catch (err) {
    reply.status(500).send({ error: err.message });
    return; // Make sure to return after sending the response
  }
});





