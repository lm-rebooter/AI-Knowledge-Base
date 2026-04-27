import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CreateKnowledgeBaseDto, UpdateKnowledgeBaseDto } from "@ai-kb/shared";
import { KnowledgeBaseService } from "./knowledge-base.service";

@Controller("knowledge-bases")
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get()
  list() {
    return this.knowledgeBaseService.list();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.knowledgeBaseService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateKnowledgeBaseDto) {
    return this.knowledgeBaseService.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateKnowledgeBaseDto) {
    return this.knowledgeBaseService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.knowledgeBaseService.remove(id);
  }
}
