import { IsString, Length } from 'class-validator';

export class AdminTotpVerifyDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class AdminTotpConfirmDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}
