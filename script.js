const client_key = "275d762c21f3a57f54f0001eefef97ab";
const api_url = "https://api.themoviedb.org/3";
const img_path = "https://image.tmdb.org/t/p/w500";
const drive_api = "https://script.google.com/macros/s/AKfycbxK21Hi11PyGJ96T3_YhGWBOQvkSTtAnWvQckUXofBemfLW_AFVM1w3fqAl4RceCBWB/exec";

let allFiles = [];
let currentPage = 1;
const itemsPerPage = 20;

// Cleaner + Year Extractor
function extractTitleAndYear(fileName) {
  let name = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
  name = name.replace(/[\._]/g, " ");           // . and _ to space

  let yearMatch = name.match(/\b(19|20)\d{2}\b/);
  let year = yearMatch ? yearMatch[0] : null;

  name = name.replace(/[\(\)\[\]]/g, "");        // Remove brackets
  name = name.replace(/\b(19|20)\d{2}\b/, "");   // Remove year
  name = name.replace(/\b(480p|720p|1080p|2160p|BluRay|WEBRip|HDRip|x264|x265|HEVC|AAC|MP4|MKV|Dual Audio|Hindi|Bangla|English|BDRip|BRRip|HDCAM|WEB-DL)\b/gi, "");

  return {
    title: name.trim(),
    year: year
  };
}

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

async function loadPage(page) {
  const container = document.getElementById("movies");
  container.innerHTML = "";

  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;

  const currentItems = allFiles.slice(start, end);

  const promises = currentItems.map(async (file) => {
    const { title, year } = extractTitleAndYear(file.name);
    const query = encodeURIComponent(title);

    let poster = file.url;
    let finalTitle = file.name;

    let tmdbUrl = `${api_url}/search/movie?api_key=${client_key}&query=${query}`;
    if (year) {
      tmdbUrl += `&year=${year}`;
    }

    let tmdbRes = await fetch(tmdbUrl);
    let tmdbData = await tmdbRes.json();

    if (tmdbData.results && tmdbData.results.length > 0) {
      const movie = tmdbData.results[0];
      if (movie.poster_path) {
        poster = img_path + movie.poster_path;
      }
      finalTitle = movie.title;
    } else {
      // Try TV
      tmdbUrl = `${api_url}/search/tv?api_key=${client_key}&query=${query}`;
      tmdbRes = await fetch(tmdbUrl);
      tmdbData = await tmdbRes.json();

      if (tmdbData.results && tmdbData.results.length > 0) {
        const show = tmdbData.results[0];
        if (show.poster_path) {
          poster = img_path + show.poster_path;
        }
        finalTitle = show.name;
      }
    }

    const card = createMovieCard(poster, finalTitle);
    container.appendChild(card);
  });

  await Promise.all(promises);
  updatePaginationControls();
}

function updatePaginationControls() {
  document.getElementById("pagination").innerHTML = `
    <button onclick="prevPage()" ${currentPage === 1 ? "disabled" : ""}>Previous</button>
    <span>Page ${currentPage} of ${Math.ceil(allFiles.length / itemsPerPage)}</span>
    <button onclick="nextPage()" ${currentPage * itemsPerPage >= allFiles.length ? "disabled" : ""}>Next</button>
  `;
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadPage(currentPage);
  }
}

function nextPage() {
  if (currentPage * itemsPerPage < allFiles.length) {
    currentPage++;
    loadPage(currentPage);
  }
}

async function fetchFiles() {
  const res = await fetch(drive_api);
  const files = await res.json();
  allFiles = files;
  currentPage = 1;
  loadPage(currentPage);
}

fetchFiles();
