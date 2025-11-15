document.getElementById("areaButton").addEventListener("click", handleArea);
document.getElementById("volumeButton").addEventListener("click", handleVolume);
document.getElementById("weightButton").addEventListener("click", handleWeight);

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
  const heightInput = parseFloat(document.getElementById("heightInput").value);
  const output = document.getElementById("volumeOutput");
  const gridOutput = document.getElementById("gridOutput");

  if (!fileBottom || !fileTop) {
    output.textContent = "Upload beide CSV bestanden (grondvlak en bovenvlak).";
    return;
  }

  // Read both files asynchronously
  Promise.all([
    readCsvWithZAsync(fileBottom),
    readCsvWithZAsync(fileTop)
  ]).then(([dataBottom, dataTop]) => {
    if (dataBottom.length < 3 || dataTop.length < 3) {
      output.textContent = "Geen valide data in een van de bestanden.";
      return;
    }

    // Determine height
    let height;
    if (!isNaN(heightInput) && heightInput > 0) {
      // Use provided height
      height = heightInput;
    } else if (dataBottom.some(p => p.z !== undefined) && dataTop.some(p => p.z !== undefined)) {
      // Calculate height from average Z values
      const avgZBottom = dataBottom.reduce((sum, p) => sum + (p.z || 0), 0) / dataBottom.length;
      const avgZTop = dataTop.reduce((sum, p) => sum + (p.z || 0), 0) / dataTop.length;
      height = Math.abs(avgZTop - avgZBottom);
      output.textContent = `Berekend hoogteverschil: ${height.toFixed(2)} m. `;
    } else {
      output.textContent = "Voer een hoogte in of zorg dat beide CSV bestanden een z kolom hebben.";
      return;
    }

    if (height <= 0) {
      output.textContent = "De hoogte moet groter zijn dan 0.";
      return;
    }

    const coordsBottom = dataBottom.map(p => ({ x: p.x, y: p.y }));
    const coordsTop = dataTop.map(p => ({ x: p.x, y: p.y }));

    const areaBottom = shoelace(coordsBottom);
    const areaTop = shoelace(coordsTop);
    const volume = (height / 3) * (areaBottom + Math.sqrt(areaBottom * areaTop) + areaTop); // Frustum formula

    if (!isNaN(heightInput) && heightInput > 0) {
      output.textContent = `Volume: ${volume.toFixed(2)} m³`;
    } else {
      output.textContent += `Volume: ${volume.toFixed(2)} m³`;
    }

    const grid = Math.sqrt(volume / 50);
    gridOutput.textContent = `Raster: ${grid.toFixed(2)} m`;
    
    // Set the calculated volume as the default value in the weight calculator
    document.getElementById("volumeInput").value = volume.toFixed(2);
  }).catch(error => {
    output.textContent = "Fout: " + error.message;
  });
}

// --- WEIGHT CALCULATION ---
function handleWeight() {
  const volume = parseFloat(document.getElementById("volumeInput").value);
  const density = parseFloat(document.getElementById("densityInput").value);
  const output = document.getElementById("weightOutput");

  if (isNaN(volume) || volume <= 0) {
    output.textContent = "Vul een geldig volume in.";
    return;
  }

  if (isNaN(density) || density <= 0) {
    output.textContent = "Vul een geldige dichtheid in.";
    return;
  }

  const weight = volume * density; // in ton
  output.textContent = `Gewicht: ${weight.toFixed(2)} ton`;
}

// --- CSV READING HELPERS ---
function readCsv(file, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text = e.target.result;
      const coords = parseCsv(text);
      callback(coords);
    } catch (error) {
      callback([]);
      document.getElementById("areaOutput").textContent = "Fout: " + error.message;
    }
  };
  reader.readAsText(file);
}

function readCsvAsync(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        resolve(parseCsv(e.target.result));
      } catch (error) {
        document.getElementById("volumeOutput").textContent = "Fout: " + error.message;
        resolve([]);
      }
    };
    reader.readAsText(file);
  });
}

function readCsvWithZAsync(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        resolve(parseCsvWithZ(e.target.result));
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });
}

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).map(r => r.split(/[;,]/));
  
  // Find X and Y column indices from header
  const header = rows[0].map(col => col.toLowerCase().trim());
  const xIndex = header.findIndex(col => col === 'x');
  const yIndex = header.findIndex(col => col === 'y');
  
  if (xIndex === -1 || yIndex === -1) {
    throw new Error('Kolommen X en Y niet gevonden in de header.');
  }
  
  return rows.slice(1).map(r => ({
    x: parseFloat(r[xIndex]),
    y: parseFloat(r[yIndex])
  })).filter(pt => !isNaN(pt.x) && !isNaN(pt.y));
}

function parseCsvWithZ(text) {
  const rows = text.trim().split(/\r?\n/).map(r => r.split(/[;,]/));
  
  // Find X, Y, and Z column indices from header
  const header = rows[0].map(col => col.toLowerCase().trim());
  const xIndex = header.findIndex(col => col === 'x');
  const yIndex = header.findIndex(col => col === 'y');
  const zIndex = header.findIndex(col => col === 'z');
  
  if (xIndex === -1 || yIndex === -1) {
    throw new Error('Kolommen X en Y niet gevonden in de header.');
  }
  
  return rows.slice(1).map(r => {
    const point = {
      x: parseFloat(r[xIndex]),
      y: parseFloat(r[yIndex])
    };
    if (zIndex !== -1) {
      point.z = parseFloat(r[zIndex]);
    }
    return point;
  }).filter(pt => !isNaN(pt.x) && !isNaN(pt.y));
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