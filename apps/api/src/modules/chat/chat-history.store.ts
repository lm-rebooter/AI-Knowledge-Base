import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

type ChatHistoryEntry = {
  id: string;
  conversationId?: string;
  knowledgeBaseId?: string;
  question: string;
  answer: string;
  contexts: string[];
  fallbackUsed: boolean;
  createdAt: string;
};

const STORAGE_PATH = join(process.cwd(), "storage", "chat-history.json");

async function ensureStorageFile() {
  await mkdir(dirname(STORAGE_PATH), { recursive: true });

  try {
    await readFile(STORAGE_PATH, "utf-8");
  } catch {
    await writeFile(STORAGE_PATH, "[]", "utf-8");
  }
}

async function readEntries() {
  await ensureStorageFile();
  const content = await readFile(STORAGE_PATH, "utf-8");
  return JSON.parse(content) as ChatHistoryEntry[];
}

async function writeEntries(entries: ChatHistoryEntry[]) {
  await writeFile(STORAGE_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

export async function saveChatHistory(entry: Omit<ChatHistoryEntry, "id" | "createdAt">) {
  const existingEntries = await readEntries();

  existingEntries.unshift({
    id: `chat_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...entry
  });

  await writeEntries(existingEntries);
}

export async function listChatHistory() {
  return readEntries();
}
