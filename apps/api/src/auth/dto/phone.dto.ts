import { IsString, IsNotEmpty } from 'class-validator';

export class PhoneVerifyDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
