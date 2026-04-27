import { Body, Controller, Get, Post } from "@nestjs/common";
import { CreateKnowledgeBaseDto } from "@ai-kb/shared";
import { KnowledgeBaseService } from "./knowledge-base.service";

@Controller("knowledge-bases")
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get()
  list() {
    return this.knowledgeBaseService.list();
  }

  @Post()
  create(@Body() body: CreateKnowledgeBaseDto) {
    return this.knowledgeBaseService.create(body);
  }
}
