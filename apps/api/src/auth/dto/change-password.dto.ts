import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  @MaxLength(72)
  @Matches(/(?=.*[A-Z])/, { message: 'Debe incluir al menos una mayúscula' })
  @Matches(/(?=.*\d)/, { message: 'Debe incluir al menos un número' })
  newPassword: string;
}
