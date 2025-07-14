const client_key = "275d762c21f3a57f54f0001eefef97ab";
const api_url = "https://api.themoviedb.org/3";
const img_path = "https://image.tmdb.org/t/p/w500";
const drive_api = "https://script.google.com/macros/s/AKfycbxK21Hi11PyGJ96T3_YhGWBOQvkSTtAnWvQckUXofBemfLW_AFVM1w3fqAl4RceCBWB/exec";

// Better cleaner function
function cleanFileName(fileName) {
  fileName = fileName.replace(/\.[^/.]+$/, ""); // Extension remove
  fileName = fileName.replace(/[\._]/g, " ");   // . _ replace with space
  fileName = fileName.replace(/\b(480p|720p|1080p|2160p|BluRay|WEBRip|HDRip|x264|x265|HEVC|AAC|MP4|MKV|Dual Audio|Hindi|Bangla|English|BDRip|BRRip|HDCAM|WEB-DL)\b/gi, "");
  fileName = fileName.replace(/\b(19|20)\d{2}\b/g, ""); // Year Remove
  return fileName.trim();
}

// Create movie card safely
function createMovieCard(poster, title) {
  const card = document.createElement("div");
  card.className = "movie";

  const img = document.createElement("img");
  img.src = poster;
  img.alt = title;

  const caption = document.createElement("div");
  caption.className = "movie-title";
  caption.textContent = title;

  card.appendChild(img);
  card.appendChild(caption);

  return card;
}

async function fetchMovies() {
  const container = document.getElementById("movies");
  container.innerHTML = "";

  const res = await fetch(drive_api);
  const files = await res.json();

  const promises = files.map(async (file) => {
    const cleanName = cleanFileName(file.name);
    const query = encodeURIComponent(cleanName);

    let poster = file.url; // fallback to drive image
    let title = file.name;

    // Try Movie First
    let tmdbUrl = `${api_url}/search/movie?api_key=${client_key}&query=${query}`;
    let tmdbRes = await fetch(tmdbUrl);
    let tmdbData = await tmdbRes.json();

    if (tmdbData.results && tmdbData.results.length > 0) {
      const movie = tmdbData.results[0];
      if (movie.poster_path) {
        poster = img_path + movie.poster_path;
      }
      title = movie.title;
    } else {
      // Try TV if movie fails
      tmdbUrl = `${api_url}/search/tv?api_key=${client_key}&query=${query}`;
      tmdbRes = await fetch(tmdbUrl);
      tmdbData = await tmdbRes.json();

      if (tmdbData.results && tmdbData.results.length > 0) {
        const show = tmdbData.results[0];
        if (show.poster_path) {
          poster = img_path + show.poster_path;
        }
        title = show.name;
      }
    }

    const card = createMovieCard(poster, title);
    container.appendChild(card);
  });

  await Promise.all(promises); // Parallel Load
}

fetchMovies();
