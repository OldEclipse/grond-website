document.getElementById("fileInput").addEventListener("change", handleFile);

function handleFile(event) {
  const file = event.target.files[0];
  const output = document.getElementById("output");

if (!file) {
    output.textContent = "Please upload a CSV file.";
    return;
}

const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;

    // Split into rows, handle both comma and semicolon CSVs
    const rows = text.trim().split(/\r?\n/).map(r => r.split(/[;,]/));

    // Assuming columns: fid, Meetpunt, X, Y
    const coords = rows.slice(1).map(r => ({
      x: parseFloat(r[2]),
      y: parseFloat(r[3])
    })).filter(pt => !isNaN(pt.x) && !isNaN(pt.y));

    if (coords.length < 3) {
      output.textContent = "Not enough valid points to form an area.";
      return;
    }

    const areaSqM = shoelace(coords);
    const areaKm2 = areaSqM / 1_000_000;

    output.textContent = `Calculated area: ${areaSqM.toFixed(2)} m² (${areaKm2.toFixed(4)} km²)`;
  };

  reader.readAsText(file);
}

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