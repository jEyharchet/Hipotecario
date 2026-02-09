const GOOGLE_SHEET_ID = "1P_QACkgSfQKG39ytEIhnkQnflg55B9fgl17yB2-6w4I";
const SHEET_NAMES = ["cuotasEmitidas", "cuotasFuturas"];

function buildGvizUrl(sheetName) {
  const params = new URLSearchParams({
    tqx: "out:json",
    sheet: sheetName,
    headers: "1",
  });
  return `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?${params.toString()}`;
}

function parseGvizResponse(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Respuesta inesperada del Google Sheet");
  }
  return JSON.parse(text.slice(start, end + 1));
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

function formatCell(cell) {
  if (!cell) {
    return "";
  }
  if (cell.f !== undefined && cell.f !== null && cell.f !== "") {
    return String(cell.f);
  }
  if (cell.v === null || cell.v === undefined) {
    return "";
  }
  return String(cell.v);
}

function parseSheetRows(response) {
  const columns = response.table.cols || [];
  const headerKeys = columns.map((col) => mapHeaderToKey(col.label));

  return (response.table.rows || []).map((row) => {
    const entry = {
      nro: "",
      vencimiento: "",
      valorUva: "",
      capitalUva: "",
      capitalPesos: "",
      intereses: "",
      total: "",
    };

    row.c.forEach((cell, index) => {
      const key = headerKeys[index];
      if (!key) {
        return;
      }
      entry[key] = formatCell(cell);
    });

    return entry;
  });
}

async function fetchSheetTable(sheetName) {
  const url = buildGvizUrl(sheetName);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo obtener la hoja ${sheetName}.`);
  }
  const text = await response.text();
  const json = parseGvizResponse(text);
  return parseSheetRows(json);
}

async function cargarCuotasGoogleSheet() {
  const [cuotasEmitidas, cuotasFuturas] = await Promise.all(
    SHEET_NAMES.map((sheetName) => fetchSheetTable(sheetName))
  );
  return { cuotasEmitidas, cuotasFuturas };
}

window.cargarCuotasGoogleSheet = cargarCuotasGoogleSheet;
