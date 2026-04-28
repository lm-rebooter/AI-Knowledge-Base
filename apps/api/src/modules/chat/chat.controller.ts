import { Body, Controller, Get, Post } from "@nestjs/common";
import { ChatRequestDto, ChatSessionSyncDto } from "@ai-kb/shared";
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

  @Post("sessions/sync")
  syncSessions(@Body() body: ChatSessionSyncDto) {
    return this.chatService.syncSessions(body);
  }
}
