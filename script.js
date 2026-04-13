let playlist = [];
let likedSongs = JSON.parse(localStorage.getItem("liked")) || [];

async function loadSpotify() {
    document.getElementById("loading").innerText = "Loading... 🎧";

    let url = document.getElementById("playlistUrl").value;
    let id = url.split("playlist/")[1]?.split("?")[0];

    if (!id) {
        alert("Invalid Spotify link");
        return;
    }

    let token = prompt("Paste Spotify Access Token");

    try {
       let res = await fetch(`https://cors-anywhere.herokuapp.com/https://api.spotify.com/v1/playlists/${id}`, {
            headers: {
                Authorization: "Bearer " + token
            }
        });

        let data = await res.json();
console.log(data);

        playlist = data.tracks.items.map(item => ({
            name: item.track.name,
            artist: item.track.artists[0].name,
            duration: Math.floor(item.track.duration_ms / 1000),
            preview: item.track.preview_url
        }));

        displaySongs();
        showStats();

        document.getElementById("loading").innerText = "";

    } catch (err) {
        alert("Error loading playlist");
        console.log(err);
    }
}

function displaySongs() {
    let container = document.getElementById("songs");
    container.innerHTML = "";

    playlist.forEach((song, index) => {
        let liked = likedSongs.includes(song.name);

        let div = document.createElement("div");
        div.classList.add("song");

        div.innerHTML = `
            <b>${song.name}</b><br>
            ${song.artist} (${song.duration}s)
            <br><br>

            <button onclick="likeSong(${index})">
                ${liked ? "💚 Liked" : "❤️ Like"}
            </button>

            ${song.preview ? `<br><audio controls src="${song.preview}"></audio>` : "<br>No Preview"}
        `;

        container.appendChild(div);
    });
}

function likeSong(index) {
    let name = playlist[index].name;

    if (!likedSongs.includes(name)) {
        likedSongs.push(name);
    }

    localStorage.setItem("liked", JSON.stringify(likedSongs));
    displaySongs();
}

function searchSongs() {
    let input = document.getElementById("search").value.toLowerCase();
    let songs = document.getElementsByClassName("song");

    for (let i = 0; i < songs.length; i++) {
        let text = songs[i].innerText.toLowerCase();
        songs[i].style.display = text.includes(input) ? "block" : "none";
    }
}

function showStats() {
    let total = playlist.length;

    let count = {};
    playlist.forEach(song => {
        count[song.artist] = (count[song.artist] || 0) + 1;
    });

    let topArtist = Object.keys(count).reduce((a, b) =>
        count[a] > count[b] ? a : b
    );

    let avg = playlist.reduce((sum, s) => sum + s.duration, 0) / total;

    let mood = avg > 220 ? "Chill 🎧" : "Energetic ⚡";

    document.getElementById("stats").innerText =
        `Total: ${total} | Top Artist: ${topArtist} | Avg: ${avg.toFixed(1)}s | Mood: ${mood}`;

    showChart(count);
    showRecommendations(topArtist);
}

function showChart(count) {
    const ctx = document.getElementById('chart');

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(count),
            datasets: [{
                data: Object.values(count)
            }]
        }
    });
}

function showRecommendations(topArtist) {
    let rec = {
        "Arijit Singh": ["Channa Mereya", "Ae Dil Hai Mushkil"],
        "Shreya Ghoshal": ["Teri Ore", "Sun Raha Hai Female"]
    };

    let box = document.createElement("div");
    box.innerHTML = `<h3>Recommended Songs:</h3> ${(rec[topArtist] || ["Explore more 🎵"]).join(", ")}`;
    document.body.appendChild(box);
}