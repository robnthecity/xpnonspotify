const DEFAULT_SETTINGS = {
  backendBaseUrl: 'http://localhost:3000',
  playlistId: ''
};

async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

async function saveSettings(settings) {
  await chrome.storage.sync.set(settings);
  return getSettings();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return response.json();
}

async function fetchSession() {
  const { backendBaseUrl } = await getSettings();
  return fetchJson(`${backendBaseUrl}/api/session`).catch((error) => ({
    authenticated: false,
    error: error.message
  }));
}

async function startLoginFlow() {
  const { backendBaseUrl } = await getSettings();
  const { authorizeUrl } = await fetchJson(`${backendBaseUrl}/api/login`);
  await chrome.tabs.create({ url: authorizeUrl });
  return { started: true, authorizeUrl };
}

async function addTrackToPlaylist(track) {
  const { backendBaseUrl, playlistId } = await getSettings();
  if (!playlistId) {
    throw new Error('Set a target playlist ID in the extension popup first.');
  }

  return fetchJson(`${backendBaseUrl}/api/add-track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      trackName: track.trackName,
      artistName: track.artistName,
      playlistId
    })
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message?.type) {
        case 'GET_SETTINGS':
          sendResponse(await getSettings());
          break;
        case 'SET_SETTINGS':
          sendResponse(await saveSettings(message.settings || {}));
          break;
        case 'GET_SESSION':
          sendResponse(await fetchSession());
          break;
        case 'START_LOGIN':
          sendResponse(await startLoginFlow());
          break;
        case 'ADD_TRACK':
          sendResponse(await addTrackToPlaylist(message.track));
          break;
        default:
          sendResponse({});
      }
    } catch (error) {
      sendResponse({ error: error.message });
    }
  })();

  return true;
});
