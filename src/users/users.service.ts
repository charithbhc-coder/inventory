import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { MailService } from '../mail/mail.service';
import { UserRole } from '../common/enums';
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
        return this.usersRepository.findOneBy({ id: existing.id }) as Promise<User>;
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
    creatorCompanyId?: string,
  ): Promise<Partial<User>> {
    // Check access
    if (creatorRole !== UserRole.SUPER_ADMIN && creatorRole !== UserRole.COMPANY_ADMIN && creatorRole !== UserRole.DEPT_ADMIN) {
      throw new ForbiddenException('You do not have permission to create users');
    }

    // A Company Admin or Dept Admin can only create users within their own company
    if (creatorRole !== UserRole.SUPER_ADMIN) {
      if (dto.companyId && dto.companyId !== creatorCompanyId) {
        throw new ForbiddenException('You can only create users for your own company');
      }
      dto.companyId = creatorCompanyId; // Force correct company
    }

    // Role restrictions
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super Admins can only be created via seed scripts');
    }
    if (creatorRole === UserRole.COMPANY_ADMIN && dto.role === UserRole.COMPANY_ADMIN) {
      // Allow CA to create other CAs ? Usually okay, but SA handles billing/license. Let's allow for now.
    }
    if (creatorRole === UserRole.DEPT_ADMIN && dto.role !== UserRole.STAFF) {
      throw new ForbiddenException('Department Admins can only create STAFF users');
    }

    const existing = await this.usersRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('A user with that email already exists');
    }

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    const newUser = this.usersRepository.create({
      ...dto,
      email: dto.email.toLowerCase(),
      passwordHash,
      createdByUserId: creatorId,
      mustChangePassword: true,
      passwordHistory: [passwordHash],
    });

    const saved = await this.usersRepository.save(newUser);

    // Don't await email, let it send in background
    this.mailService.sendWelcomeEmailWithTempPassword(saved.email, saved.firstName, tempPassword).catch(() => {});

    return this.sanitizeUser(saved);
  }

  async findAll(
    companyId: string,
    departmentId: string,
    query: { page?: number; limit?: number; search?: string; role?: UserRole; isActive?: string },
  ) {
    const { page, limit, skip } = getPaginationOptions(query);
    
    const where: FindOptionsWhere<User> = {};
    if (companyId) where.companyId = companyId;
    if (departmentId) where.departmentId = departmentId;
    if (query.role) where.role = query.role;
    if (query.isActive) where.isActive = query.isActive === 'true';

    const qb = this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department')
      .where(where);

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

  async findOne(id: string, requesterCompanyId?: string, requesterRole?: UserRole): Promise<Partial<User>> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['company', 'department'],
    });

    if (!user) throw new NotFoundException('User not found');

    if (requesterRole !== UserRole.SUPER_ADMIN && user.companyId !== requesterCompanyId) {
      throw new ForbiddenException('Access denied to this user profile');
    }

    return this.sanitizeUser(user);
  }

  async update(id: string, dto: UpdateUserDto, requesterCompanyId?: string, requesterRole?: UserRole): Promise<Partial<User>> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (requesterRole !== UserRole.SUPER_ADMIN && user.companyId !== requesterCompanyId) {
      throw new ForbiddenException('Access denied to update this user');
    }

    if (dto.role === UserRole.SUPER_ADMIN) {
       throw new ForbiddenException('Cannot assign Super Admin role via UI');
    }

    Object.assign(user, dto);
    const saved = await this.usersRepository.save(user);
    return this.sanitizeUser(saved);
  }

  async setStatus(id: string, isActive: boolean, requesterCompanyId?: string, requesterRole?: UserRole): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (requesterRole !== UserRole.SUPER_ADMIN && user.companyId !== requesterCompanyId) {
      throw new ForbiddenException('Access denied to modify this user');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super Admin cannot be deactivated via this endpoint');
    }

    await this.usersRepository.update(id, { isActive });
    return { message: `User ${isActive ? 'activated' : 'deactivated'} successfully` };
  }

  private generateTempPassword(): string {
    // Ensure complexity rules: Min 8, 1 uppercase, 1 lowercase, 1 number, 1 special
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

    // Shuffle
    return pass.split('').sort(() => 0.5 - Math.random()).join('');
  }

  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, passwordHistory, mfaSecret, mfaBackupCodes, passwordResetToken, passwordResetExpiresAt, ...safe } = user;
    return safe;
  }
}
