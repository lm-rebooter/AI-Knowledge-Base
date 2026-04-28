import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { CreateDocumentDto, UpdateDocumentDto } from "@ai-kb/shared";
import { UploadedDocumentFile } from "./document-file.type";
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

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @UploadedFile() file: UploadedDocumentFile,
    @Body("knowledgeBaseId") knowledgeBaseId: string,
    @Body("title") title?: string
  ) {
    return this.documentsService.upload(file, knowledgeBaseId, title);
  }

  @Get(":id/file")
  async getFile(@Param("id") id: string, @Res() response: Response) {
    return this.documentsService.streamFile(id, response);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateDocumentDto) {
    return this.documentsService.update(id, body);
  }

  @Post(":id/reindex")
  reindex(@Param("id") id: string) {
    return this.documentsService.reindex(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.documentsService.remove(id);
  }
}
