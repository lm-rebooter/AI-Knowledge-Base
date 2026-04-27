import { Controller, Get } from "@nestjs/common";
import { KnowledgeBaseService } from "./knowledge-base.service";

@Controller("knowledge-bases")
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get()
  list() {
    return this.knowledgeBaseService.list();
  }
}
