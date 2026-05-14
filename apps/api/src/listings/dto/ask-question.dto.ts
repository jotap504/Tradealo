import { IsString, MinLength } from 'class-validator';

export class AskQuestionDto {
  @IsString()
  @MinLength(10)
  question!: string;
}
