import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { CategoryCustomField } from './entities/category-custom-field.entity';
import { ItemCustomValue } from './entities/item-custom-value.entity';
import { CreateCustomFieldDto, SetItemCustomValuesDto } from './dto/custom-field.dto';
import { UserRole } from '../common/enums';

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectRepository(CategoryCustomField)
    private readonly fieldRepository: Repository<CategoryCustomField>,
    @InjectRepository(ItemCustomValue)
    private readonly valueRepository: Repository<ItemCustomValue>,
    private dataSource: DataSource,
  ) {}

  async createField(dto: CreateCustomFieldDto, companyId: string | null) {
    const field = this.fieldRepository.create({
      ...dto,
      fieldName: dto.label || dto.fieldName, // Human label
      fieldKey: dto.name || dto.fieldKey,     // Technical key
      description: dto.description,
      placeholder: dto.placeholder,
      companyId: companyId as any,
    });

    if (!field.fieldName || !field.fieldKey) {
      throw new BadRequestException('Field label/name or fieldName/fieldKey is required');
    }

    return this.fieldRepository.save(field);
  }

  async findFieldsByCategory(categoryId: string, companyId: string) {
    return this.fieldRepository.find({
      where: [
        { categoryId, companyId },
        { categoryId, companyId: IsNull() }, // Global fields
      ],
      order: { displayOrder: 'ASC' },
    });
  }

  async setItemValues(itemId: string, dto: SetItemCustomValuesDto, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      for (const valDto of dto.values) {
        let val = await manager.findOne(ItemCustomValue, {
          where: { itemId, fieldId: valDto.fieldId },
        });

        if (val) {
          val.value = valDto.value;
          val.updatedByUserId = userId;
          await manager.save(ItemCustomValue, val);
        } else {
          val = manager.create(ItemCustomValue, {
            itemId,
            fieldId: valDto.fieldId,
            value: valDto.value,
            updatedByUserId: userId,
          });
          await manager.save(ItemCustomValue, val);
        }
      }
      return { success: true };
    });
  }

  async getItemValues(itemId: string) {
    return this.valueRepository.find({
      where: { itemId },
      relations: ['fieldDefinition'],
    });
  }
}
