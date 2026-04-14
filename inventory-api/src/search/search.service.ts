import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Item } from '../items/entities/item.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { Company } from '../companies/entities/company.entity';
import { ItemCategory } from '../items/entities/item-category.entity';
import { License } from '../licenses/entities/license.entity';

export interface GlobalSearchResult {
  id: string;
  type: 'ITEM' | 'USER' | 'DEPARTMENT' | 'COMPANY' | 'CATEGORY' | 'LICENSE';
  title: string;
  subtitle: string;
  url: string;
  metadata?: any;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Item) private readonly itemsRepo: Repository<Item>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Department) private readonly deptsRepo: Repository<Department>,
    @InjectRepository(Company) private readonly compsRepo: Repository<Company>,
    @InjectRepository(ItemCategory) private readonly catsRepo: Repository<ItemCategory>,
    @InjectRepository(License) private readonly licensesRepo: Repository<License>,
  ) {}

  async globalSearch(query: string): Promise<GlobalSearchResult[]> {
    if (!query || query.length < 2) return [];

    const searchTerm = `%${query}%`;
    const results: GlobalSearchResult[] = [];

    // 1. Search Items (Name, Barcode, SerialNumber)
    const items = await this.itemsRepo.find({
      where: [
        { name: ILike(searchTerm) },
        { barcode: ILike(searchTerm) },
        { serialNumber: ILike(searchTerm) },
      ],
      take: 5,
      relations: ['category'],
    });
    items.forEach((i) => results.push({
      id: i.id,
      type: 'ITEM',
      title: i.name,
      subtitle: `Barcode: ${i.barcode} · ${i.category?.name || 'Asset'}`,
      url: `/items?search=${encodeURIComponent(i.barcode)}`,
      metadata: { barcode: i.barcode },
    }));

    // 2. Search Users (Name, Email, Full Name)
    const users = await this.usersRepo.createQueryBuilder('user')
      .where('user.firstName ILIKE :search', { search: searchTerm })
      .orWhere('user.lastName ILIKE :search', { search: searchTerm })
      .orWhere('user.email ILIKE :search', { search: searchTerm })
      .orWhere('CONCAT(user.firstName, \' \', user.lastName) ILIKE :search', { search: searchTerm })
      .take(5)
      .getMany();
    users.forEach((u) => results.push({
      id: u.id,
      type: 'USER',
      title: `${u.firstName} ${u.lastName}`,
      subtitle: `${u.email} · ${(u.role || '').replace('_', ' ')}`,
      url: `/users?search=${encodeURIComponent(u.email)}`,
      metadata: { email: u.email },
    }));

    // 3. Search Departments (Name, Code)
    const depts = await this.deptsRepo.find({
      where: [
        { name: ILike(searchTerm) },
        { code: ILike(searchTerm) },
      ],
      take: 3,
    });
    depts.forEach((d) => results.push({
      id: d.id,
      type: 'DEPARTMENT',
      title: d.name,
      subtitle: `Code: ${d.code} · Department`,
      url: `/departments?search=${encodeURIComponent(d.code)}`,
      metadata: { code: d.code },
    }));

    // 4. Search Companies (Name, Code)
    const comps = await this.compsRepo.find({
      where: [
        { name: ILike(searchTerm) },
        { code: ILike(searchTerm) },
      ],
      take: 3,
    });
    comps.forEach((c) => results.push({
      id: c.id,
      type: 'COMPANY',
      title: c.name,
      subtitle: `Entity: ${c.code}`,
      url: `/companies?search=${encodeURIComponent(c.code)}`,
      metadata: { code: c.code },
    }));

    // 5. Search Categories (Name, Code)
    const cats = await this.catsRepo.find({
      where: [
        { name: ILike(searchTerm) },
        { code: ILike(searchTerm) },
      ],
      take: 3,
    });
    cats.forEach((cat) => results.push({
      id: cat.id,
      type: 'CATEGORY',
      title: cat.name,
      subtitle: `Asset Category: ${cat.code}`,
      url: `/categories?search=${encodeURIComponent(cat.code)}`,
      metadata: { code: cat.code },
    }));

    // 6. Search Licenses (Software Name, Vendor, Key)
    const licenses = await this.licensesRepo.find({
      where: [
        { softwareName: ILike(searchTerm) },
        { vendor: ILike(searchTerm) },
        { licenseKey: ILike(searchTerm) },
      ],
      take: 5,
    });
    licenses.forEach((l) => {
      const keySnippet = l.licenseKey ? ` · Key: ${l.licenseKey.slice(0, 8)}...` : '';
      results.push({
        id: l.id,
        type: 'LICENSE',
        title: l.softwareName,
        subtitle: `Vendor: ${l.vendor}${keySnippet}`,
        url: `/licenses?search=${encodeURIComponent(l.softwareName)}`,
        metadata: { key: l.licenseKey },
      });
    });

    return results;
  }
}
