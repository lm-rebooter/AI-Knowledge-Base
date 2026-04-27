// We only rely on a few fields from the uploaded file object in this starter.
// Keeping a local type avoids introducing extra ambient type dependencies
// before the upload flow is stable.
export type UploadedDocumentFile = {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
};

export type ParsedPdfDocument = {
  text: string;
};
