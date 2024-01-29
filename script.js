function loadSongs() {
    const date = document.getElementById('dateInput').value;
    fetch(`/songs/${date}`)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('songsContainer');
            container.innerHTML = '';
            data.data.forEach(song => {
                const songElement = `
                    <div>
                        <h3>${song.song_title} - ${song.artist}</h3>
                        <p>Album: ${song.album}</p>
                        <img src="${song.image_url}" alt="Album cover">
                        <audio controls src="${song.stream_preview_url}"></audio>
                    </div>
                `;
                container.innerHTML += songElement;
            });
        })
        .catch(error => console.error('Error:', error));
}
