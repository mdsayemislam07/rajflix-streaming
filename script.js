const api_url = "https://raj-flix.movielovers.workers.dev";
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
  let url = `${api_url}?type=movie&query=${query}`;
  if (year) url += `&year=${year}`;

  let res = await fetch(url);
  let data = await res.json();

  if (data.results && data.results.length > 0) {
    const result = { poster: img_path + data.results[0].poster_path, title: data.results[0].title };
    tmdbCache[cacheKey] = result;
    localStorage.setItem("tmdbCache", JSON.stringify(tmdbCache));
    return result;
  }

  url = `${api_url}?type=tv&query=${query}`;
  res = await fetch(url);
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

function createMovieCard(file, index) {
  const { title, year } = extractTitleAndYear(file.name);
  const cacheKey = `${title}_${year}`;
  const isNew = index < 8;

  const card = document.createElement("div");
  card.className = "movie";

  const skeleton = document.createElement("div");
  skeleton.className = "skeleton";

  const img = document.createElement("img");

  const caption = document.createElement("div");
  caption.className = "movie-title";
  caption.textContent = file.name;

  if (isNew) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "New";
    card.appendChild(badge);
  }

  card.appendChild(skeleton);
  card.appendChild(img);
  card.appendChild(caption);

  (async () => {
    let poster = null;
    let finalTitle = file.name;

    if (tmdbCache[cacheKey] && tmdbCache[cacheKey].poster) {
      poster = tmdbCache[cacheKey].poster;
      finalTitle = tmdbCache[cacheKey].title;
    } else {
      const tmdbResult = await searchTMDB(title, year);
      if (tmdbResult && tmdbResult.poster) {
        poster = tmdbResult.poster;
        finalTitle = tmdbResult.title;
      }
    }

    if (poster) {
      img.src = poster;
      img.alt = finalTitle;
      caption.textContent = finalTitle;
      img.onload = () => {
        skeleton.style.display = "none";
        img.style.display = "block";
        img.style.opacity = "1";
      };
    } else {
      skeleton.style.display = "none";
      img.style.display = "none";
    }
  })();

  return card;
}

function loadPage(page) {
  const container = document.getElementById("movies");
  container.innerHTML = "";

  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const currentItems = allFiles.slice(start, end);

  currentItems.forEach((file, index) => {
    const card = createMovieCard(file, index);
    container.appendChild(card);
  });

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
