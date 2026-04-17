export interface ParsedReportModelRow {
  rowNumber: number;
  dataPointId: string;
  includeToReport: boolean;
}

export interface ParsedReportModelWorkbook {
  sheetName: string;
  rows: ParsedReportModelRow[];
  duplicateDataPointIds: string[];
  skippedRowNumbers: number[];
}

function parseXml(xmlText: string): Document {
  const parser = new DOMParser();
  const document = parser.parseFromString(xmlText, "application/xml");
  if (document.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Failed to parse XLSX XML");
  }
  return document;
}

function columnRefToIndex(cellRef: string): number {
  const letters = cellRef.replace(/\d+/g, "").toUpperCase();
  let value = 0;

  for (const letter of letters) {
    value = value * 26 + (letter.charCodeAt(0) - 64);
  }

  return value - 1;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function readSharedStrings(sharedStringsXml: string | null): string[] {
  if (!sharedStringsXml) return [];

  const document = parseXml(sharedStringsXml);
  return Array.from(document.getElementsByTagName("si")).map((item) =>
    Array.from(item.getElementsByTagName("t"))
      .map((node) => node.textContent ?? "")
      .join(""),
  );
}

function readCellValue(cell: Element, sharedStrings: string[]): string {
  const type = cell.getAttribute("t");
  if (type === "inlineStr") {
    return Array.from(cell.getElementsByTagName("t"))
      .map((node) => node.textContent ?? "")
      .join("");
  }

  const rawValue = cell.getElementsByTagName("v")[0]?.textContent ?? "";
  if (type === "s") {
    const index = Number(rawValue);
    return Number.isFinite(index) ? (sharedStrings[index] ?? "") : "";
  }

  return rawValue;
}

function parseIncludeToReport(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return true;

  if (["1", "true", "yes", "y", "include", "included", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "exclude", "excluded", "off"].includes(normalized)) {
    return false;
  }

  return true;
}

function resolveWorksheetPath(
  workbookXml: string,
  workbookRelsXml: string,
): { sheetName: string; worksheetPath: string } {
  const workbookDocument = parseXml(workbookXml);
  const relsDocument = parseXml(workbookRelsXml);

  const firstSheet = workbookDocument.getElementsByTagName("sheet")[0];
  if (!firstSheet) {
    throw new Error("XLSX workbook does not contain worksheets");
  }

  const relationshipId =
    firstSheet.getAttribute("r:id") ??
    firstSheet.getAttributeNS(
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      "id",
    );

  if (!relationshipId) {
    throw new Error("Failed to resolve worksheet relationship");
  }

  const relationship = Array.from(relsDocument.getElementsByTagName("Relationship")).find(
    (item) => item.getAttribute("Id") === relationshipId,
  );

  const target = relationship?.getAttribute("Target");
  if (!target) {
    throw new Error("Failed to resolve worksheet path");
  }

  const worksheetPath = target.startsWith("/")
    ? target.replace(/^\/+/, "")
    : `xl/${target.replace(/^\/+/, "")}`;

  return {
    sheetName: firstSheet.getAttribute("name") ?? "Sheet1",
    worksheetPath,
  };
}

export async function parseReportModelWorkbook(
  file: File,
): Promise<ParsedReportModelWorkbook> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
  const workbookRelsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");

  if (!workbookXml || !workbookRelsXml) {
    throw new Error("Invalid XLSX file");
  }

  const { sheetName, worksheetPath } = resolveWorksheetPath(workbookXml, workbookRelsXml);
  const worksheetXml = await zip.file(worksheetPath)?.async("string");
  if (!worksheetXml) {
    throw new Error("Worksheet XML not found");
  }

  const sharedStrings = readSharedStrings(
    (await zip.file("xl/sharedStrings.xml")?.async("string")) ?? null,
  );

  const worksheetDocument = parseXml(worksheetXml);
  const rowNodes = Array.from(worksheetDocument.getElementsByTagName("row"));
  if (!rowNodes.length) {
    throw new Error("Worksheet does not contain rows");
  }

  const rowMaps = rowNodes.map((rowNode) => {
    const cells = Array.from(rowNode.getElementsByTagName("c"));
    const values = new Map<number, string>();

    cells.forEach((cell) => {
      const ref = cell.getAttribute("r");
      if (!ref) return;
      values.set(columnRefToIndex(ref), readCellValue(cell, sharedStrings));
    });

    return {
      rowNumber: Number(rowNode.getAttribute("r") ?? "0") || 0,
      values,
    };
  });

  const headerRow = rowMaps[0];
  if (!headerRow) {
    throw new Error("Worksheet does not contain a header row");
  }

  const headerIndexByKey = new Map<string, number>();
  headerRow.values.forEach((value, index) => {
    const normalized = normalizeHeader(value);
    if (!normalized) return;
    headerIndexByKey.set(normalized, index);
  });

  const dataPointIdIndex =
    headerIndexByKey.get("datapointid") ??
    headerIndexByKey.get("id");

  if (dataPointIdIndex === undefined) {
    throw new Error('XLSX must contain a "data_point_id" or "id" column');
  }

  const includeToReportIndex =
    headerIndexByKey.get("includetoreport") ??
    headerIndexByKey.get("include") ??
    headerIndexByKey.get("enabled") ??
    headerIndexByKey.get("selected");

  const rows: ParsedReportModelRow[] = [];
  const duplicateDataPointIds = new Set<string>();
  const seenDataPointIds = new Set<string>();
  const skippedRowNumbers: number[] = [];

  rowMaps.slice(1).forEach((row) => {
    const rawDataPointId = row.values.get(dataPointIdIndex)?.trim() ?? "";
    const hasAnyValue = Array.from(row.values.values()).some((value) => value.trim() !== "");

    if (!rawDataPointId) {
      if (hasAnyValue) skippedRowNumbers.push(row.rowNumber);
      return;
    }

    if (seenDataPointIds.has(rawDataPointId)) {
      duplicateDataPointIds.add(rawDataPointId);
    }
    seenDataPointIds.add(rawDataPointId);

    rows.push({
      rowNumber: row.rowNumber,
      dataPointId: rawDataPointId,
      includeToReport: parseIncludeToReport(
        includeToReportIndex !== undefined
          ? row.values.get(includeToReportIndex)
          : undefined,
      ),
    });
  });

  if (!rows.length) {
    throw new Error("No data rows with data_point_id were found in the worksheet");
  }

  return {
    sheetName,
    rows,
    duplicateDataPointIds: Array.from(duplicateDataPointIds).sort(),
    skippedRowNumbers,
  };
}
