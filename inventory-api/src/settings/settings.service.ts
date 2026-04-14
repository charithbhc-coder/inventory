import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private settingsRepository: Repository<SystemSetting>,
  ) {}

  async findAll() {
    return this.settingsRepository.find();
  }

  async findOne(key: string) {
    return this.settingsRepository.findOne({ where: { key } });
  }

  async upsert(key: string, value: any, category: string = 'GENERAL') {
    let setting = await this.findOne(key);
    if (setting) {
      setting.value = value;
      setting.category = category;
    } else {
      setting = this.settingsRepository.create({ key, value, category });
    }
    return this.settingsRepository.save(setting);
  }

  /**
   * Helper to get a typed value or default
   */
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const setting = await this.findOne(key);
    return setting ? (setting.value as T) : defaultValue;
  }
}
