document.getElementById("areaButton").addEventListener("click", handleArea);
document.getElementById("volumeButton").addEventListener("click", handleVolume);

// --- AREA CALCULATION ---
function handleArea() {
  const file = document.getElementById("areaFile").files[0];
  const output = document.getElementById("areaOutput");

  if (!file) {
    output.textContent = "Upload eerst een CSV bestand.";
    return;
  }

  readCsv(file, coords => {
    if (coords.length < 3) {
      output.textContent = "Geen valide data.";
      return;
    }

    const areaSqM = shoelace(coords);
    const areaKm2 = areaSqM / 1_000_000;
    output.textContent = `Oppervlakte: ${areaSqM.toFixed(2)} m² (${areaKm2.toFixed(4)} km²)`;
  });
}

// --- VOLUME CALCULATION ---
function handleVolume() {
  const fileBottom = document.getElementById("bottomFile").files[0];
  const fileTop = document.getElementById("topFile").files[0];
  const height = parseFloat(document.getElementById("heightInput").value);
  const output = document.getElementById("volumeOutput");

  if (!fileBottom || !fileTop) {
    output.textContent = "Upload eerst de CSV bestanden.";
    return;
  }
  if (isNaN(height) || height <= 0) {
    output.textContent = "Vul een geldige hoogte in.";
    return;
  }

  // Read both files asynchronously
  Promise.all([
    readCsvAsync(fileBottom),
    readCsvAsync(fileTop)
  ]).then(([coordsBottom, coordsTop]) => {
    if (coordsBottom.length < 3 || coordsTop.length < 3) {
      output.textContent = "Geen valide data in een van de bestanden.";
      return;
    }

    const areaBottom = shoelace(coordsBottom);
    const areaTop = shoelace(coordsTop);
    //const volume = height * (areaBottom + areaTop) / 2;
    const volume = (height / 3) * (areaBottom + Math.sqrt(areaBottom * areaTop) + areaTop); // Frustum formula

    output.textContent = `Volume: ${volume.toFixed(2)} m³`;
  });
}

// --- CSV READING HELPERS ---
function readCsv(file, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const coords = parseCsv(text);
    callback(coords);
  };
  reader.readAsText(file);
}

function readCsvAsync(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => resolve(parseCsv(e.target.result));
    reader.readAsText(file);
  });
}

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).map(r => r.split(/[;,]/));
  // Assuming columns: fid, Meetpunt, X, Y
  return rows.slice(1).map(r => ({
    x: parseFloat(r[2]),
    y: parseFloat(r[3])
  })).filter(pt => !isNaN(pt.x) && !isNaN(pt.y));
}

// --- SHOE-LACE FORMULA ---
function shoelace(points) {
  let sum1 = 0;
  let sum2 = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    sum1 += points[i].x * points[j].y;
    sum2 += points[j].x * points[i].y;
  }
  return Math.abs((sum1 - sum2) / 2);
}