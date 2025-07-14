const client_key = "275d762c21f3a57f54f0001eefef97ab";  
const api_url = "https://api.themoviedb.org/3";  
const img_path = "https://image.tmdb.org/t/p/w500";  
const drive_api = "https://script.google.com/macros/s/AKfycbxK21Hi11PyGJ96T3_YhGWBOQvkSTtAnWvQckUXofBemfLW_AFVM1w3fqAl4RceCBWB/exec";  
  
let allFiles = [];  
let currentPage = 1;  
const itemsPerPage = 20;  
  
const tmdbCache = JSON.parse(localStorage.getItem("tmdbCache") || "{}");  
function saveTMDBCache() {  
  localStorage.setItem("tmdbCache", JSON.stringify(tmdbCache));  
}  
  
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
  const cacheKey = `${title.toLowerCase()}|${year || ''}`;  
  if (tmdbCache[cacheKey]) {  
    return tmdbCache[cacheKey];  
  }  
  
  let query = encodeURIComponent(title);  
  let movieUrl = `${api_url}/search/movie?api_key=${client_key}&query=${query}`;  
  if (year) movieUrl += `&year=${year}`;  
  
  let res = await fetch(movieUrl);  
  let data = await res.json();  
  
  if (data.results && data.results.length > 0) {  
    const result = { poster: data.results[0].poster_path, title: data.results[0].title };  
    tmdbCache[cacheKey] = result;  
    saveTMDBCache();  
    return result;  
  }  
  
  let tvUrl = `${api_url}/search/tv?api_key=${client_key}&query=${query}`;  
  res = await fetch(tvUrl);  
  data = await res.json();  
  
  if (data.results && data.results.length > 0) {  
    const result = { poster: data.results[0].poster_path, title: data.results[0].name };  
    tmdbCache[cacheKey] = result;  
    saveTMDBCache();  
    return result;  
  }  
  
  if (title.split(" ").length > 3) {  
    let shortTitle = title.split(" ").slice(0, 3).join(" ");  
    const result = await searchTMDB(shortTitle, null);  
    tmdbCache[cacheKey] = result;  
    saveTMDBCache();  
    return result;  
  }  
  
  tmdbCache[cacheKey] = null;  
  saveTMDBCache();  
  return null;  
}  
  
function createMovieCard(poster, title, isRecent) {  
  const card = document.createElement("div");  
  card.className = "movie";  
  
  const img = document.createElement("img");  
  img.src = poster;  
  img.alt = title;  
  img.loading = "lazy"; // Lazy Load  
  
  const caption = document.createElement("div");  
  caption.className = "movie-title";  
  caption.textContent = title;  
  
  if (isRecent) {  
    const badge = document.createElement("span");  
    badge.textContent = "Recently Uploaded";  
    badge.style.background = "#ff4757";  
    badge.style.color = "#fff";  
    badge.style.padding = "2px 6px";  
    badge.style.fontSize = "10px";  
    badge.style.marginLeft = "5px";  
    badge.style.borderRadius = "4px";  
    caption.appendChild(badge);  
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
    let poster = file.url;  
    let finalTitle = file.name;  
  
    const tmdbResult = await searchTMDB(title, year);  
    if (tmdbResult && tmdbResult.poster) {  
      poster = img_path + tmdbResult.poster;  
      finalTitle = tmdbResult.title;  
    }  
  
    const isRecent = (start + index) < 3; // Top 3 items  
  
    const card = createMovieCard(poster, finalTitle, isRecent);  
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
  let cachedFiles = localStorage.getItem("driveFiles");  
  if (cachedFiles) {  
    allFiles = JSON.parse(cachedFiles);  
    currentPage = 1;  
    loadPage(currentPage);  
    return;  
  }  
  
  const res = await fetch(drive_api);  
  const files = await res.json();  
  allFiles = files;  
  localStorage.setItem("driveFiles", JSON.stringify(files));  
  currentPage = 1;  
  loadPage(currentPage);  
}  
  
fetchFiles();
