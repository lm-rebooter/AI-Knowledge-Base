import { Body, Controller, Post } from "@nestjs/common";
import { ChatRequestDto } from "@ai-kb/shared";
import { ChatService } from "./chat.service";

@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  ask(@Body() body: ChatRequestDto) {
    return this.chatService.ask(body);
  }
}
