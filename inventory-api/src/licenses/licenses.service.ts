import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { License, LicenseStatus } from './entities/license.entity';
import { CreateLicenseDto } from './dto/create-license.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';
import { differenceInDays } from 'date-fns';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface PaginatedLicenses {
  data: License[];
  meta: { total: number; page: number; limit: number; lastPage: number };
}

@Injectable()
export class LicensesService {
  constructor(
    @InjectRepository(License)
    private readonly licensesRepository: Repository<License>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createLicenseDto: CreateLicenseDto, userId?: string): Promise<License> {
    const license = this.licensesRepository.create(createLicenseDto);
    this.updateStatusBasedOnExpiry(license);
    const saved = await this.licensesRepository.save(license);
    
    this.eventEmitter.emit('license.added', {
      licenseId: saved.id,
      softwareName: saved.softwareName,
      userId,
    });

    return saved;
  }

  async findAll(
    status?: LicenseStatus,
    search?: string,
    page = 1,
    limit = 15,
  ): Promise<PaginatedLicenses> {
    const query = this.licensesRepository.createQueryBuilder('license');

    if (status) {
      query.where('license.status = :status', { status });
    }

    if (search) {
      const clause = status ? 'andWhere' : 'where';
      query[clause](
        '(LOWER(license.softwareName) LIKE :s OR LOWER(license.vendor) LIKE :s OR LOWER(license.category) LIKE :s)',
        { s: `%${search.toLowerCase()}%` },
      );
    }

    query.orderBy('license.expiryDate', 'ASC');

    const total = await query.getCount();
    const data = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) || 1 },
    };
  }

  async findOne(id: string): Promise<License> {
    const license = await this.licensesRepository.findOne({ where: { id } });
    if (!license) {
      throw new NotFoundException(`License with ID ${id} not found`);
    }
    return license;
  }

  async update(id: string, updateLicenseDto: UpdateLicenseDto, userId?: string): Promise<License> {
    const license = await this.findOne(id);
    this.licensesRepository.merge(license, updateLicenseDto);
    this.updateStatusBasedOnExpiry(license);
    const saved = await this.licensesRepository.save(license);

    if (userId) { // Using userId present check as proxy for 'was manually edited' vs scheduler if needed
      this.eventEmitter.emit('license.updated', {
        licenseId: saved.id,
        softwareName: saved.softwareName,
        userId,
      });
    }

    return saved;
  }

  async remove(id: string): Promise<void> {
    const license = await this.findOne(id);
    await this.licensesRepository.remove(license);
  }

  /**
   * Helper function to automatically update the status based on expiry date
   * if the status was not manually set to CANCELLED.
   */
  private updateStatusBasedOnExpiry(license: License): void {
    if (license.status === LicenseStatus.CANCELLED) return;

    if (!license.expiryDate) return;

    const daysRemaining = differenceInDays(new Date(license.expiryDate), new Date());

    if (daysRemaining < 0) {
      license.status = LicenseStatus.EXPIRED;
    } else if (daysRemaining <= 30) {
      license.status = LicenseStatus.EXPIRING_SOON;
    } else {
      license.status = LicenseStatus.ACTIVE;
    }
  }
}
