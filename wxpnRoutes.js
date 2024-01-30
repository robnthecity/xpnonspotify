// wxpnRoutes.js
export default function (fastify, db) {
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
}
