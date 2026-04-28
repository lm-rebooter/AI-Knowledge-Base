import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { extname, join, resolve } from "path";
import { randomUUID } from "crypto";

type DocumentAssetRecord = {
  documentId: string;
  originalFileName: string;
  mimeType: string;
  storedFileName: string;
};

const STORAGE_ROOT = resolve(process.cwd(), "storage");
const UPLOADS_DIR = join(STORAGE_ROOT, "uploads");
const ASSET_INDEX_PATH = join(STORAGE_ROOT, "document-assets.json");

async function ensureStorage() {
  await mkdir(UPLOADS_DIR, { recursive: true });

  if (!existsSync(ASSET_INDEX_PATH)) {
    await writeFile(ASSET_INDEX_PATH, "[]", "utf-8");
  }
}

async function loadAssetIndex(): Promise<DocumentAssetRecord[]> {
  await ensureStorage();
  const raw = await readFile(ASSET_INDEX_PATH, "utf-8");
  return JSON.parse(raw) as DocumentAssetRecord[];
}

async function saveAssetIndex(records: DocumentAssetRecord[]) {
  await ensureStorage();
  await writeFile(ASSET_INDEX_PATH, JSON.stringify(records, null, 2), "utf-8");
}

export async function saveDocumentAsset(
  documentId: string,
  file: {
    originalname: string;
    mimetype: string;
    path?: string;
    buffer: Buffer;
  }
) {
  await ensureStorage();

  const extension = extname(file.originalname) || ".bin";
  const storedFileName = `${documentId}-${randomUUID()}${extension}`;
  const targetPath = join(UPLOADS_DIR, storedFileName);

  if (file.path) {
    await rename(file.path, targetPath);
  } else {
    await writeFile(targetPath, file.buffer);
  }

  const records = await loadAssetIndex();
  const nextRecords = records.filter((record) => record.documentId !== documentId);
  nextRecords.push({
    documentId,
    originalFileName: file.originalname,
    mimeType: file.mimetype,
    storedFileName
  });
  await saveAssetIndex(nextRecords);

  return {
    originalFileName: file.originalname,
    mimeType: file.mimetype
  };
}

export async function getDocumentAsset(documentId: string) {
  const records = await loadAssetIndex();
  const record = records.find((item) => item.documentId === documentId);

  if (!record) {
    return null;
  }

  return {
    ...record,
    absolutePath: join(UPLOADS_DIR, record.storedFileName)
  };
}
