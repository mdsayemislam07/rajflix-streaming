const proxy_api = "https://raj-flix.movielovers.workers.dev/";
const img_path = "https://image.tmdb.org/t/p/w500";
const drive_api = "https://script.google.com/macros/s/AKfycbxiZQffAaRXzgq_w8tcP-Sal5xq-sqsTC5GKBeAJkxKPUNkgNfxATJ21HL8CjPq79MN/exec";

let allFiles = [];
let currentPage = 1;
const itemsPerPage = 20;
const cacheKey = "tmdbCacheV1";
let tmdbCache = JSON.parse(localStorage.getItem(cacheKey)) || {};

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

// TMDB Search with Proxy & Cache
async function searchTMDB(title, year) {
  let cacheKeyTitle = `${title}_${year || ""}`;
  if (tmdbCache[cacheKeyTitle]) return tmdbCache[cacheKeyTitle];

  let url = `${proxy_api}?type=movie&query=${encodeURIComponent(title)}`;
  if (year) url += `&year=${year}`;

  let res = await fetch(url);
  let data = await res.json();

  if (data.results && data.results.length > 0) {
    tmdbCache[cacheKeyTitle] = { poster: data.results[0].poster_path, title: data.results[0].title };
    localStorage.setItem(cacheKey, JSON.stringify(tmdbCache));
    return tmdbCache[cacheKeyTitle];
  }

  // Try TV
  url = `${proxy_api}?type=tv&query=${encodeURIComponent(title)}`;
  res = await fetch(url);
  data = await res.json();

  if (data.results && data.results.length > 0) {
    tmdbCache[cacheKeyTitle] = { poster: data.results[0].poster_path, title: data.results[0].name };
    localStorage.setItem(cacheKey, JSON.stringify(tmdbCache));
    return tmdbCache[cacheKeyTitle];
  }

  // Shorter query fallback
  if (title.split(" ").length > 3) {
    let shortTitle = title.split(" ").slice(0, 3).join(" ");
    return await searchTMDB(shortTitle, null);
  }

  tmdbCache[cacheKeyTitle] = null;
  localStorage.setItem(cacheKey, JSON.stringify(tmdbCache));
  return null;
}

// Create Movie Card
function createMovieCard(poster, title, isRecent) {
  const card = document.createElement("div");
  card.className = "movie";

  const img = document.createElement("img");
  img.loading = "lazy";
  img.src = poster;
  img.alt = title;

  const caption = document.createElement("div");
  caption.className = "movie-title";
  caption.textContent = title;

  if (isRecent) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "New";
    card.appendChild(badge);
  }

  card.appendChild(img);
  card.appendChild(caption);
  return card;
}

// Load Page
async function loadPage(page) {
  const container = document.getElementById("movies");
  container.innerHTML = "";
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const currentItems = allFiles.slice(start, end);

  const promises = currentItems.map(async (file, index) => {
    const { title, year } = extractTitleAndYear(file.name);
    let poster = file.url;
    let finalTitle = file.name;

    const tmdbResult = await searchTMDB(title, year);
    if (tmdbResult && tmdbResult.poster) {
      poster = img_path + tmdbResult.poster;
      finalTitle = tmdbResult.title;
    }

    const isRecent = index < 8 && page === 1;
    const card = createMovieCard(poster, finalTitle, isRecent);
    container.appendChild(card);
  });

  await Promise.all(promises);
  updatePaginationControls();
}

// Pagination
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

// Fetch Files with Newest First Sort
async function fetchFiles() {
  const res = await fetch(drive_api);
  const files = await res.json();

  // Sort by time (newest first)
  allFiles = files.sort((a, b) => new Date(b.time) - new Date(a.time));

  currentPage = 1;
  loadPage(currentPage);
}

fetchFiles();
setInterval(fetchFiles, 30 * 1000); // 30 sec auto refresh
