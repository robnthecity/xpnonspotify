const backendInput = document.getElementById('backendBaseUrl');
const playlistInput = document.getElementById('playlistId');
const statusEl = document.getElementById('status');

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? '#c0392b' : '#2c3e50';
}

function loadSettings() {
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
    backendInput.value = settings.backendBaseUrl;
    playlistInput.value = settings.playlistId;
  });
}

function checkSession() {
  setStatus('Checking Spotify session…');
  chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (response) => {
    if (response?.authenticated) {
      setStatus(`Connected as ${response.user.display_name}`);
    } else {
      const reason = response?.error || 'Not connected to Spotify';
      setStatus(reason, true);
    }
  });
}

function saveSettings() {
  chrome.runtime.sendMessage({
    type: 'SET_SETTINGS',
    settings: {
      backendBaseUrl: backendInput.value.trim(),
      playlistId: playlistInput.value.trim()
    }
  }, () => {
    setStatus('Settings saved.');
  });
}

function startLogin() {
  setStatus('Opening Spotify login…');
  chrome.runtime.sendMessage({ type: 'START_LOGIN' }, (response) => {
    if (response?.error) {
      setStatus(response.error, true);
      return;
    }
    setStatus('Complete the Spotify login in the opened tab.');
  });
}

loadSettings();
checkSession();

document.getElementById('saveSettings').addEventListener('click', saveSettings);
document.getElementById('startLogin').addEventListener('click', startLogin);
