// to run this type 'node populateDatabase.js' in the glitch terminal
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const path = require('path');
const dbPath = path.resolve(__dirname, 'xpn_playlists.db');
const db = new sqlite3.Database(dbPath);

// Initialize the database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist TEXT NOT NULL,
    song TEXT NOT NULL,
    album TEXT,
    timeslice DATETIME,
    image TEXT,
    streamPreview TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS plays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(song_id) REFERENCES songs(id)
  )`);
});

// Function to insert a new song into the songs table
function insertSong(data) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO songs (artist, song, album, timeslice, image, streamPreview)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [data.artist, data.song, data.album, data.timeslice, data.image, data.streamPreview];
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

// Function to insert a play event into the plays table
function insertPlay(songId) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO plays (song_id) VALUES (?)`;
    db.run(sql, [songId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Function to fetch playlist data from WXPN API
function fetchPlaylistData(dateString) {
  const url = `https://origin.xpn.org/utils/playlist/json/${dateString}.json`;
  return fetch(url)
    .then(response => response.json())
    .then(data => data)
    .catch(error => {
      throw error;
    });
}

// Function to get the latest date in the plays table
function getLatestDate() {
  return new Promise((resolve, reject) => {
    db.get(`SELECT MAX(timeslice) as latestDate FROM songs`, [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.latestDate ? new Date(row.latestDate) : new Date('2024-01-01'));
      }
    });
  });
}

// Function to populate the database with data from WXPN API starting from the latest date
async function populateDatabase() {
  let startDate = await getLatestDate();
  let currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() + 1); // Start from the day after the latest date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  while (currentDate <= yesterday) {
    const dateString = currentDate.toISOString().split('T')[0];
    try {
      const playlistData = await fetchPlaylistData(dateString);
      for (const data of playlistData) {
        // Insert song and play information
        const songId = await insertSong(data);
        await insertPlay(songId);
      }
      console.log(`Data for ${dateString} added to the database.`);
    } catch (error) {
      console.error(`Error fetching data for ${dateString}: ${error}`);
    }
    // Increment the date by 1 day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log('Database population complete.');
}

// Run the populateDatabase function
populateDatabase().catch(console.error);
