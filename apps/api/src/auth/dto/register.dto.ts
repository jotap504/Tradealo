import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, Length } from 'class-validator'
import { Transform } from 'class-transformer'

export class RegisterDto {
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  email!: string

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one uppercase letter and one number',
  })
  password!: string

  @IsOptional()
  @IsString()
  @Length(12, 12)
  referralCode?: string
}
