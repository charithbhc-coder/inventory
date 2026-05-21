import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GatePassesService } from './gate-passes.service';
import { GatePassStatus, ItemStatus } from '../common/enums';

const mockItem = {
  id: 'item-1',
  name: 'Test Laptop',
  barcode: 'BC-001',
  companyId: 'company-1',
  status: ItemStatus.WAREHOUSE,
  gatePassId: null,
};

const mockPass = {
  id: 'pass-1',
  referenceNo: 'GP-1001',
  companyId: 'company-1',
  destination: 'Branch Office',
  reason: 'Reallocation',
  authorizedBy: null,
  status: GatePassStatus.PENDING_APPROVAL,
  createdByUserId: 'user-requester',
  approvedByUserId: null,
  approvedAt: null,
  rejectionNotes: null,
  items: [{ ...mockItem }],
};

describe('GatePassesService', () => {
  let service: GatePassesService;
  let gatePassRepo: any;
  let itemsRepo: any;
  let dataSource: any;

  beforeEach(() => {
    gatePassRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
      createQueryBuilder: jest.fn(),
    };
    itemsRepo = {
      find: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
    };
    const mockManager = {
      findOne: jest.fn(),
      save: jest.fn((_, e) => Promise.resolve(e ?? _)),
      create: jest.fn((_, data) => ({ ...data })),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: '1000' }),
      }),
    };
    dataSource = { transaction: jest.fn((cb) => cb(mockManager)) };
    service = new GatePassesService(
      gatePassRepo,
      itemsRepo,
      {} as any,
      dataSource,
    );
  });

  describe('approve', () => {
    it('throws NotFoundException if gate pass not found', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const mgr = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn(), create: jest.fn() };
        return cb(mgr);
      });
      await expect(service.approve('bad-id', 'approver-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if status is not PENDING_APPROVAL', async () => {
      const activePass = { ...mockPass, status: GatePassStatus.ACTIVE, items: [] };
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const mgr = { findOne: jest.fn().mockResolvedValue(activePass), save: jest.fn(), create: jest.fn() };
        return cb(mgr);
      });
      await expect(service.approve('pass-1', 'approver-1')).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if approver is the creator', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const mgr = { findOne: jest.fn().mockResolvedValue({ ...mockPass, items: [] }), save: jest.fn(), create: jest.fn() };
        return cb(mgr);
      });
      await expect(service.approve('pass-1', 'user-requester')).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if callerCompanyId does not match', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const mgr = { findOne: jest.fn().mockResolvedValue({ ...mockPass, items: [] }), save: jest.fn(), create: jest.fn() };
        return cb(mgr);
      });
      await expect(service.approve('pass-1', 'approver-1', 'other-company')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reject', () => {
    it('throws NotFoundException if gate pass not found', async () => {
      gatePassRepo.findOne.mockResolvedValue(null);
      await expect(service.reject('bad-id', { rejectionNotes: 'Wrong destination' }, 'approver-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if rejector is the creator', async () => {
      gatePassRepo.findOne.mockResolvedValue({ ...mockPass });
      await expect(service.reject('pass-1', { rejectionNotes: 'Nope' }, 'user-requester')).rejects.toThrow(ForbiddenException);
    });

    it('sets rejectionNotes and keeps PENDING_APPROVAL status', async () => {
      const pass = { ...mockPass };
      gatePassRepo.findOne.mockResolvedValue(pass);
      gatePassRepo.save.mockImplementation((e: any) => Promise.resolve(e));
      await service.reject('pass-1', { rejectionNotes: 'Wrong items listed' }, 'approver-1');
      expect(pass.rejectionNotes).toBe('Wrong items listed');
      expect(pass.status).toBe(GatePassStatus.PENDING_APPROVAL);
    });
  });

  describe('cancel', () => {
    it('throws ForbiddenException if caller is not the creator', async () => {
      gatePassRepo.findOne.mockResolvedValue({ ...mockPass });
      await expect(service.cancel('pass-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if status is not PENDING_APPROVAL', async () => {
      gatePassRepo.findOne.mockResolvedValue({ ...mockPass, status: GatePassStatus.ACTIVE });
      await expect(service.cancel('pass-1', 'user-requester')).rejects.toThrow(BadRequestException);
    });

    it('sets status to CANCELLED', async () => {
      const pass = { ...mockPass };
      gatePassRepo.findOne.mockResolvedValue(pass);
      gatePassRepo.save.mockImplementation((e: any) => Promise.resolve(e));
      await service.cancel('pass-1', 'user-requester');
      expect(pass.status).toBe(GatePassStatus.CANCELLED);
    });
  });

  describe('append', () => {
    it('throws BadRequestException if gate pass is not ACTIVE', async () => {
      gatePassRepo.findOne.mockResolvedValue({ ...mockPass, status: GatePassStatus.PENDING_APPROVAL });
      await expect(service.append('pass-1', { itemIds: ['item-1'] }, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('markReturned', () => {
    it('throws NotFoundException if gate pass not found', async () => {
      gatePassRepo.findOne.mockResolvedValue(null);
      await expect(service.markReturned('bad-id', {}, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if status is not ACTIVE', async () => {
      gatePassRepo.findOne.mockResolvedValue({ ...mockPass, status: GatePassStatus.PENDING_APPROVAL, items: [] });
      await expect(service.markReturned('pass-1', {}, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if callerCompanyId does not match', async () => {
      gatePassRepo.findOne.mockResolvedValue({ ...mockPass, status: GatePassStatus.ACTIVE, items: [] });
      await expect(service.markReturned('pass-1', {}, 'user-1', 'other-company')).rejects.toThrow(ForbiddenException);
    });
  });
});
