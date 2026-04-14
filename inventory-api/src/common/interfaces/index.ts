import { UserRole } from '../enums';

export class JwtPayload {
  sub: string; // user UUID
  email: string;
  role: string;
  companyId?: string;
  permissions?: string[];
  mustChangePassword: boolean;
  iat?: number;
  exp?: number;
}

export class PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
