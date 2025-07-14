const client_key = "275d762c21f3a57f54f0001eefef97ab";
const api_url = "https://api.themoviedb.org/3";
const img_path = "https://image.tmdb.org/t/p/w500";

const drive_api = "https://script.google.com/macros/s/AKfycbxK21Hi11PyGJ96T3_YhGWBOQvkSTtAnWvQckUXofBemfLW_AFVM1w3fqAl4RceCBWB/exec";

// Clean function (Best Match)
function cleanFileName(fileName) {
  fileName = fileName.replace(/\.[^/.]+$/, ""); // Extension remove
  fileName = fileName.replace(/[\._]/g, " ");   // . _ replace with space
  fileName = fileName.replace(/\b(480p|720p|1080p|2160p|BluRay|WEBRip|HDRip|x264|x265|HEVC|AAC|MP4|MKV|Dual Audio|Hindi|Bangla|English|BDRip|BRRip|HDCAM|WEB-DL)\b/gi, "");
  fileName = fileName.replace(/\b(19|20)\d{2}\b/g, ""); // Year Remove
  return fileName.trim();
}

async function fetchFiles() {
  const res = await fetch(drive_api);
  const files = await res.json();

  for (const file of files) {
    const cleanName = cleanFileName(file.name);
    const query = encodeURIComponent(cleanName);
    const tmdb_url = `${api_url}/search/movie?api_key=${client_key}&query=${query}`;
    
    try {
      const tmdb_res = await fetch(tmdb_url);
      const tmdb_data = await tmdb_res.json();

      let poster = "";
      let title = "";

      if (tmdb_data.results && tmdb_data.results.length > 0) {
        const movie = tmdb_data.results[0];
        poster = movie.poster_path ? img_path + movie.poster_path : file.url;
        title = movie.title;
      } else {
        // No TMDB Match, fallback to Drive image
        poster = file.url;
        title = file.name;
      }

      document.getElementById("movies").innerHTML += `
        <div class="movie">
          <img src="${poster}" alt="${title}">
          <div class="movie-title">${title}</div>
        </div>
      `;

    } catch (err) {
      console.error("Error fetching TMDB:", err);
    }
  }
}

fetchFiles();
