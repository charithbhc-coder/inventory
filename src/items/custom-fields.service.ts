import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { CategoryCustomField } from './entities/category-custom-field.entity';
import { ItemCustomValue } from './entities/item-custom-value.entity';
import { Item } from './entities/item.entity';
import { CreateCustomFieldDto, SetItemCustomValuesDto, UpdateCustomFieldValueDto, UpdateCustomFieldDto } from './dto/custom-field.dto';
import { UserRole } from '../common/enums';

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectRepository(CategoryCustomField)
    private readonly fieldRepository: Repository<CategoryCustomField>,
    @InjectRepository(ItemCustomValue)
    private readonly valueRepository: Repository<ItemCustomValue>,
    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>,
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

  async updateField(id: string, dto: UpdateCustomFieldDto, requesterCompanyId: string, requesterRole: UserRole) {
    const field = await this.fieldRepository.findOne({ where: { id } });
    if (!field) throw new NotFoundException('Field definition not found');

    // Global fields (companyId = null) can only be edited by Super Admin
    if (field.companyId === null && requesterRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can edit global fields');
    }

    // Company specific fields can only be edited by that company's admins
    if (field.companyId !== null && field.companyId !== requesterCompanyId && requesterRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Access denied to this field definition');
    }

    // Map human friendly fields back to entity fields if provided
    if (dto.label) field.fieldName = dto.label;
    if (dto.name) field.fieldKey = dto.name;
    
    Object.assign(field, dto);
    // Ensure we don't accidentally overwrite the label/name if they weren't in dto but are in entity
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
      const valuesToProcess: UpdateCustomFieldValueDto[] = [];

      // 1. Handle traditional array format
      if (dto.values && dto.values.length > 0) {
        valuesToProcess.push(...dto.values);
      }

      // 2. Handle new user-friendly flat object format
      if (dto.data && Object.keys(dto.data).length > 0) {
        const item = await manager.findOne(Item, { where: { id: itemId } });
        if (!item) throw new NotFoundException('Item not found');

        const categoryFields = await manager.find(CategoryCustomField, {
          where: [
            { categoryId: item.categoryId, companyId: item.companyId },
            { categoryId: item.categoryId, companyId: IsNull() },
          ],
        });

        for (const [key, value] of Object.entries(dto.data)) {
          const fieldDef = categoryFields.find(
            (f) => f.fieldKey === key || f.fieldName === key,
          );
          if (fieldDef) {
            valuesToProcess.push({
              fieldId: fieldDef.id,
              value: String(value),
            });
          }
        }
      }

      // 3. Process all values
      for (const valDto of valuesToProcess) {
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
      return { success: true, processedCount: valuesToProcess.length };
    });
  }

  async getItemValues(itemId: string) {
    return this.valueRepository.find({
      where: { itemId },
      relations: ['fieldDefinition'],
    });
  }
}
