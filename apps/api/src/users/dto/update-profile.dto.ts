import {
  IsString, IsBoolean, IsOptional,
  MinLength, MaxLength, Matches,
} from 'class-validator'

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_]+$/, { message: 'Username can only contain lowercase letters, numbers and underscores' })
  username?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsapp?: string

  @IsOptional()
  @IsBoolean()
  showPhone?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(50)
  province?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string
}
