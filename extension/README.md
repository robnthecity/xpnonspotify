# WXPN Playlist → Spotify Chrome extension

This folder contains a Manifest V3 Chrome extension that decorates the WXPN playlist page (https://xpn.org/wxpn-playlists/) with **Add to Spotify** buttons and sends tracks to a configured Spotify playlist through the server in this repo.

## Setup
1. Ensure the server is running and configured with `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`, and either `SPOTIFY_PLAYLIST_ID` or a playlist ID you will paste into the popup.
2. Load the extension in Chrome via **chrome://extensions** > **Load unpacked** and select the `extension` directory.
3. Open the popup, set your backend URL (e.g., `http://localhost:3000`) and target playlist ID, then click **Connect Spotify** to run the OAuth flow.
4. Visit the WXPN playlist page; each track row will gain an **Add to Spotify** button that posts the song and artist to the server.

## Notes
- The extension uses heuristic selectors to find song/artist pairs in tables or playlist items on the page. If buttons are missing, reload the page after the playlist renders.
- Toast messages will confirm success or surface errors (such as needing to reconnect Spotify).
