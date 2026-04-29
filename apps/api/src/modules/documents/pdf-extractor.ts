import { BadRequestException } from "@nestjs/common";

export type ExtractedPdfContent = {
  pageTexts: string[];
  text: string;
};

type PdfPageData = {
  getTextContent: (options: {
    disableCombineTextItems: boolean;
    normalizeWhitespace: boolean;
  }) => Promise<{
    items: Array<{
      str: string;
      transform: number[];
      width?: number;
    }>;
  }>;
};

type PdfParseResult = {
  text: string;
};

type PdfTextItem = {
  str: string;
  width: number;
  x: number;
  y: number;
};

const COMPACT_TECH_TERMS = [
  "BFC",
  "CSSOM",
  "DOM",
  "HTML",
  "HTTP",
  "HTTPS",
  "TCP",
  "UDP",
  "JS",
  "TS",
  "meta",
  "link",
  "import",
  "transition",
  "animation",
  "visibility",
  "display",
  "overflow",
  "position",
  "absolute",
  "relative",
  "fixed",
  "float",
  "inline-block",
  "table-cell",
  "table-caption",
  "inline-flex",
  "flex",
  "grid",
  "margin",
  "padding",
  "border",
  "viewport",
  "transform",
  "scale",
  "after",
];

function buildSpacedAsciiPattern(term: string) {
  const escaped = term
    .split("")
    .map((char) => {
      if (/[A-Za-z0-9]/.test(char)) {
        return `${char}\\s*`;
      }

      return `\\${char}\\s*`;
    })
    .join("");

  return new RegExp(escaped.trimEnd(), "gi");
}

function normalizeExtractedText(text: string) {
  let normalized = text
    .replace(/\u0000/g, " ")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\r\n/g, "\n");

  normalized = normalized.replace(/(\d)\s*\.\s*(\d+)\s*(px|rem|em|%)\b/gi, "$1.$2$3");
  normalized = normalized.replace(/@\s+import\b/gi, "@import");
  normalized = normalized.replace(/\b([A-Z])\s+([A-Z])(?:\s+([A-Z]))+\b/g, (match) =>
    match.replace(/\s+/g, "")
  );

  for (const term of COMPACT_TECH_TERMS) {
    normalized = normalized.replace(buildSpacedAsciiPattern(term), term);
  }

  normalized = normalized
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trimEnd())
    .join("\n");

  return normalized.trim();
}

function renderPdfPage(pageData: PdfPageData) {
  const renderOptions = {
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  };

  return pageData.getTextContent(renderOptions).then((textContent) => {
    const items = textContent.items
      .map((item) => ({
        str: item.str,
        width: item.width ?? Math.max(item.str.length * 5, 1),
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
      }))
      .filter((item) => item.str.trim().length > 0);

    return normalizeExtractedText(groupTextItemsByVisualLines(items).join("\n"));
  });
}

function groupTextItemsByVisualLines(items: PdfTextItem[]) {
  const lineTolerance = 2;
  const sortedItems = [...items].sort((left, right) => {
    const yDistance = right.y - left.y;
    if (Math.abs(yDistance) > lineTolerance) {
      return yDistance;
    }
    return left.x - right.x;
  });

  const lines: PdfTextItem[][] = [];

  for (const item of sortedItems) {
    const existingLine = lines.find((line) => Math.abs(line[0].y - item.y) <= lineTolerance);

    if (existingLine) {
      existingLine.push(item);
    } else {
      lines.push([item]);
    }
  }

  return lines
    .map((line) => renderVisualLine(line.sort((left, right) => left.x - right.x)))
    .filter((line) => line.trim().length > 0);
}

function renderVisualLine(line: PdfTextItem[]) {
  let renderedLine = "";
  let previousRight: number | undefined;

  for (const item of line) {
    if (previousRight !== undefined) {
      const gap = item.x - previousRight;

      if (gap > 2) {
        renderedLine += " ".repeat(Math.min(Math.max(Math.round(gap / 4), 1), 12));
      }
    }

    renderedLine += item.str;
    previousRight = item.x + item.width;
  }

  return renderedLine.trimEnd();
}

export async function extractPdfTextWithPages(fileBuffer: Buffer): Promise<ExtractedPdfContent> {
  let pdfParseModule:
    | ((
        buffer: Buffer,
        options?: {
          pagerender?: (pageData: PdfPageData) => Promise<string>;
        }
      ) => Promise<PdfParseResult>)
    | undefined;

  try {
    pdfParseModule = require("pdf-parse") as typeof pdfParseModule;
  } catch {
    throw new BadRequestException(
      "PDF 解析需要安装 pdf-parse 包。请在项目根目录运行 pnpm install 后重试。"
    );
  }

  if (!pdfParseModule) {
    throw new BadRequestException("PDF 解析器初始化失败，请稍后重试。");
  }

  const pageTexts: string[] = [];

  try {
    const parsedPdf = await pdfParseModule(fileBuffer, {
      pagerender: async (pageData) => {
        const pageText = await renderPdfPage(pageData);
        pageTexts.push(pageText);
        return pageText;
      },
    });

    return {
      pageTexts: pageTexts.map((pageText) => normalizeExtractedText(pageText)),
      text: normalizeExtractedText(parsedPdf.text),
    };
  } catch {
    throw new BadRequestException("PDF 解析失败。请确认文件未加密、未损坏，或先另存为新的 PDF 后重试。");
  }
}
