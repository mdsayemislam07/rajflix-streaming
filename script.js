const client_key = "275d762c21f3a57f54f0001eefef97ab";  
const api_proxy_url = "https://raj-flix.movielovers.workers.dev";  
const img_path = "https://image.tmdb.org/t/p/w500";  
const drive_api = "https://script.google.com/macros/s/AKfycbzh3fRccgpIXlskFuBHcEuWCQkQzWP7Rt8a8BedlgA2dnpI3YDNcOLGKnylmgXGfk7u/exec";  
  
let allFiles = [];  
let currentPage = 1;  
const itemsPerPage = 20;  
const cache = JSON.parse(localStorage.getItem("tmdbCache") || "{}");  
  
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
  
// TMDB Search Logic with Proxy & Cache  
async function searchTMDB(title, year) {  
  const cacheKey = `${title}_${year}`;  
  if (cache[cacheKey]) return cache[cacheKey];  
  
  let query = encodeURIComponent(title);  
  let type = "movie";  
  let url = `${api_proxy_url}/search/${type}?query=${query}`;  
  if (year) url += `&year=${year}`;  
  
  let res = await fetch(url);  
  let data = await res.json();  
  
  if (data.results && data.results.length > 0) {  
    const result = { poster: data.results[0].poster_path, title: data.results[0].title };  
    cache[cacheKey] = result;  
    localStorage.setItem("tmdbCache", JSON.stringify(cache));  
    return result;  
  }  
  
  // Try TV search fallback  
  type = "tv";  
  url = `${api_proxy_url}/search/${type}?query=${query}`;  
  res = await fetch(url);  
  data = await res.json();  
  
  if (data.results && data.results.length > 0) {  
    const result = { poster: data.results[0].poster_path, title: data.results[0].name };  
    cache[cacheKey] = result;  
    localStorage.setItem("tmdbCache", JSON.stringify(cache));  
    return result;  
  }  
  
  // Try shorter query fallback  
  if (title.split(" ").length > 3) {  
    let shortTitle = title.split(" ").slice(0, 3).join(" ");  
    return await searchTMDB(shortTitle, null);  
  }  
  
  cache[cacheKey] = null;  
  localStorage.setItem("tmdbCache", JSON.stringify(cache));  
  return null;  
}  
  
// Create Movie Card  
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
  
    const isNew = index < 8;  
    const card = createMovieCard(poster, finalTitle, isNew);  
    container.appendChild(card);  
  });  
  
  await Promise.all(promises);  
  updatePaginationControls();  
}  
  
// Pagination Controls  
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
  
// Fetch files from Drive API  
async function fetchFiles() {  
  const res = await fetch(drive_api + "?t=" + new Date().getTime()); // Prevent browser cache  
  const files = await res.json();  
  allFiles = files;  
  currentPage = 1;  
  loadPage(currentPage);  
}  
  
// Auto Refresh Every 10 minutes  
setInterval(fetchFiles, 10 * 60 * 1000);  
  
fetchFiles();
