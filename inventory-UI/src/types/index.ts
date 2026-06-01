// ─────────────────────────────────────────────
// Enums (mirroring backend)
// ─────────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
}

export enum AdminPermission {
  // Companies
  VIEW_COMPANIES = 'VIEW_COMPANIES',
  CREATE_COMPANIES = 'CREATE_COMPANIES',
  UPDATE_COMPANIES = 'UPDATE_COMPANIES',
  DELETE_COMPANIES = 'DELETE_COMPANIES',

  // Departments
  VIEW_DEPARTMENTS = 'VIEW_DEPARTMENTS',
  CREATE_DEPARTMENTS = 'CREATE_DEPARTMENTS',
  UPDATE_DEPARTMENTS = 'UPDATE_DEPARTMENTS',
  DELETE_DEPARTMENTS = 'DELETE_DEPARTMENTS',

  // Users
  VIEW_USERS = 'VIEW_USERS',
  CREATE_USERS = 'CREATE_USERS',
  UPDATE_USERS = 'UPDATE_USERS',
  DELETE_USERS = 'DELETE_USERS',

  // Items/Assets
  VIEW_ITEMS = 'VIEW_ITEMS',
  CREATE_ITEMS = 'CREATE_ITEMS',
  UPDATE_ITEMS = 'UPDATE_ITEMS',
  DELETE_ITEMS = 'DELETE_ITEMS',
  ASSIGN_ITEMS = 'ASSIGN_ITEMS',
  PERMANENT_DELETE_ITEMS = 'PERMANENT_DELETE_ITEMS',
  MANAGE_REPAIRS = 'MANAGE_REPAIRS',
  MANAGE_DISPOSALS = 'MANAGE_DISPOSALS',
  REQUEST_DISPOSAL = 'REQUEST_DISPOSAL',
  APPROVE_DISPOSAL_L1 = 'APPROVE_DISPOSAL_L1',
  APPROVE_DISPOSAL_L2 = 'APPROVE_DISPOSAL_L2',
  CREATE_GATE_PASS = 'CREATE_GATE_PASS',
  APPROVE_GATE_PASS = 'APPROVE_GATE_PASS',
  VIEW_WAREHOUSE = 'VIEW_WAREHOUSE',
  // Categories
  VIEW_CATEGORIES = 'VIEW_CATEGORIES',
  CREATE_CATEGORIES = 'CREATE_CATEGORIES',
  UPDATE_CATEGORIES = 'UPDATE_CATEGORIES',
  DELETE_CATEGORIES = 'DELETE_CATEGORIES',
  MANAGE_CATEGORIES = 'MANAGE_CATEGORIES',

  // Software Licenses
  VIEW_LICENSES = 'VIEW_LICENSES',
  CREATE_LICENSES = 'CREATE_LICENSES',
  UPDATE_LICENSES = 'UPDATE_LICENSES',
  DELETE_LICENSES = 'DELETE_LICENSES',


  // Employee Management
  VIEW_EMPLOYEES = 'VIEW_EMPLOYEES',
  MANAGE_EMPLOYEES = 'MANAGE_EMPLOYEES',
  REQUEST_TRANSFERS = 'REQUEST_TRANSFERS',
  APPROVE_TRANSFERS = 'APPROVE_TRANSFERS',

  // Reports & Analytics
  VIEW_REPORTS = 'VIEW_REPORTS',
  EXPORT_DATA = 'EXPORT_DATA',
  GENERATE_BARCODES = 'GENERATE_BARCODES',
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',

  // System Settings
  VIEW_SETTINGS = 'VIEW_SETTINGS',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
}

export enum ItemStatus {
  WAREHOUSE = 'WAREHOUSE',
  IN_USE = 'IN_USE',
  IN_REPAIR = 'IN_REPAIR',
  SENT_TO_REPAIR = 'SENT_TO_REPAIR',
  DISPOSED = 'DISPOSED',
  LOST = 'LOST',
  IN_TRANSIT = 'IN_TRANSIT',
}

export enum GatePassStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}

export enum ItemCondition {
  NEW = 'NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  DAMAGED = 'DAMAGED',
  IRREPARABLE = 'IRREPARABLE',
}

export enum DisposalMethod {
  SCRAPPED = 'SCRAPPED',
  DONATED = 'DONATED',
  SOLD = 'SOLD',
  RECYCLED = 'RECYCLED',
  RETURNED_TO_VENDOR = 'RETURNED_TO_VENDOR',
}

// ─────────────────────────────────────────────
// Auth & User Types
// ─────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  companyId?: string;
  permissions: AdminPermission[];
  mustChangePassword: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  companyId?: string | null;
  permissions: AdminPermission[];
  mustChangePassword: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
  user: User;
}

// ─────────────────────────────────────────────
// Company Types
// ─────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// Item Types
// ─────────────────────────────────────────────

export interface ItemCategory {
  id: string;
  name: string;
  description?: string;
  companyId?: string;
}

export interface ItemEvent {
  id: string;
  eventType: string;
  notes?: string;
  performedByUserId: string;
  performedByName?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface Item {
  id: string;
  name: string;
  barcode: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  categoryId?: string;
  category?: ItemCategory;
  companyId?: string;
  company?: Company;
  departmentId?: string;
  status: ItemStatus;
  condition: ItemCondition;
  isWorking: boolean;
  needsRepair: boolean;
  assignedToName?: string;
  assignedToEmployeeId?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  vendor?: string;
  source?: string;
  warrantyCards: string[];
  invoices: string[];
  notes?: string;
  disposalReason?: string;
  disposalMethod?: DisposalMethod;
  disposedByName?: string;
  disposedAt?: string;
  events?: ItemEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─────────────────────────────────────────────
// Analytics Types
// ─────────────────────────────────────────────

export interface AnalyticsSummary {
  totalItems: number;
  totalInUse: number;
  totalInRepair: number;
  totalDisposed: number;
  totalWarehouse: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType?: string;
  entityId?: string;
  companyId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  createdAt: string;
}

export enum NotificationType {
  ITEM_ADDED = 'ITEM_ADDED',
  ITEM_ASSIGNED = 'ITEM_ASSIGNED',
  ITEM_SENT_TO_REPAIR = 'ITEM_SENT_TO_REPAIR',
  ITEM_RETURNED_FROM_REPAIR = 'ITEM_RETURNED_FROM_REPAIR',
  ITEM_DISPOSED = 'ITEM_DISPOSED',
  DISPOSAL_REQUESTED = 'DISPOSAL_REQUESTED',
  DISPOSAL_APPROVED = 'DISPOSAL_APPROVED',
  DISPOSAL_REJECTED = 'DISPOSAL_REJECTED',
  DISPOSAL_CANCELLED = 'DISPOSAL_CANCELLED',
  ITEM_LOST = 'ITEM_LOST',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_PERMISSIONS_UPDATED = 'ACCOUNT_PERMISSIONS_UPDATED',
  ACCOUNT_ROLE_UPDATED = 'ACCOUNT_ROLE_UPDATED',

  // License Notifications
  LICENSE_ADDED = 'LICENSE_ADDED',
  LICENSE_UPDATED = 'LICENSE_UPDATED',
  LICENSE_EXPIRING = 'LICENSE_EXPIRING',
  LICENSE_EXPIRED = 'LICENSE_EXPIRED',
  USER_UPDATED = 'USER_UPDATED',

  // Employee & Transfer Notifications
  TRANSFER_REQUEST_SUBMITTED = 'TRANSFER_REQUEST_SUBMITTED',
  TRANSFER_REQUEST_APPROVED = 'TRANSFER_REQUEST_APPROVED',
  TRANSFER_REQUEST_REJECTED = 'TRANSFER_REQUEST_REJECTED',
  BULK_OFFBOARDED = 'BULK_OFFBOARDED',
}

export enum DisposalCondition {
  BEYOND_REPAIR = 'BEYOND_REPAIR',
  OBSOLETE = 'OBSOLETE',
  UNUSED = 'UNUSED',
  PHYSICALLY_DAMAGED = 'PHYSICALLY_DAMAGED',
}

export enum DisposalRequestStatus {
  PENDING_L1 = 'PENDING_L1',
  PENDING_L2 = 'PENDING_L2',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum DisposalReviewDecision {
  RECOMMENDED = 'RECOMMENDED',
  REJECTED = 'REJECTED',
}

export enum DisposalFinalDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface DataSecurityChecklist {
  businessDataBacked: boolean;
  companyDataErased: boolean;
  storageFormatted: boolean;
  userAccountsRemoved: boolean;
  removedFromDomain: boolean;
  physicalDestructionDone: boolean;
}

export interface DisposalRequestUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface DisposalRequest {
  id: string;
  itemId: string;
  item: { id: string; name: string; barcode: string; category: { name: string } };
  companyId: string;

  requestedByUserId: string;
  requestedByUser: DisposalRequestUser;
  requestedAt: string;
  disposalReason: string;
  disposalCondition: DisposalCondition;
  technicalEvaluation: string;
  proposedMethod: DisposalMethod;
  evidencePhotoUrls: string[] | null;
  notes: string | null;

  l1ReviewedByUserId: string | null;
  l1ReviewedByUser: Pick<DisposalRequestUser, 'firstName' | 'lastName'> | null;
  l1ReviewedAt: string | null;
  l1Decision: DisposalReviewDecision | null;
  l1Notes: string | null;

  l2ApprovedByUserId: string | null;
  l2ApprovedByUser: Pick<DisposalRequestUser, 'firstName' | 'lastName'> | null;
  l2ApprovedAt: string | null;
  l2Decision: DisposalFinalDecision | null;
  l2Notes: string | null;
  l1Bypassed: boolean;
  dataSecurityChecklist: DataSecurityChecklist | null;

  status: DisposalRequestStatus;
  updatedAt: string;
}
