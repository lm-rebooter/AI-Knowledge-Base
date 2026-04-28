import { IsArray, IsISO8601, IsOptional, IsString, MinLength } from "class-validator";

export class ChatRequestDto {
  @IsString()
  @MinLength(2)
  question!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  knowledgeBaseId?: string;
}

export class ChatSessionSnapshotDto {
  @IsString()
  id!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  knowledgeBaseId?: string;

  @IsISO8601()
  updatedAt!: string;
}

export class ChatSessionSyncDto {
  @IsArray()
  sessions!: ChatSessionSnapshotDto[];
}
