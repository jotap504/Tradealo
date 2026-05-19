import { IsString, IsNotEmpty } from 'class-validator';

export class SilverPhoneCameraDto {
  @IsString()
  @IsNotEmpty()
  frontData!: string;

  @IsString()
  @IsNotEmpty()
  frontMimetype!: string;

  @IsString()
  @IsNotEmpty()
  backData!: string;

  @IsString()
  @IsNotEmpty()
  backMimetype!: string;
}
