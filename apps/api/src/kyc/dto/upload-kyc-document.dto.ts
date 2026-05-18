import { IsString, IsNotEmpty, MaxLength } from 'class-validator'

export class UploadKycDocumentDto {
  @IsString()
  @IsNotEmpty()
  data!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimetype!: string
}
