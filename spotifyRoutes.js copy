// spotifyRoutes.js
import SpotifyWebApi from 'spotify-web-api-node';

// Initialize Spotify API client
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: 'https://xpnplaylist.glitch.me/callback'
});

// Spotify login route
async function spotifyLoginRoute(request, reply) {
  const scopes = ['user-read-private', 'user-read-email', 'user-top-read'];
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
  reply.redirect(authorizeURL);
}

// Spotify callback route
async function spotifyCallbackRoute(request, reply) {
  const { code } = request.query;
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    spotifyApi.setAccessToken(data.body['access_token']);
    spotifyApi.setRefreshToken(data.body['refresh_token']);

    const [me, topTracks] = await Promise.all([
      spotifyApi.getMe(),
      spotifyApi.getMyTopTracks()
    ]);

    return reply.view('index.hbs', {
      name: me.body.display_name,
      topTracks: topTracks.body.items,
      // Include SEO data here
    });
  } catch (error) {
    console.error('Error in Spotify callback:', error);
    reply.status(500).send('Error during Spotify callback');
  }
}

// Route to display top tracks
async function topTracksRoute(request, reply) {
  try {
    const topTracks = await spotifyApi.getMyTopTracks();
    reply.view('top-tracks.hbs', { tracks: topTracks.body.items });
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    reply.status(500).send('Error fetching or rendering top tracks');
  }
}

// Export the routes to be used in server.js
export default function (fastify, options, done) {
  fastify.get('/login', spotifyLoginRoute);
  fastify.get('/callback', spotifyCallbackRoute);
  fastify.get('/top-tracks', topTracksRoute);
  done();
}