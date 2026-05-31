// =============================================================
//  Helper Import CSV (Alpha 0.7)
//  Lit un fichier CSV (séparateur ; ou ,) et retourne les lignes
//  parsées en objets {colonne: valeur}, en utilisant la première
//  ligne comme en-tête. Gère les guillemets et BOM UTF-8.
//
//  Usage :
//    const rows = await parseCSV(file);
//    // rows = [{nom: "Dupont", prenom: "Jean", ...}, ...]
// =============================================================

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        resolve(parseCSVText(text));
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsText(file, "utf-8");
  });
}

// Parser CSV avec gestion des guillemets et du séparateur auto-détecté
export function parseCSVText(text) {
  // Retirer BOM UTF-8 éventuel
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  // Auto-détection du séparateur : on regarde la première ligne
  const firstLine = text.split(/\r?\n/)[0] || "";
  const sep = firstLine.includes(";") ? ";" : ",";

  const lines = splitCSVLines(text);
  if (lines.length === 0) return [];

  const header = splitCSVRow(lines[0], sep).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = splitCSVRow(lines[i], sep);
    const obj = {};
    for (let c = 0; c < header.length; c++) obj[header[c]] = (cells[c] || "").trim();
    rows.push(obj);
  }
  return rows;
}

// Découpe le texte en lignes, en respectant les guillemets (qui peuvent contenir \n)
function splitCSVLines(text) {
  const lines = []; let cur = ""; let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQuote = !inQuote; cur += ch; }
    else if ((ch === "\n" || ch === "\r") && !inQuote) {
      if (cur.length > 0) { lines.push(cur); cur = ""; }
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

// Découpe une ligne en cellules selon le séparateur, en respectant les guillemets
function splitCSVRow(line, sep) {
  const cells = []; let cur = ""; let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === sep && !inQuote) {
      cells.push(cur); cur = "";
    } else cur += ch;
  }
  cells.push(cur);
  return cells;
}
