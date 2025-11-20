const BUTTON_CLASS = 'xpn-spotify-add-button';
const ATTACHED_FLAG = 'data-spotify-button';

const debounce = (fn, delay = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

function findTableCandidates() {
  const candidates = [];
  document.querySelectorAll('table').forEach((table) => {
    const headers = Array.from(table.querySelectorAll('th')).map((th) => th.textContent.trim().toLowerCase());
    const songIndex = headers.findIndex((text) => text.includes('song') || text.includes('title'));
    const artistIndex = headers.findIndex((text) => text.includes('artist'));

    if (songIndex === -1 || artistIndex === -1) return;

    const rows = table.querySelectorAll('tbody tr, tr');
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (!cells.length) return;
      const trackName = cells[songIndex]?.textContent?.trim();
      const artistName = cells[artistIndex]?.textContent?.trim();
      if (trackName && artistName) {
        candidates.push({ row, trackName, artistName });
      }
    });
  });
  return candidates;
}

function findDataAttributeCandidates() {
  const selectors = [
    '[data-song-title]',
    '[data-track-title]',
    '.song-title',
    '.track-title'
  ];
  const candidates = [];
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((titleEl) => {
      const container = titleEl.closest('[data-artist-name], .playlist-item, li, article, div');
      const artistEl = container?.querySelector('[data-artist-name], .artist-name');
      const trackName = titleEl.textContent?.trim();
      const artistName = artistEl?.textContent?.trim();
      if (container && trackName && artistName) {
        candidates.push({ row: container, trackName, artistName });
      }
    });
  });
  return candidates;
}

function getTrackCandidates() {
  const merged = [...findTableCandidates(), ...findDataAttributeCandidates()];
  const seen = new Set();
  return merged.filter(({ row, trackName, artistName }) => {
    const key = `${trackName}-${artistName}`.toLowerCase();
    if (seen.has(key)) return false;
    if (row.hasAttribute(ATTACHED_FLAG)) return false;
    seen.add(key);
    return true;
  });
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `xpn-spotify-toast xpn-spotify-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('visible');
  }, 50);
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3200);
}

function attachButtons() {
  const candidates = getTrackCandidates();
  candidates.forEach((candidate) => {
    const button = document.createElement('button');
    button.textContent = 'Add to Spotify';
    button.className = BUTTON_CLASS;
    button.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'ADD_TRACK', track: candidate }, (response) => {
        if (!response || response.error) {
          const reason = response?.error || 'Unable to add track. Confirm Spotify login in the extension popup.';
          showToast(reason, 'error');
          return;
        }
        showToast(`Added ${candidate.trackName} to Spotify`, 'success');
      });
    });
    candidate.row.setAttribute(ATTACHED_FLAG, 'true');
    candidate.row.classList.add('xpn-spotify-row');
    candidate.row.appendChild(button);
  });
}

const debouncedAttach = debounce(attachButtons, 300);

attachButtons();

const observer = new MutationObserver(() => debouncedAttach());
observer.observe(document.body, { childList: true, subtree: true });
