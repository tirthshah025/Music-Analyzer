let playlist = [];
let likedSongIds = JSON.parse(localStorage.getItem('likedSongIds')) || [];
let playlistChart = null;
let currentPreview = null;

function setLoading(message, active = false) {
    const loadingEl = document.getElementById('loading');
    loadingEl.textContent = message;
    loadingEl.style.opacity = active ? '1' : '0.9';
}

function parsePlaylistId(url) {
    const trimmed = url.trim();
    const patterns = [
        /playlist\/([a-zA-Z0-9]+)(?:\?|$)/,
        /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)(?:\?|$)/,
        /spotify:playlist:([a-zA-Z0-9]+)/
    ];
    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
}

async function fetchFullPlaylist(id, token) {
    const items = [];
    let url = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`;

    while (url) {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error?.message || 'Spotify request failed');
        }
        const data = await res.json();
        items.push(...data.items);
        url = data.next;
    }
    return items;
}

async function loadSpotify() {
    setLoading('Fetching playlist data... 🎧', true);
    document.getElementById('stats').innerHTML = '';
    document.getElementById('songs').innerHTML = '';
    document.getElementById('favoriteSummary').innerHTML = '';
    document.getElementById('favoriteList').innerHTML = '';

    const url = document.getElementById('playlistUrl').value;
    const token = document.getElementById('spotifyToken').value.trim();
    const id = parsePlaylistId(url);

    if (!id) {
        alert('Please enter a valid Spotify playlist link.');
        setLoading('Invalid playlist URL.');
        return;
    }

    if (!token) {
        alert('Please provide your Spotify access token.');
        setLoading('Spotify token required.');
        return;
    }

    try {
        const rawItems = await fetchFullPlaylist(id, token);
        if (!rawItems.length) {
            setLoading('No tracks found in this playlist.');
            return;
        }

        playlist = rawItems
            .filter(item => item.track && !item.is_local)
            .map(item => ({
                id: item.track.id,
                name: item.track.name,
                artists: item.track.artists.map(artist => artist.name).join(', '),
                durationMs: item.track.duration_ms,
                preview: item.track.preview_url,
                album: item.track.album.name,
                image: item.track.album.images[0]?.url || '',
                url: item.track.external_urls.spotify
            }));

        displaySongs();
        showStats();
        renderFavorites();
        setLoading(`Loaded ${playlist.length} tracks from playlist.`, false);
    } catch (error) {
        console.error(error);
        alert('Unable to load playlist. Check your token, playlist URL, or network.');
        setLoading('Failed to load playlist.');
    }
}

function displaySongs() {
    const container = document.getElementById('songs');
    const searchQuery = document.getElementById('search').value.toLowerCase();
    container.innerHTML = '';

    playlist
        .filter(song => {
            const text = `${song.name} ${song.artists} ${song.album}`.toLowerCase();
            return text.includes(searchQuery);
        })
        .forEach(song => {
            const liked = likedSongIds.includes(song.id);
            const card = document.createElement('article');
            card.className = 'song-card';
            card.innerHTML = `
                <div class="song-head">
                    <div class="song-thumb">
                        <img src="${song.image}" alt="${song.name}">
                    </div>
                    <div class="song-meta">
                        <strong>${song.name}</strong>
                        <span>${song.artists}</span>
                        <span>${song.album}</span>
                    </div>
                </div>
                <div class="song-body">
                    <div class="song-actions">
                        <span>${formatDuration(song.durationMs)}</span>
                        <button onclick="toggleLikeSong('${song.id}')">${liked ? '💚 Favorited' : '🤍 Favorite'}</button>
                    </div>
                    ${song.preview
                        ? `<audio controls onplay="handlePreview(this)" src="${song.preview}"></audio>`
                        : '<div class="song-actions"><span class="subtext">Preview not available</span></div>'}
                    <a class="song-link" href="${song.url}" target="_blank" rel="noreferrer">Open in Spotify</a>
                </div>
            `;
            container.appendChild(card);
        });
}

function toggleLikeSong(songId) {
    const index = likedSongIds.indexOf(songId);
    if (index === -1) {
        likedSongIds.push(songId);
    } else {
        likedSongIds.splice(index, 1);
    }
    localStorage.setItem('likedSongIds', JSON.stringify(likedSongIds));
    displaySongs();
    renderFavorites();
}

function renderFavorites() {
    const favorites = playlist.filter(song => likedSongIds.includes(song.id));
    const summary = document.getElementById('favoriteSummary');
    const list = document.getElementById('favoriteList');
    summary.innerHTML = favorites.length
        ? `You have saved <strong>${favorites.length}</strong> favorite track${favorites.length === 1 ? '' : 's'}.`
        : 'Mark songs as favorites to keep them visible here.';

    list.innerHTML = '';
    favorites.slice(0, 6).forEach(song => {
        const item = document.createElement('div');
        item.className = 'favorite-item';
        item.innerHTML = `
            <span>${song.name}</span>
            <button onclick="toggleLikeSong('${song.id}')">Remove</button>
        `;
        list.appendChild(item);
    });
}

function searchSongs() {
    displaySongs();
}

function showStats() {
    const total = playlist.length;
    const totalDuration = playlist.reduce((sum, song) => sum + song.durationMs, 0);
    const avgDurationMs = totalDuration / total;

    const artistFrequency = playlist.reduce((map, song) => {
        map[song.artists] = (map[song.artists] || 0) + 1;
        return map;
    }, {});

    const topArtist = Object.entries(artistFrequency)
        .sort(([, a], [, b]) => b - a)
        .map(([artist]) => artist)[0] || 'N/A';

    const mood = avgDurationMs > 220000 ? 'Chill Vibes 🎧' : 'Energetic Pulse ⚡';
    const averageDuration = formatDuration(avgDurationMs);
    const durationString = `${averageDuration} avg • ${formatDuration(totalDuration)} total`;

    document.getElementById('stats').innerHTML = `
        <div class="stat-row"><strong>${total}</strong><span>Total Tracks</span></div>
        <div class="stat-row"><strong>${topArtist}</strong><span>Top Artist</span></div>
        <div class="stat-row"><strong>${durationString}</strong><span>Duration</span></div>
        <div class="stat-row"><strong>${mood}</strong><span>Playlist Mood</span></div>
    `;

    showChart(artistFrequency);
}

function showChart(count) {
    const ctx = document.getElementById('chart');
    const labels = Object.keys(count);
    const data = Object.values(count);
    const backgroundColors = labels.map((_, index) => {
        const palette = ['#38bdf8', '#22c55e', '#8b5cf6', '#f97316', '#60a5fa', '#facc15', '#ec4899'];
        return palette[index % palette.length];
    });

    if (playlistChart) {
        playlistChart.destroy();
    }

    playlistChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: backgroundColors,
                borderColor: 'rgba(15,23,42,0.8)',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#cbd5e1', padding: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: context => `${context.label}: ${context.formattedValue} track${context.raw === 1 ? '' : 's'}`
                    }
                }
            }
        }
    });
}

function formatDuration(ms) {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function handlePreview(player) {
    if (currentPreview && currentPreview !== player) {
        currentPreview.pause();
    }
    currentPreview = player;
}

window.addEventListener('DOMContentLoaded', () => {
    setLoading('Ready to analyze your playlist.');
    renderFavorites();
});
