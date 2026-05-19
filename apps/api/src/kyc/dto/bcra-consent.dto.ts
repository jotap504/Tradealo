import { IsString, IsNotEmpty } from 'class-validator';

export class BcraConsentDto {
  @IsString()
  @IsNotEmpty()
  consent!: string;
}
