import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { KnowledgeBaseController } from "./knowledge-base.controller";
import { KnowledgeBaseService } from "./knowledge-base.service";

@Module({
  imports: [AiModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService]
})
export class KnowledgeBaseModule {}
