import { IsString, IsNotEmpty, MaxLength } from 'class-validator'

export class ConfirmAvatarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  key!: string
}
