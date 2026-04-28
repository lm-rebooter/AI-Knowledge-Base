import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import type { ChatSessionSnapshotDto } from "@ai-kb/shared";

const STORAGE_PATH = join(process.cwd(), "storage", "chat-sessions.json");

async function ensureStorageFile() {
  await mkdir(dirname(STORAGE_PATH), { recursive: true });

  try {
    await readFile(STORAGE_PATH, "utf-8");
  } catch {
    await writeFile(STORAGE_PATH, "[]", "utf-8");
  }
}

async function readSessions() {
  await ensureStorageFile();
  const content = await readFile(STORAGE_PATH, "utf-8");
  return JSON.parse(content) as ChatSessionSnapshotDto[];
}

export async function saveChatSessions(sessions: ChatSessionSnapshotDto[]) {
  await ensureStorageFile();
  await writeFile(STORAGE_PATH, JSON.stringify(sessions, null, 2), "utf-8");
}

export async function listChatSessions() {
  return readSessions();
}
