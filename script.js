const client_key = "275d762c21f3a57f54f0001eefef97ab";
const api_url = "https://api.themoviedb.org/3";
const img_path = "https://image.tmdb.org/t/p/w500";

const drive_api = "https://script.google.com/macros/s/AKfycbxK21Hi11PyGJ96T3_YhGWBOQvkSTtAnWvQckUXofBemfLW_AFVM1w3fqAl4RceCBWB/exec";

function cleanFileName(fileName) {
  // Extension Remove
  fileName = fileName.replace(/\.[^/.]+$/, "");

  // Dot -> Space
  fileName = fileName.replace(/\./g, " ");

  // Resolution, Year, Extra Info Remove
  fileName = fileName.replace(/\b(480p|720p|1080p|2160p|BluRay|WEBRip|WEB-DL|HDRip|x264|x265|HEVC|AAC|MP4|MKV|Hindi|English|Dual Audio|Bangla|BDRip|BRRip|HDCAM)\b/gi, "");
  
  // Year Remove
  fileName = fileName.replace(/\b(19|20)\d{2}\b/g, "");

  // Trim Extra Spaces
  return fileName.trim();
}

async function fetchFiles() {
  const res = await fetch(drive_api);
  const files = await res.json();
  
  for (const file of files) {
    const cleanName = cleanFileName(file.name);
    const query = encodeURIComponent(cleanName);
    const tmdb_url = `${api_url}/search/movie?api_key=${client_key}&query=${query}`;
    
    const tmdb_res = await fetch(tmdb_url);
    const tmdb_data = await tmdb_res.json();
    
    if (tmdb_data.results && tmdb_data.results.length > 0) {
      const movie = tmdb_data.results[0];
      const poster = movie.poster_path ? img_path + movie.poster_path : file.url;
      
      document.getElementById("movies").innerHTML += `
        <div class="movie">
          <img src="${poster}" alt="${movie.title}">
          <div class="movie-title">${movie.title}</div>
        </div>
      `;
    } else {
      // যদি মেল না খায়, Drive preview দেখাবে
      document.getElementById("movies").innerHTML += `
        <div class="movie">
          <img src="${file.url}" alt="${file.name}">
          <div class="movie-title">${file.name}</div>
        </div>
      `;
    }
  }
}

fetchFiles();
