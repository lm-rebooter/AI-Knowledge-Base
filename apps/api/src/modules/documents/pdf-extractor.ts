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

    return groupTextItemsByVisualLines(items).join("\n");
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
      pageTexts,
      text: parsedPdf.text.trim(),
    };
  } catch {
    throw new BadRequestException("PDF 解析失败。请确认文件未加密、未损坏，或先另存为新的 PDF 后重试。");
  }
}
