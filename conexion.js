const GOOGLE_SHEET_PUB_ID =
  "2PACX-1vQ7hsMlqMyklZrLnhADWz9kjghRg168XAc5nkB4LUyxmPX8Mq0qX7wmiUTQah20PsdttG2ggoqOENKC";
const SHEET_NAMES = ["cuotasEmitidas", "cuotasFuturas"];
const SHEET_GID = {
  cuotasEmitidas: "0",
  cuotasFuturas: "1072911685",
};

function buildCsvUrl(sheetName) {
  const gid = SHEET_GID[sheetName];
  if (!gid) {
    throw new Error(`No existe GID configurado para la hoja ${sheetName}.`);
  }

  return `https://docs.google.com/spreadsheets/d/e/${GOOGLE_SHEET_PUB_ID}/pub?gid=${gid}&single=true&output=csv`;
}

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];

    if (char === '"') {
      if (inQuotes && csvText[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && csvText[i + 1] === "\n") {
        i += 1;
      }
      row.push(cell.trim());
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value !== "")) {
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(header) {
  return String(header || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[°º]/g, "")
    .trim();
}

function mapHeaderToKey(header) {
  const normalized = normalizeHeader(header);
  if (["n", "nro", "numero", "número", "numero de cuota", "n de cuota"].includes(normalized)) {
    return "nro";
  }
  if (["vencimiento", "fecha de vencimiento", "fecha vencimiento", "vto"].includes(normalized)) {
    return "vencimiento";
  }
  if (["valor uva", "valoruva", "uva", "valor uva al vencimiento"].includes(normalized)) {
    return "valorUva";
  }
  if (["capital uva", "capitaluva"].includes(normalized)) {
    return "capitalUva";
  }
  if (["capital $", "capital pesos", "capital en pesos", "capital"].includes(normalized)) {
    return "capitalPesos";
  }
  if (["intereses", "interes", "interés"].includes(normalized)) {
    return "intereses";
  }
  if (["total", "total cuota", "importe total"].includes(normalized)) {
    return "total";
  }
  return null;
}

function parseSheetRows(rows) {
  if (!rows.length) {
    return [];
  }

  const [headers, ...dataRows] = rows;
  const headerKeys = headers.map((header) => mapHeaderToKey(header));

  return dataRows.map((row) => {
    const entry = {
      nro: "",
      vencimiento: "",
      valorUva: "",
      capitalUva: "",
      capitalPesos: "",
      intereses: "",
      total: "",
    };

    row.forEach((cell, index) => {
      const key = headerKeys[index];
      if (!key) {
        return;
      }
      entry[key] = String(cell || "");
    });

    return entry;
  });
}

async function fetchSheetTable(sheetName) {
  const url = buildCsvUrl(sheetName);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo obtener la hoja ${sheetName} (HTTP ${response.status}).`);
  }

  const csvText = await response.text();
  const rows = parseCsv(csvText);
  if (!rows.length) {
    throw new Error(`La hoja ${sheetName} está vacía o no se pudo parsear el CSV.`);
  }

  return parseSheetRows(rows);
}

async function cargarCuotasGoogleSheet() {
  const [cuotasEmitidas, cuotasFuturas] = await Promise.all(
    SHEET_NAMES.map((sheetName) => fetchSheetTable(sheetName))
  );
  return { cuotasEmitidas, cuotasFuturas };
}

window.cargarCuotasGoogleSheet = cargarCuotasGoogleSheet;
