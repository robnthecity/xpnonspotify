// db.js
import { fileURLToPath } from 'url'; // Correct import from 'url'
import { dirname, join } from 'path'; // Import dirname from 'path'
import sqlite3 from 'sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'xpn_playlists.db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the xpn_playlists.db SQLite database.');
  }
});

export default db;
