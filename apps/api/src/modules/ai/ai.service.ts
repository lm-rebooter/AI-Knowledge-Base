import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ChatRequestDto, IngestDocumentRequest } from "@ai-kb/shared";

@Injectable()
export class AiService {
  constructor(private readonly httpService: HttpService) {}

  private readonly baseUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8000";

  async askQuestion(payload: ChatRequestDto) {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/api/chat`, payload)
    );

    return response.data;
  }

  async ingestDocument(payload: IngestDocumentRequest) {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/api/ingest`, payload)
    );

    return response.data;
  }
}
