import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from '../common/interfaces';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { MailService } from '../mail/mail.service';
import { addMinutes, isAfter } from 'date-fns';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Partial<User>;
    mustChangePassword: boolean;
  }> {
    const user = await this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['company', 'department'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact your administrator.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    await this.usersRepository.update(user.id, { lastLoginAt: new Date() });

    const tokens = this.generateTokens(user);

    return {
      ...tokens,
      mustChangePassword: user.mustChangePassword,
      user: this.sanitizeUser(user),
    };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string; accessToken: string; refreshToken: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Cannot reuse last 5 passwords
    for (const oldHash of user.passwordHistory) {
      const isReused = await bcrypt.compare(dto.newPassword, oldHash);
      if (isReused) {
        throw new BadRequestException(
          'You cannot reuse one of your last 5 passwords',
        );
      }
    }

    // Cannot be same as temp/current password
    const isSameAsCurrent = await bcrypt.compare(
      dto.newPassword,
      user.passwordHash,
    );
    if (isSameAsCurrent) {
      throw new BadRequestException(
        'New password must be different from your current password',
      );
    }

    const newHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    const newHistory = [user.passwordHash, ...user.passwordHistory].slice(0, 5);

    await this.usersRepository.update(user.id, {
      passwordHash: newHash,
      mustChangePassword: false,
      passwordHistory: newHistory,
    });

    // Return fresh tokens with mustChangePassword: false
    const updatedUser = { ...user, mustChangePassword: false };
    const tokens = this.generateTokens(updatedUser as User);

    return { message: 'Password changed successfully', ...tokens };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return same message to prevent user enumeration
    const genericMessage =
      'If that email address is registered, you will receive a password reset link shortly.';

    if (!user || !user.isActive) {
      return { message: genericMessage };
    }

    // Generate a secure random token
    const resetToken = randomBytes(32).toString('hex');
    const expiryMinutes =
      this.configService.get<number>('RESET_PASSWORD_EXPIRY_MINUTES') || 30;

    await this.usersRepository.update(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpiresAt: addMinutes(new Date(), expiryMinutes),
    });

    // Send email
    await this.mailService.sendPasswordResetEmail(
      user.email,
      user.firstName,
      resetToken,
    );

    return { message: genericMessage };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.usersRepository.findOne({
      where: { passwordResetToken: dto.token },
    });

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired password reset token. Please request a new one.',
      );
    }

    if (!user.passwordResetExpiresAt || isAfter(new Date(), user.passwordResetExpiresAt)) {
      throw new BadRequestException(
        'Password reset link has expired. Please request a new one.',
      );
    }

    // Check not reusing last 5 passwords
    for (const oldHash of user.passwordHistory) {
      const isReused = await bcrypt.compare(dto.newPassword, oldHash);
      if (isReused) {
        throw new BadRequestException(
          'You cannot reuse one of your last 5 passwords',
        );
      }
    }

    const newHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    const newHistory = [user.passwordHash, ...user.passwordHistory].slice(0, 5);

    await this.usersRepository.update(user.id, {
      passwordHash: newHash,
      mustChangePassword: false,
      passwordHistory: newHistory,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    });

    return { message: 'Password reset successfully. Please log in.' };
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      }) as JwtPayload;

      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getMe(userId: string): Promise<Partial<User>> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['company', 'department'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  private generateTokens(user: User): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || undefined,
      departmentId: user.departmentId || undefined,
      mustChangePassword: user.mustChangePassword,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiry') as any,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiry') as any,
      },
    );

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User): Partial<User> {
    const {
      passwordHash,
      passwordHistory,
      mfaSecret,
      mfaBackupCodes,
      passwordResetToken,
      passwordResetExpiresAt,
      ...safe
    } = user;
    return safe;
  }
}
