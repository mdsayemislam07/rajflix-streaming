const client_key = "275d762c21f3a57f54f0001eefef97ab";
const api_url = "https://api.themoviedb.org/3";
const img_path = "https://image.tmdb.org/t/p/w500";
const drive_api = "https://script.google.com/macros/s/AKfycbxK21Hi11PyGJ96T3_YhGWBOQvkSTtAnWvQckUXofBemfLW_AFVM1w3fqAl4RceCBWB/exec";

let allFiles = [];
let currentPage = 1;
const itemsPerPage = 20;

// Cache object for TMDB results
const tmdbCache = new Map();

// Title Cleaner + Year Extractor
function extractTitleAndYear(fileName) {
  let name = fileName.replace(/\.[^/.]+$/, "");
  name = name.replace(/[\._]/g, " ");
  let yearMatch = name.match(/\b(19|20)\d{2}\b/);
  let year = yearMatch ? yearMatch[0] : null;
  name = name.replace(/[\(\)\[\]]/g, "");
  name = name.replace(/\b(19|20)\d{2}\b/, "");
  name = name.replace(/\b(480p|720p|1080p|2160p|BluRay|WEBRip|HDRip|x264|x265|HEVC|AAC|MP4|MKV|Dual Audio|Hindi|Bangla|English|BDRip|BRRip|HDCAM|WEB-DL)\b/gi, "");
  return { title: name.trim(), year: year };
}

// TMDB Search with cache
async function searchTMDB(title, year) {
  const cacheKey = `${title.toLowerCase()}_${year || ""}`;
  if (tmdbCache.has(cacheKey)) {
    return tmdbCache.get(cacheKey);
  }

  let query = encodeURIComponent(title);
  let movieUrl = `${api_url}/search/movie?api_key=${client_key}&query=${query}`;
  if (year) movieUrl += `&year=${year}`;

  try {
    let res = await fetch(movieUrl);
    let data = await res.json();

    if (data.results && data.results.length > 0) {
      const result = { poster: data.results[0].poster_path, title: data.results[0].title };
      tmdbCache.set(cacheKey, result);
      return result;
    }

    // Try TV shows if no movie found
    let tvUrl = `${api_url}/search/tv?api_key=${client_key}&query=${query}`;
    res = await fetch(tvUrl);
    data = await res.json();

    if (data.results && data.results.length > 0) {
      const result = { poster: data.results[0].poster_path, title: data.results[0].name };
      tmdbCache.set(cacheKey, result);
      return result;
    }

    // No results
    tmdbCache.set(cacheKey, null);
    return null;
  } catch (error) {
    console.error("TMDB fetch error:", error);
    return null;
  }
}

// Create Movie Card
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

// Load page and show posters
async function loadPage(page) {
  const container = document.getElementById("movies");
  container.innerHTML = "";
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const currentItems = allFiles.slice(start, end);

  const promises = currentItems.map(async (file) => {
    const { title, year } = extractTitleAndYear(file.name);
    let poster = file.url; // fallback to drive thumbnail
    let finalTitle = file.name;

    const tmdbResult = await searchTMDB(title, year);
    if (tmdbResult && tmdbResult.poster) {
      poster = img_path + tmdbResult.poster;
      finalTitle = tmdbResult.title;
    }

    const card = createMovieCard(poster, finalTitle);
    container.appendChild(card);
  });

  await Promise.all(promises);
  updatePaginationControls();
}

// Pagination controls
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

// Fetch files from Google Drive API
async function fetchFiles() {
  try {
    const res = await fetch(drive_api);
    const files = await res.json();
    allFiles = files;
    currentPage = 1;
    loadPage(currentPage);
  } catch (error) {
    console.error("Drive API fetch error:", error);
  }
}

fetchFiles();
