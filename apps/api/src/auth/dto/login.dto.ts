import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class LoginDto {
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  email!: string

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string
}
