import { IsOptional, IsString, MinLength } from "class-validator";

export class ChatRequestDto {
  @IsString()
  @MinLength(2)
  question!: string;

  @IsOptional()
  @IsString()
  knowledgeBaseId?: string;
}
