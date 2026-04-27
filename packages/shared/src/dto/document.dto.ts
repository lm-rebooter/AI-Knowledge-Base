import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateDocumentDto {
  @IsString()
  knowledgeBaseId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(10)
  content!: string;
}

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;
}

export type IngestDocumentRequest = CreateDocumentDto;
