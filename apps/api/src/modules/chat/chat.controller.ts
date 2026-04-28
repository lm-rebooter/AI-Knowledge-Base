import { Body, Controller, Get, Post } from "@nestjs/common";
import { ChatRequestDto } from "@ai-kb/shared";
import { ChatService } from "./chat.service";

@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("summary")
  summary() {
    return this.chatService.getSummary();
  }

  @Post()
  ask(@Body() body: ChatRequestDto) {
    return this.chatService.ask(body);
  }
}
