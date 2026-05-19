import { IsString, IsNotEmpty } from 'class-validator';

export class SilverPhoneCameraDto {
  @IsString()
  @IsNotEmpty()
  data!: string;

  @IsString()
  @IsNotEmpty()
  mimetype!: string;
}
