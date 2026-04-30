import { IsString, IsNotEmpty, MaxLength } from 'class-validator'

export class GenerateListingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  prompt!: string
}
