import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DisposalRequestsService } from './disposal-requests.service';
import {
  DisposalCondition,
  DisposalFinalDecision,
  DisposalMethod,
  DisposalRequestStatus,
  DisposalReviewDecision,
  ItemStatus,
} from '../common/enums';

const mockItem = {
  id: 'item-1',
  name: 'Test Laptop',
  barcode: 'BC-001',
  companyId: 'company-1',
  status: ItemStatus.WAREHOUSE,
  assignedToName: null,
  assignedToEmployeeId: null,
  previousAssignedToName: null,
  previousAssignedToEmployeeId: null,
  disposalReason: null,
  disposalMethod: null,
  disposalApprovedByName: null,
  disposalDate: null,
  disposalNotes: null,
};

const mockRequest = {
  id: 'req-1',
  itemId: 'item-1',
  companyId: 'company-1',
  requestedByUserId: 'user-requester',
  status: DisposalRequestStatus.PENDING_L1,
  disposalReason: 'Beyond repair',
  disposalCondition: DisposalCondition.BEYOND_REPAIR,
  technicalEvaluation: 'HDD failed, no parts available',
  proposedMethod: DisposalMethod.SCRAPPED,
  evidencePhotoUrls: null,
  notes: null,
  l1ReviewedByUserId: null,
  l1ReviewedAt: null,
  l1Decision: null,
  l1Notes: null,
  l2ApprovedByUserId: null,
  l2ApprovedAt: null,
  l2Decision: null,
  l2Notes: null,
  l1Bypassed: false,
  dataSecurityChecklist: null,
};

describe('DisposalRequestsService', () => {
  let service: DisposalRequestsService;
  let requestRepo: any;
  let itemRepo: any;
  let dataSource: any;
  let eventEmitter: any;

  beforeEach(() => {
    requestRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    itemRepo = { findOne: jest.fn() };
    dataSource = {
      transaction: jest.fn((cb: (mgr: any) => any) => cb({
        findOne: jest.fn(),
        create: jest.fn((_, data) => data),
        save: jest.fn((_, data) => Promise.resolve(data)),
      })),
    };
    eventEmitter = { emit: jest.fn() };

    service = new DisposalRequestsService(
      requestRepo,
      itemRepo,
      dataSource,
      eventEmitter,
    );
  });

  describe('create()', () => {
    it('throws NotFoundException if item does not exist', async () => {
      itemRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ itemId: 'item-1', disposalReason: 'test', disposalCondition: DisposalCondition.UNUSED, technicalEvaluation: 'test', proposedMethod: DisposalMethod.SCRAPPED }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if item is already DISPOSED', async () => {
      itemRepo.findOne.mockResolvedValue({ ...mockItem, status: ItemStatus.DISPOSED });
      await expect(
        service.create({ itemId: 'item-1', disposalReason: 'test', disposalCondition: DisposalCondition.UNUSED, technicalEvaluation: 'test', proposedMethod: DisposalMethod.SCRAPPED }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if an open request already exists', async () => {
      itemRepo.findOne.mockResolvedValue(mockItem);
      requestRepo.findOne.mockResolvedValue(mockRequest);
      await expect(
        service.create({ itemId: 'item-1', disposalReason: 'test', disposalCondition: DisposalCondition.UNUSED, technicalEvaluation: 'test', proposedMethod: DisposalMethod.SCRAPPED }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates request and emits disposal.requested event on success', async () => {
      itemRepo.findOne.mockResolvedValue(mockItem);
      requestRepo.findOne.mockResolvedValue(null);
      const created = { ...mockRequest };
      requestRepo.create.mockReturnValue(created);
      requestRepo.save.mockResolvedValue(created);

      await service.create({ itemId: 'item-1', disposalReason: 'test', disposalCondition: DisposalCondition.UNUSED, technicalEvaluation: 'test eval', proposedMethod: DisposalMethod.SCRAPPED }, 'user-requester');

      expect(requestRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('disposal.requested', expect.objectContaining({
        itemId: 'item-1',
        requestedByUserId: 'user-requester',
      }));
    });
  });

  describe('l1Review()', () => {
    it('throws NotFoundException if request does not exist', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      await expect(service.l1Review('req-1', { decision: DisposalReviewDecision.RECOMMENDED }, 'user-l1'))
        .rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if request is not PENDING_L1', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest, status: DisposalRequestStatus.PENDING_L2 });
      await expect(service.l1Review('req-1', { decision: DisposalReviewDecision.RECOMMENDED }, 'user-l1'))
        .rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if reviewer is the requester', async () => {
      requestRepo.findOne.mockResolvedValue(mockRequest);
      await expect(service.l1Review('req-1', { decision: DisposalReviewDecision.RECOMMENDED }, 'user-requester'))
        .rejects.toThrow(ForbiddenException);
    });

    it('sets status to PENDING_L2 when RECOMMENDED', async () => {
      const req = { ...mockRequest };
      requestRepo.findOne.mockResolvedValue(req);
      requestRepo.save.mockResolvedValue({ ...req, status: DisposalRequestStatus.PENDING_L2 });

      const result = await service.l1Review('req-1', { decision: DisposalReviewDecision.RECOMMENDED }, 'user-l1');

      expect(result.status).toBe(DisposalRequestStatus.PENDING_L2);
      expect(eventEmitter.emit).toHaveBeenCalledWith('disposal.l1_recommended', expect.anything());
    });

    it('sets status to REJECTED when REJECTED', async () => {
      const req = { ...mockRequest };
      requestRepo.findOne.mockResolvedValue(req);
      requestRepo.save.mockResolvedValue({ ...req, status: DisposalRequestStatus.REJECTED });

      const result = await service.l1Review('req-1', { decision: DisposalReviewDecision.REJECTED }, 'user-l1');

      expect(result.status).toBe(DisposalRequestStatus.REJECTED);
      expect(eventEmitter.emit).toHaveBeenCalledWith('disposal.l1_rejected', expect.anything());
    });
  });

  describe('l2Approve()', () => {
    const fullChecklist = {
      businessDataBacked: true,
      companyDataErased: true,
      storageFormatted: true,
      userAccountsRemoved: true,
      removedFromDomain: true,
      physicalDestructionDone: true,
    };

    it('throws ForbiddenException if approver is the requester', async () => {
      const txManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce({ ...mockRequest, status: DisposalRequestStatus.PENDING_L2 })
          .mockResolvedValueOnce(mockItem),
        create: jest.fn((_, data) => data),
        save: jest.fn((_, data) => Promise.resolve(data)),
      };
      dataSource.transaction.mockImplementation((cb: (mgr: any) => any) => cb(txManager));

      await expect(
        service.l2Approve('req-1', { decision: DisposalFinalDecision.APPROVED, dataSecurityChecklist: fullChecklist }, 'user-requester', 'Requester Name'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if checklist has unchecked items', async () => {
      const txManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce({ ...mockRequest, status: DisposalRequestStatus.PENDING_L2 })
          .mockResolvedValueOnce(mockItem),
        create: jest.fn((_, data) => data),
        save: jest.fn((_, data) => Promise.resolve(data)),
      };
      dataSource.transaction.mockImplementation((cb: (mgr: any) => any) => cb(txManager));

      const incompleteChecklist = { ...fullChecklist, storageFormatted: false };
      await expect(
        service.l2Approve('req-1', { decision: DisposalFinalDecision.APPROVED, dataSecurityChecklist: incompleteChecklist }, 'user-l2', 'L2 User'),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets l1Bypassed=true when approving from PENDING_L1', async () => {
      const savedRequest = { ...mockRequest, status: DisposalRequestStatus.APPROVED, l1Bypassed: true };
      const txManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce({ ...mockRequest, status: DisposalRequestStatus.PENDING_L1 })
          .mockResolvedValueOnce(mockItem),
        create: jest.fn((_, data) => data),
        save: jest.fn()
          .mockResolvedValueOnce(mockItem)
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce(savedRequest),
      };
      dataSource.transaction.mockImplementation((cb: (mgr: any) => any) => cb(txManager));

      const result = await service.l2Approve('req-1', { decision: DisposalFinalDecision.APPROVED, dataSecurityChecklist: fullChecklist }, 'user-l2', 'L2 User');

      expect(result.l1Bypassed).toBe(true);
    });
  });

  describe('cancel()', () => {
    it('throws ForbiddenException if user is not the requester', async () => {
      requestRepo.findOne.mockResolvedValue(mockRequest);
      await expect(service.cancel('req-1', 'different-user')).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if request is already APPROVED', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest, status: DisposalRequestStatus.APPROVED });
      await expect(service.cancel('req-1', 'user-requester')).rejects.toThrow(BadRequestException);
    });

    it('cancels a PENDING_L1 request successfully', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest });
      requestRepo.save.mockResolvedValue({ ...mockRequest, status: DisposalRequestStatus.CANCELLED });

      const result = await service.cancel('req-1', 'user-requester');
      expect(result.status).toBe(DisposalRequestStatus.CANCELLED);
    });
  });
});
