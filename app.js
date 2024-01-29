//this is code to get my songs.html page to load

const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.resolve(__dirname, 'xpn_playlists.db');

const app = express();
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) return console.error(err.message);
    console.log('Connected to the xpn_playlists.db SQlite database.');
});

app.use(express.static('public')); // For serving static files
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded data

// Endpoint to display form and get songs by date
app.get('/songs-by-date', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/songs-by-date.html')); // Adjust path as needed
});

// Endpoint to handle form submission
app.post('/get-songs', (req, res) => {
    const date = req.body.date; // Assuming input name is 'date'
    // Query database and send results
    const query = `SELECT * FROM songs WHERE play_date = ?`;
    db.all(query, [date], (err, rows) => {
        if (err) {
            res.status(400).send("Error retrieving songs");
            return console.error(err.message);
        }
        res.json(rows); // Send the rows as JSON
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
