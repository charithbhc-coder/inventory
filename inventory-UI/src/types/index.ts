// ─────────────────────────────────────────────
// Enums (mirroring backend)
// ─────────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
}

export enum AdminPermission {
  MANAGE_COMPANIES = 'MANAGE_COMPANIES',
  MANAGE_DEPARTMENTS = 'MANAGE_DEPARTMENTS',
  MANAGE_USERS = 'MANAGE_USERS',
  ADD_ITEMS = 'ADD_ITEMS',
  EDIT_ITEMS = 'EDIT_ITEMS',
  DELETE_ITEMS = 'DELETE_ITEMS',
  ASSIGN_ITEMS = 'ASSIGN_ITEMS',
  MANAGE_REPAIRS = 'MANAGE_REPAIRS',
  MANAGE_DISPOSALS = 'MANAGE_DISPOSALS',
  VIEW_WAREHOUSE = 'VIEW_WAREHOUSE',
  MANAGE_CATEGORIES = 'MANAGE_CATEGORIES',
  VIEW_REPORTS = 'VIEW_REPORTS',
  EXPORT_DATA = 'EXPORT_DATA',
  GENERATE_BARCODES = 'GENERATE_BARCODES',
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
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
