const GOOGLE_SHEET_PUB_ID =
  "2PACX-1vQ7hsMlqMyklZrLnhADWz9kjghRg168XAc5nkB4LUyxmPX8Mq0qX7wmiUTQah20PsdttG2ggoqOENKC";
const SHEET_NAMES = ["cuotasEmitidas", "cuotasFuturas"];
const SHEET_TABLE_INDEX = {
  cuotasEmitidas: 0,
  cuotasFuturas: 1,
};

let pubHtmlTablesPromise = null;

function buildPubHtmlUrl() {
  return `https://docs.google.com/spreadsheets/d/e/${GOOGLE_SHEET_PUB_ID}/pubhtml`;
}

function parseHtmlTable(table) {
  const rows = [];
  table.querySelectorAll("tr").forEach((row) => {
    const cells = Array.from(row.querySelectorAll("th, td")).map((cell) =>
      cell.textContent.trim()
    );
    if (cells.some((cell) => cell !== "")) {
      rows.push(cells);
    }
  });
  return rows;
}

function parsePubHtmlTables(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tables = Array.from(doc.querySelectorAll("table.waffle"));
  const fallbackTables = tables.length ? tables : Array.from(doc.querySelectorAll("table"));
  return fallbackTables.map((table) => parseHtmlTable(table)).filter((rows) => rows.length > 0);
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
  if (!pubHtmlTablesPromise) {
    const url = buildPubHtmlUrl();
    pubHtmlTablesPromise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`No se pudo obtener la publicación de Google Sheets (HTTP ${response.status}).`);
        }
        return response.text();
      })
      .then((html) => parsePubHtmlTables(html));
  }

  let tables;
  try {
    tables = await pubHtmlTablesPromise;
  } catch (error) {
    pubHtmlTablesPromise = null;
    throw error;
  }

  const tableIndex = SHEET_TABLE_INDEX[sheetName];
  if (typeof tableIndex !== "number") {
    throw new Error(`No existe índice configurado para la hoja ${sheetName}.`);
  }

  const rows = tables[tableIndex];
  if (!rows || !rows.length) {
    throw new Error(`No se encontró la tabla publicada para la hoja ${sheetName}.`);
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
