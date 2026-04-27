import { Body, Controller, Get, Post } from "@nestjs/common";
import { CreateDocumentDto } from "@ai-kb/shared";
import { DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list() {
    return this.documentsService.list();
  }

  @Post()
  create(@Body() body: CreateDocumentDto) {
    return this.documentsService.create(body);
  }
}
