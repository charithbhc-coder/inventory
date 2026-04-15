import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';

export class LoginDto {
  
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ChangePasswordDto {
  
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/,
    {
      message:
        'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
    },
  )
  newPassword: string;

  
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

export class ForgotPasswordDto {
  
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

export class ResetPasswordDto {
  
  @IsString()
  @IsNotEmpty()
  token: string;

  
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/,
    {
      message:
        'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
    },
  )
  newPassword: string;

  
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

export class RefreshTokenDto {
  
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
