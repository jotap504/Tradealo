import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SendLiveChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content!: string;
}
