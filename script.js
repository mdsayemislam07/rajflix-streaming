const client_key = "275d762c21f3a57f54f0001eefef97ab";
const api_url = "https://api.themoviedb.org/3";
const img_path = "https://image.tmdb.org/t/p/w500";
const drive_api = "https://script.google.com/macros/s/AKfycbzh3fRccgpIXlskFuBHcEuWCQkQzWP7Rt8a8BedlgA2dnpI3YDNcOLGKnylmgXGfk7u/exec";

let allFiles = [];
let currentPage = 1;
const itemsPerPage = 20;

let tmdbCache = JSON.parse(localStorage.getItem("tmdbCache") || "{}");
let fileCache = JSON.parse(localStorage.getItem("fileCache") || "[]");

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

async function searchTMDB(title, year) {
  const cacheKey = `${title}_${year}`;
  if (tmdbCache[cacheKey]) return tmdbCache[cacheKey];

  let query = encodeURIComponent(title);
  let movieUrl = `${api_url}/search/movie?api_key=${client_key}&query=${query}`;
  if (year) movieUrl += `&year=${year}`;

  let res = await fetch(movieUrl);
  let data = await res.json();

  if (data.results && data.results.length > 0) {
    const result = { poster: img_path + data.results[0].poster_path, title: data.results[0].title };
    tmdbCache[cacheKey] = result;
    localStorage.setItem("tmdbCache", JSON.stringify(tmdbCache));
    return result;
  }

  let tvUrl = `${api_url}/search/tv?api_key=${client_key}&query=${query}`;
  res = await fetch(tvUrl);
  data = await res.json();

  if (data.results && data.results.length > 0) {
    const result = { poster: img_path + data.results[0].poster_path, title: data.results[0].name };
    tmdbCache[cacheKey] = result;
    localStorage.setItem("tmdbCache", JSON.stringify(tmdbCache));
    return result;
  }

  if (title.split(" ").length > 3) {
    let shortTitle = title.split(" ").slice(0, 3).join(" ");
    return await searchTMDB(shortTitle, null);
  }

  tmdbCache[cacheKey] = { poster: null, title: title };
  localStorage.setItem("tmdbCache", JSON.stringify(tmdbCache));
  return tmdbCache[cacheKey];
}

function createMovieCard(poster, title, isNew) {
  const card = document.createElement("div");
  card.className = "movie";

  const img = document.createElement("img");
  img.src = poster;
  img.alt = title;

  const caption = document.createElement("div");
  caption.className = "movie-title";
  caption.textContent = title;

  if (isNew) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "New";
    card.appendChild(badge);
  }

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

  const promises = currentItems.map(async (file, index) => {
    const { title, year } = extractTitleAndYear(file.name);
    const cacheKey = `${title}_${year}`;

    let poster = file.url;
    let finalTitle = file.name;

    if (tmdbCache[cacheKey]) {
      if (tmdbCache[cacheKey].poster) {
        poster = tmdbCache[cacheKey].poster;
        finalTitle = tmdbCache[cacheKey].title;
      } else {
        poster = file.url; // fallback to drive image
        finalTitle = tmdbCache[cacheKey].title;
      }
    } else {
      const tmdbResult = await searchTMDB(title, year);
      if (tmdbResult && tmdbResult.poster) {
        poster = tmdbResult.poster;
        finalTitle = tmdbResult.title;
      } else {
        poster = file.url; // fallback
        finalTitle = title;
      }
    }

    const isNew = index < 8;
    const card = createMovieCard(poster, finalTitle, isNew);
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
  const res = await fetch(drive_api + "?t=" + new Date().getTime());
  const files = await res.json();

  const oldFileNames = fileCache.map(f => f.name);
  const newFiles = files.filter(f => !oldFileNames.includes(f.name));

  fileCache = files;
  localStorage.setItem("fileCache", JSON.stringify(fileCache));

  allFiles = files;
  currentPage = 1;
  loadPage(currentPage);
}

setInterval(fetchFiles, 30000);

if (fileCache.length > 0) {
  allFiles = fileCache;
  loadPage(currentPage);
} else {
  fetchFiles();
}
