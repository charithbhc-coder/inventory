import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, UpdatePermissionsDto } from './dto/create-user.dto';
import { MailService } from '../mail/mail.service';
import { UserRole, AdminPermission } from '../common/enums';
import { paginate, getPaginationOptions } from '../common/utils/pagination.util';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private mailService: MailService,
  ) {}

  async createSuperAdmin(data: Partial<User>): Promise<User> {
    const existing = await this.usersRepository.findOne({
      where: { email: data.email },
    });
    if (existing) {
      if (!existing.isActive) {
        await this.usersRepository.update(existing.id, { isActive: true, role: UserRole.SUPER_ADMIN });
        const updatedUser = await this.usersRepository.findOne({ where: { id: existing.id } });
        if (!updatedUser) throw new NotFoundException('User not found after update');
        return updatedUser;
      }
      return existing;
    }

    const newAdmin = this.usersRepository.create(data);
    return this.usersRepository.save(newAdmin);
  }

  async create(
    dto: CreateUserDto,
    creatorId: string,
    creatorRole: UserRole,
  ): Promise<Partial<User>> {
    // Only SUPER_ADMIN can create users; ADMIN with MANAGE_USERS permission handled via guard
    if (creatorRole !== UserRole.SUPER_ADMIN && creatorRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to create users');
    }

    // Cannot create SUPER_ADMIN via API
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super Admins can only be created via seed scripts');
    }

    const existing = await this.usersRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('A user with that email already exists');
    }

    // Validate permissions — only valid AdminPermission values
    if (dto.permissions && dto.permissions.length > 0) {
      const validPermissions = Object.values(AdminPermission);
      for (const perm of dto.permissions) {
        if (!validPermissions.includes(perm as AdminPermission)) {
          throw new ForbiddenException(`Invalid permission: ${perm}`);
        }
      }
    }

    const tempPassword = this.generateTempPassword();
    console.log(`[DEVELOPER MODE] Temporary password for ${dto.email}: ${tempPassword}`);
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    const newUser = this.usersRepository.create({
      ...dto,
      email: dto.email.toLowerCase(),
      passwordHash,
      createdByUserId: creatorId,
      mustChangePassword: true,
      passwordHistory: [passwordHash],
      permissions: dto.permissions || [],
    });

    const saved = await this.usersRepository.save(newUser);

    // Send welcome email in background
    this.mailService.sendWelcomeEmailWithTempPassword(saved.email, saved.firstName, tempPassword).catch(() => {});

    return this.sanitizeUser(saved);
  }

  async findAll(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      role?: UserRole;
      isActive?: string;
      companyId?: string;
    },
  ) {
    const { page, limit, skip } = getPaginationOptions(query);

    const qb = this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company');

    if (query.companyId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(query.companyId)) return paginate([], 0, page, limit);
      qb.andWhere('user.companyId = :companyId', { companyId: query.companyId });
    }

    if (query.role) {
      if (Object.values(UserRole).includes(query.role as any)) {
        qb.andWhere('user.role = :role', { role: query.role });
      }
    }

    if (query.isActive) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive === 'true' });
    }

    if (query.search) {
      qb.andWhere('(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return paginate(items.map(u => this.sanitizeUser(u)), total, page, limit);
  }

  async findOne(id: string): Promise<Partial<User>> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!user) throw new NotFoundException('User not found');
    return this.sanitizeUser(user);
  }

  async update(id: string, dto: UpdateUserDto, requesterRole?: UserRole): Promise<Partial<User>> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot assign Super Admin role via API');
    }

    // Validate permissions if provided
    if (dto.permissions) {
      const validPermissions = Object.values(AdminPermission);
      for (const perm of dto.permissions) {
        if (!validPermissions.includes(perm as AdminPermission)) {
          throw new ForbiddenException(`Invalid permission: ${perm}`);
        }
      }
    }

    Object.assign(user, dto);
    const saved = await this.usersRepository.save(user);
    return this.sanitizeUser(saved);
  }

  async updatePermissions(id: string, dto: UpdatePermissionsDto): Promise<Partial<User>> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot modify Super Admin permissions');
    }

    // Validate
    const validPermissions = Object.values(AdminPermission);
    for (const perm of dto.permissions) {
      if (!validPermissions.includes(perm as AdminPermission)) {
        throw new ForbiddenException(`Invalid permission: ${perm}`);
      }
    }

    user.permissions = dto.permissions;
    const saved = await this.usersRepository.save(user);
    return this.sanitizeUser(saved);
  }

  async setStatus(id: string, isActive: boolean): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super Admin cannot be deactivated via this endpoint');
    }

    await this.usersRepository.update(id, { isActive });
    return { message: `User ${isActive ? 'activated' : 'deactivated'} successfully` };
  }

  private generateTempPassword(): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const num = '0123456789';
    const spec = '!@#$%^&*';
    const all = upper + lower + num + spec;

    let pass = '';
    pass += upper[Math.floor(Math.random() * upper.length)];
    pass += lower[Math.floor(Math.random() * lower.length)];
    pass += num[Math.floor(Math.random() * num.length)];
    pass += spec[Math.floor(Math.random() * spec.length)];

    for (let i = 0; i < 6; i++) {
      pass += all[Math.floor(Math.random() * all.length)];
    }

    return pass.split('').sort(() => 0.5 - Math.random()).join('');
  }

  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, passwordHistory, mfaSecret, mfaBackupCodes, passwordResetToken, passwordResetExpiresAt, ...safe } = user;
    return safe;
  }
}
