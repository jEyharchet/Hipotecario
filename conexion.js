const SHEET_URLS = {
  cuotasEmitidas:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7hsMlqMyklZrLnhADWz9kjghRg168XAc5nkB4LUyxmPX8Mq0qX7wmiUTQah20PsdttG2ggoqOENKC/pub?gid=0&single=true&output=csv",
  cuotasFuturas:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7hsMlqMyklZrLnhADWz9kjghRg168XAc5nkB4LUyxmPX8Mq0qX7wmiUTQah20PsdttG2ggoqOENKC/pub?gid=1072911685&single=true&output=csv",
};
const SHEET_NAMES = Object.keys(SHEET_URLS);

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCsv(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => splitCsvLine(line));
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
  const url = SHEET_URLS[sheetName];
  if (!url) {
    throw new Error(`No hay una URL configurada para la hoja ${sheetName}.`);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo obtener la hoja ${sheetName}.`);
  }
  const text = await response.text();
  const rows = parseCsv(text);
  return parseSheetRows(rows);
}

async function cargarCuotasGoogleSheet() {
  const [cuotasEmitidas, cuotasFuturas] = await Promise.all(
    SHEET_NAMES.map((sheetName) => fetchSheetTable(sheetName))
  );
  return { cuotasEmitidas, cuotasFuturas };
}

window.cargarCuotasGoogleSheet = cargarCuotasGoogleSheet;
