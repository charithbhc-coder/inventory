import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { ExcelGenerator } from './generators/excel.generator';
import { PdfGenerator } from './generators/pdf.generator';
import { ReportFilterDto } from './dto/report-filter.dto';
import { ScheduledReport, ReportFrequency, FileFormat } from './entities/scheduled-report.entity';
import { CreateScheduledReportDto, UpdateScheduledReportDto } from './dto/create-scheduled-report.dto';
import { SendReportEmailDto } from './dto/send-email.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ReportsService {
  constructor(
    private dataSource: DataSource,
    private excelGenerator: ExcelGenerator,
    private pdfGenerator: PdfGenerator,
    @InjectRepository(ScheduledReport)
    private scheduledReportRepo: Repository<ScheduledReport>,
    private mailService: MailService,
  ) {}

  // ─── DATA QUERIES ─────────────────────────────────────────────────

  async getGlobalAssetRegisterData(filters: ReportFilterDto) {
    let query = `
      SELECT 
        i.barcode,
        i.name as "itemName",
        i."serialNumber",
        c.name as "companyName",
        d.name as "departmentName",
        cat.name as "categoryName",
        i.status,
        i.condition,
        i."purchasePrice",
        TO_CHAR(i."purchaseDate", 'YYYY-MM-DD') as "purchaseDate",
        i."assignedToName" as "assignedTo",
        i."assignedToEmployeeId" as "empId"
      FROM items i
      LEFT JOIN companies c ON c.id = i."companyId"
      LEFT JOIN departments d ON d.id = i."departmentId"
      LEFT JOIN item_categories cat ON cat.id = i."categoryId"
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (filters.companyId)    { query += ` AND i."companyId" = $${idx++}`;    params.push(filters.companyId); }
    if (filters.departmentId) { query += ` AND i."departmentId" = $${idx++}`; params.push(filters.departmentId); }
    if (filters.categoryId)   { query += ` AND i."categoryId" = $${idx++}`;   params.push(filters.categoryId); }
    if (filters.status)       { query += ` AND i.status = $${idx++}`;         params.push(filters.status); }
    if (filters.dateFrom)     { query += ` AND i."createdAt" >= $${idx++}`;   params.push(filters.dateFrom); }
    if (filters.dateTo)       { query += ` AND i."createdAt" <= $${idx++}`;   params.push(filters.dateTo); }
    if (filters.assignedTo) {
      query += ` AND (i."assignedToName" ILIKE $${idx} OR i."assignedToEmployeeId" ILIKE $${idx})`;
      params.push(`%${filters.assignedTo}%`); idx++;
    }
    if (filters.search) {
      query += ` AND (i.name ILIKE $${idx} OR i.barcode ILIKE $${idx} OR i."serialNumber" ILIKE $${idx})`;
      params.push(`%${filters.search}%`); idx++;
    }
    query += ` ORDER BY c.name, i.barcode`;
    return this.dataSource.query(query, params);
  }

  async getInventorySummaryData(filters: ReportFilterDto) {
    let query = `
      SELECT 
        c.name as "companyName",
        cat.name as "categoryName",
        COUNT(i.id) as "totalAssets",
        COUNT(i.id) FILTER (WHERE i.status = 'IN_USE') as "inUse",
        COUNT(i.id) FILTER (WHERE i.status IN ('IN_REPAIR', 'SENT_TO_REPAIR')) as "inRepair",
        COUNT(i.id) FILTER (WHERE i.status = 'LOST') as "lost",
        COUNT(i.id) FILTER (WHERE i.status = 'WAREHOUSE') as "warehouse",
        SUM(i."purchasePrice") as "totalValue"
      FROM item_categories cat
      CROSS JOIN companies c
      LEFT JOIN items i ON i."categoryId" = cat.id AND i."companyId" = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;
    if (filters.companyId)  { query += ` AND c.id = $${idx++}`;   params.push(filters.companyId); }
    if (filters.categoryId) { query += ` AND cat.id = $${idx++}`; params.push(filters.categoryId); }
    query += ` GROUP BY c.name, cat.name HAVING COUNT(i.id) > 0 ORDER BY c.name, cat.name`;
    return this.dataSource.query(query, params);
  }

  async getDepartmentReportData(filters: ReportFilterDto) {
    if (!filters.departmentId && !filters.companyId) {
      throw new BadRequestException('departmentId or companyId is required for department reports');
    }
    let query = `
      SELECT
        d.name as "departmentName",
        c.name as "companyName",
        i.barcode,
        i.name as "itemName",
        cat.name as "categoryName",
        i.status,
        i.condition,
        i."assignedToName" as "assignedTo",
        i."assignedToEmployeeId" as "empId",
        i."purchasePrice",
        TO_CHAR(i."purchaseDate", 'YYYY-MM-DD') as "purchaseDate"
      FROM items i
      LEFT JOIN departments d ON d.id = i."departmentId"
      LEFT JOIN companies c ON c.id = i."companyId"
      LEFT JOIN item_categories cat ON cat.id = i."categoryId"
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;
    if (filters.departmentId) { query += ` AND i."departmentId" = $${idx++}`; params.push(filters.departmentId); }
    if (filters.companyId)    { query += ` AND i."companyId" = $${idx++}`;    params.push(filters.companyId); }
    if (filters.status)       { query += ` AND i.status = $${idx++}`;         params.push(filters.status); }
    query += ` ORDER BY d.name, i.barcode`;
    return this.dataSource.query(query, params);
  }

  async getActivityLogData(filters: ReportFilterDto) {
    let query = `
      SELECT
        ie."eventType",
        ie."createdAt"::timestamptz as "occurredAt",
        ie.notes,
        ie."toPersonName",
        ie."fromPersonName",
        i.name as "itemName",
        i.barcode,
        c.name as "companyName",
        u."firstName" || ' ' || u."lastName" as "performedBy"
      FROM item_events ie
      JOIN items i ON i.id = ie."itemId"
      LEFT JOIN companies c ON c.id = i."companyId"
      JOIN users u ON u.id = ie."performedByUserId"
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;
    if (filters.companyId) { query += ` AND i."companyId" = $${idx++}`; params.push(filters.companyId); }
    if (filters.departmentId) { query += ` AND i."departmentId" = $${idx++}`; params.push(filters.departmentId); }
    if (filters.dateFrom) { query += ` AND ie."createdAt" >= $${idx++}`; params.push(filters.dateFrom); }
    if (filters.dateTo)   { query += ` AND ie."createdAt" <= $${idx++}`; params.push(filters.dateTo); }
    query += ` ORDER BY ie."createdAt" DESC LIMIT 2000`;
    return this.dataSource.query(query, params);
  }

  async getRepairHistoryData(filters: ReportFilterDto) {
    let query = `
      SELECT
        ie."createdAt"::timestamptz as "occurredAt",
        i.name as "itemName",
        i.barcode,
        c.name as "companyName",
        ie.notes as "repairNotes",
        ie."eventType",
        u."firstName" || ' ' || u."lastName" as "performedBy"
      FROM item_events ie
      JOIN items i ON i.id = ie."itemId"
      LEFT JOIN companies c ON c.id = i."companyId"
      JOIN users u ON u.id = ie."performedByUserId"
      WHERE ie."eventType" IN ('SENT_TO_REPAIR', 'RETURNED_FROM_REPAIR', 'MARKED_NOT_WORKING', 'MARKED_WORKING')
    `;
    const params: any[] = [];
    let idx = 1;
    if (filters.companyId) { query += ` AND i."companyId" = $${idx++}`; params.push(filters.companyId); }
    if (filters.dateFrom)  { query += ` AND ie."createdAt" >= $${idx++}`; params.push(filters.dateFrom); }
    if (filters.dateTo)    { query += ` AND ie."createdAt" <= $${idx++}`; params.push(filters.dateTo); }
    query += ` ORDER BY ie."createdAt" DESC`;
    return this.dataSource.query(query, params);
  }

  async getLicensesReportData(filters: ReportFilterDto) {
    let query = `
      SELECT
        softwareName as "Software Name",
        vendor as "Vendor",
        licenseKey as "License Key",
        contactEmail as "Contact Email",
        maxUsers as "Max Users/Seats",
        status as "Status",
        TO_CHAR("purchaseDate", 'YYYY-MM-DD') as "Purchase Date",
        TO_CHAR("expiryDate", 'YYYY-MM-DD') as "Expiry Date"
      FROM licenses
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;
    if (filters.status) { query += ` AND status = $${idx++}`; params.push(filters.status); }
    if (filters.dateFrom) { query += ` AND "expiryDate" >= $${idx++}`; params.push(filters.dateFrom); }
    if (filters.dateTo)   { query += ` AND "expiryDate" <= $${idx++}`; params.push(filters.dateTo); }
    query += ` ORDER BY "expiryDate" ASC`;
    return this.dataSource.query(query, params);
  }

  // ─── EXCEL EXPORTS ────────────────────────────────────────────────

  async exportDetailedAssetExcel(filters: ReportFilterDto, userContext?: string): Promise<Buffer> {
    const data = await this.getGlobalAssetRegisterData(filters);
    return this.excelGenerator.generateBuffer(data, [
      { header: 'Barcode', key: 'barcode', width: 25 },
      { header: 'Item Name', key: 'itemName', width: 30 },
      { header: 'Serial #', key: 'serialNumber', width: 25 },
      { header: 'Company', key: 'companyName', width: 25 },
      { header: 'Department', key: 'departmentName', width: 25 },
      { header: 'Category', key: 'categoryName', width: 20 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Assigned To', key: 'assignedTo', width: 25 },
      { header: 'Emp ID', key: 'empId', width: 15 },
      { header: 'Price', key: 'purchasePrice', width: 15 },
      { header: 'Date', key: 'purchaseDate', width: 15 },
    ], 'Detailed Assets', userContext);
  }

  async exportSummaryExcel(filters: ReportFilterDto, userContext?: string): Promise<Buffer> {
    const data = await this.getInventorySummaryData(filters);
    return this.excelGenerator.generateBuffer(data, [
      { header: 'Company', key: 'companyName', width: 25 },
      { header: 'Category', key: 'categoryName', width: 25 },
      { header: 'Total Assets', key: 'totalAssets', width: 15 },
      { header: 'In Use', key: 'inUse', width: 15 },
      { header: 'In Repair', key: 'inRepair', width: 15 },
      { header: 'Lost', key: 'lost', width: 15 },
      { header: 'In Warehouse', key: 'warehouse', width: 15 },
      { header: 'Total Value', key: 'totalValue', width: 20 },
    ], 'Inventory Summary', userContext);
  }

  async exportDepartmentExcel(filters: ReportFilterDto, userContext?: string): Promise<Buffer> {
    const data = await this.getDepartmentReportData(filters);
    return this.excelGenerator.generateBuffer(data, [
      { header: 'Department', key: 'departmentName', width: 25 },
      { header: 'Company', key: 'companyName', width: 25 },
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'Item Name', key: 'itemName', width: 30 },
      { header: 'Category', key: 'categoryName', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Assigned To', key: 'assignedTo', width: 25 },
      { header: 'Price', key: 'purchasePrice', width: 15 },
    ], 'Department Assets', userContext);
  }

  async exportActivityExcel(filters: ReportFilterDto, userContext?: string): Promise<Buffer> {
    const data = await this.getActivityLogData(filters);
    return this.excelGenerator.generateBuffer(data, [
      { header: 'Date/Time', key: 'occurredAt', width: 25 },
      { header: 'Event', key: 'eventType', width: 30 },
      { header: 'Item', key: 'itemName', width: 30 },
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'Company', key: 'companyName', width: 25 },
      { header: 'Performed By', key: 'performedBy', width: 25 },
      { header: 'Notes', key: 'notes', width: 40 },
    ], 'Activity Log', userContext);
  }

  async exportRepairExcel(filters: ReportFilterDto, userContext?: string): Promise<Buffer> {
    const data = await this.getRepairHistoryData(filters);
    return this.excelGenerator.generateBuffer(data, [
      { header: 'Date/Time', key: 'occurredAt', width: 25 },
      { header: 'Event', key: 'eventType', width: 25 },
      { header: 'Item', key: 'itemName', width: 30 },
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'Company', key: 'companyName', width: 25 },
      { header: 'Performed By', key: 'performedBy', width: 25 },
      { header: 'Notes', key: 'repairNotes', width: 40 },
    ], 'Repair History', userContext);
  }

  async exportLicensesExcel(filters: ReportFilterDto, userContext?: string): Promise<Buffer> {
    const data = await this.getLicensesReportData(filters);
    return this.excelGenerator.generateBuffer(data, [
      { header: 'Software', key: 'Software Name', width: 30 },
      { header: 'Vendor', key: 'Vendor', width: 25 },
      { header: 'Key', key: 'License Key', width: 25 },
      { header: 'Seats', key: 'Max Users/Seats', width: 15 },
      { header: 'Status', key: 'Status', width: 15 },
      { header: 'Purchased', key: 'Purchase Date', width: 15 },
      { header: 'Expires', key: 'Expiry Date', width: 15 },
    ], 'Software Licenses', userContext);
  }

  // ─── PDF EXPORTS ──────────────────────────────────────────────────

  private buildTableHtml(headers: string[], rows: string[][]): string {
    const ths = headers.map(h => `<th>${h}</th>`).join('');
    const trs = rows.map(r => `<tr>${r.map(c => `<td>${c ?? '—'}</td>`).join('')}</tr>`).join('');
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  }

  async exportDetailedAssetPdf(filters: ReportFilterDto, userContext?: string): Promise<Buffer> {
    const data = await this.getGlobalAssetRegisterData(filters);
    const tableHtml = this.buildTableHtml(
      ['Barcode', 'Name', 'Company', 'Department', 'Category', 'Status', 'Assigned To', 'Price'],
      data.map((r: any) => [r.barcode, r.itemName, r.companyName, r.departmentName, r.categoryName, r.status, r.assignedTo, r.purchasePrice ? `$${r.purchasePrice}` : '—']),
    );
    return this.pdfGenerator.generatePdfFromHtml(this.pdfGenerator.buildReportHtmlWrapper('Master Asset Register', tableHtml, userContext));
  }

  async exportSummaryPdf(filters: ReportFilterDto, userContext?: string): Promise<Buffer> {
    const data = await this.getInventorySummaryData(filters);
    const tableHtml = this.buildTableHtml(
      ['Company', 'Category', 'Total', 'In Use', 'In Repair', 'Lost', 'Warehouse', 'Total Value'],
      data.map((r: any) => [r.companyName, r.categoryName, r.totalAssets, r.inUse, r.inRepair, r.lost, r.warehouse, r.totalValue ? `$${r.totalValue}` : '—']),
    );
    return this.pdfGenerator.generatePdfFromHtml(this.pdfGenerator.buildReportHtmlWrapper('Executive Inventory Summary', tableHtml, userContext));
  }

  async exportDepartmentPdf(filters: ReportFilterDto, userContext?: string): Promise<Buffer> {
    const data = await this.getDepartmentReportData(filters);
    const tableHtml = this.buildTableHtml(
      ['Department', 'Company', 'Barcode', 'Name', 'Category', 'Status', 'Assigned To', 'Price'],
      data.map((r: any) => [r.departmentName, r.companyName, r.barcode, r.itemName, r.categoryName, r.status, r.assignedTo, r.purchasePrice ? `$${r.purchasePrice}` : '—']),
    );
    return this.pdfGenerator.generatePdfFromHtml(this.pdfGenerator.buildReportHtmlWrapper('Department Asset Report', tableHtml, userContext));
  }

  async exportActivityPdf(filters: ReportFilterDto, userContext?: string): Promise<Buffer> {
    const data = await this.getActivityLogData(filters);
    const tableHtml = this.buildTableHtml(
      ['Date/Time', 'Event', 'Item', 'Barcode', 'Company', 'Performed By', 'Notes'],
      data.map((r: any) => [new Date(r.occurredAt).toLocaleString(), r.eventType, r.itemName, r.barcode, r.companyName, r.performedBy, r.notes]),
    );
    return this.pdfGenerator.generatePdfFromHtml(this.pdfGenerator.buildReportHtmlWrapper('System Activity Log', tableHtml, userContext));
  }

  async exportRepairPdf(filters: ReportFilterDto, userContext?: string): Promise<Buffer> {
    const data = await this.getRepairHistoryData(filters);
    const tableHtml = this.buildTableHtml(
      ['Date/Time', 'Event', 'Item', 'Barcode', 'Company', 'Performed By', 'Notes'],
      data.map((r: any) => [new Date(r.occurredAt).toLocaleString(), r.eventType, r.itemName, r.barcode, r.companyName, r.performedBy, r.repairNotes]),
    );
    return this.pdfGenerator.generatePdfFromHtml(this.pdfGenerator.buildReportHtmlWrapper('Repair History Report', tableHtml, userContext));
  }

  async exportLicensesPdf(filters: ReportFilterDto, userContext?: string): Promise<Buffer> {
    const data = await this.getLicensesReportData(filters);
    const tableHtml = this.buildTableHtml(
      ['Software', 'Vendor', 'Seats', 'Status', 'Expires'],
      data.map((r: any) => [r['Software Name'], r['Vendor'], r['Max Users/Seats'], r['Status'], r['Expiry Date']]),
    );
    return this.pdfGenerator.generatePdfFromHtml(this.pdfGenerator.buildReportHtmlWrapper('Software Licenses Report', tableHtml, userContext));
  }

  // ─── GENERIC BUFFER GENERATOR (used by scheduler) ─────────────────

  async generateReportBuffer(reportType: string, format: 'PDF' | 'EXCEL', filters: ReportFilterDto, userContext?: string): Promise<Buffer> {
    if (format === 'EXCEL') {
      switch (reportType) {
        case 'assets':     return this.exportDetailedAssetExcel(filters, userContext);
        case 'summary':    return this.exportSummaryExcel(filters, userContext);
        case 'department': return this.exportDepartmentExcel(filters, userContext);
        case 'activity':   return this.exportActivityExcel(filters, userContext);
        case 'repair':     return this.exportRepairExcel(filters, userContext);
        case 'licenses':   return this.exportLicensesExcel(filters, userContext);
        default: throw new BadRequestException(`Unknown report type: ${reportType}`);
      }
    } else {
      switch (reportType) {
        case 'assets':     return this.exportDetailedAssetPdf(filters, userContext);
        case 'summary':    return this.exportSummaryPdf(filters, userContext);
        case 'department': return this.exportDepartmentPdf(filters, userContext);
        case 'activity':   return this.exportActivityPdf(filters, userContext);
        case 'repair':     return this.exportRepairPdf(filters, userContext);
        case 'licenses':   return this.exportLicensesPdf(filters, userContext);
        default: throw new BadRequestException(`Unknown report type: ${reportType}`);
      }
    }
  }

  // ─── EMAIL DISPATCH ───────────────────────────────────────────────

  async sendEmailDispatch(dto: SendReportEmailDto, userContext?: string): Promise<{ sent: number; message: string }> {
    const attachments: { filename: string; content: Buffer; contentType: string }[] = [];

    if (dto.reportType && dto.filters) {
      const format = dto.fileFormat || 'PDF';
      if (format === 'BOTH' || format === 'PDF') {
        const buf = await this.generateReportBuffer(dto.reportType, 'PDF', dto.filters, userContext);
        attachments.push({ filename: `report_${dto.reportType}.pdf`, content: buf, contentType: 'application/pdf' });
      }
      if (format === 'BOTH' || format === 'EXCEL') {
        const buf = await this.generateReportBuffer(dto.reportType, 'EXCEL', dto.filters, userContext);
        attachments.push({ filename: `report_${dto.reportType}.xlsx`, content: buf, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      }
    }

    await this.mailService.sendReportEmail(dto.recipientEmails, dto.subject, dto.body, attachments);
    return { sent: dto.recipientEmails.length, message: `Email dispatched to ${dto.recipientEmails.length} recipient(s)` };
  }

  // ─── SCHEDULE CRUD ────────────────────────────────────────────────

  findAllSchedules() {
    return this.scheduledReportRepo.find({ order: { createdAt: 'DESC' } });
  }

  async createSchedule(dto: CreateScheduledReportDto, userId: string): Promise<ScheduledReport> {
    const nextRunAt = this.computeNextRun(dto.frequency, dto.timeOfDay, dto.dayOfWeek, dto.dayOfMonth, dto.specificDate);
    const schedule = this.scheduledReportRepo.create({
      ...dto,
      createdByUserId: userId,
      nextRunAt,
      recipientUserIds: [],
    });
    return this.scheduledReportRepo.save(schedule);
  }

  async updateSchedule(id: string, dto: UpdateScheduledReportDto): Promise<ScheduledReport> {
    const schedule = await this.scheduledReportRepo.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException('Scheduled report not found');
    Object.assign(schedule, dto);
    if (dto.frequency || dto.timeOfDay || dto.dayOfWeek !== undefined || dto.dayOfMonth !== undefined || dto.specificDate !== undefined) {
      schedule.nextRunAt = this.computeNextRun(
        schedule.frequency, schedule.timeOfDay, schedule.dayOfWeek, schedule.dayOfMonth, schedule.specificDate,
      );
    }
    return this.scheduledReportRepo.save(schedule);
  }

  async deleteSchedule(id: string): Promise<void> {
    const schedule = await this.scheduledReportRepo.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException('Scheduled report not found');
    await this.scheduledReportRepo.remove(schedule);
  }

  // Compute the next run timestamp given frequency, time, and day settings
  computeNextRun(
    frequency: ReportFrequency,
    timeOfDay: string,
    dayOfWeek?: number | null,
    dayOfMonth?: number | null,
    specificDate?: string | null,
  ): Date | null {
    if (frequency === ReportFrequency.ONCE && specificDate) {
      const [year, month, day] = specificDate.split('-').map(Number);
      const [hour, minute] = timeOfDay.split(':').map(Number);
      return new Date(year, month - 1, day, hour, minute, 0, 0);
    }

    const [hour, minute] = timeOfDay.split(':').map(Number);
    const now = new Date();
    const next = new Date();
    next.setSeconds(0, 0);
    next.setHours(hour, minute, 0, 0);

    if (frequency === ReportFrequency.DAILY) {
      if (next <= now) next.setDate(next.getDate() + 1);
    } else if (frequency === ReportFrequency.WEEKLY) {
      const target = dayOfWeek ?? 1; // default Monday
      const diff = (target - now.getDay() + 7) % 7 || 7;
      next.setDate(now.getDate() + diff);
    } else if (frequency === ReportFrequency.MONTHLY) {
      const target = dayOfMonth ?? 1;
      next.setDate(target);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(target);
      }
    }
    return next;
  }
}
