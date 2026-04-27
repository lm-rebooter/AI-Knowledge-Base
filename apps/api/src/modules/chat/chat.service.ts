import { Injectable } from "@nestjs/common";
import { ChatRequestDto } from "@ai-kb/shared";
import { AiService } from "../ai/ai.service";

@Injectable()
export class ChatService {
  constructor(private readonly aiService: AiService) {}

  async ask(body: ChatRequestDto) {
    return this.aiService.askQuestion(body);
  }
}
