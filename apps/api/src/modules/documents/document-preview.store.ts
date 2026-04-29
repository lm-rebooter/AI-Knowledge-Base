import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join, resolve } from "path";

type DocumentPreviewRecord = {
  documentId: string;
  pageTexts: string[];
  extractorVersion?: number;
};

const CURRENT_EXTRACTOR_VERSION = 3;
const STORAGE_ROOT = resolve(process.cwd(), "storage");
const PREVIEW_INDEX_PATH = join(STORAGE_ROOT, "document-previews.json");

async function ensurePreviewStorage() {
  await mkdir(STORAGE_ROOT, { recursive: true });

  if (!existsSync(PREVIEW_INDEX_PATH)) {
    await writeFile(PREVIEW_INDEX_PATH, "[]", "utf-8");
  }
}

async function loadPreviewIndex(): Promise<DocumentPreviewRecord[]> {
  await ensurePreviewStorage();
  const raw = await readFile(PREVIEW_INDEX_PATH, "utf-8");
  return JSON.parse(raw) as DocumentPreviewRecord[];
}

async function savePreviewIndex(records: DocumentPreviewRecord[]) {
  await ensurePreviewStorage();
  await writeFile(PREVIEW_INDEX_PATH, JSON.stringify(records, null, 2), "utf-8");
}

export async function saveDocumentPreview(documentId: string, pageTexts: string[]) {
  const records = await loadPreviewIndex();
  const nextRecords = records.filter((record) => record.documentId !== documentId);
  nextRecords.push({
    documentId,
    pageTexts,
    extractorVersion: CURRENT_EXTRACTOR_VERSION,
  });
  await savePreviewIndex(nextRecords);
}

export async function getDocumentPreview(documentId: string) {
  const records = await loadPreviewIndex();
  const record = records.find((item) => item.documentId === documentId);

  if (!record || record.extractorVersion !== CURRENT_EXTRACTOR_VERSION) {
    return null;
  }

  return record;
}
