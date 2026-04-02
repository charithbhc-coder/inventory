import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataSource } from 'typeorm';
import { AuditLog } from '../../audit-logs/entities/audit-log.entity';

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;

    if (!WRITE_METHODS.includes(method) || !user) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (data) => {
        try {
          const action = this.deriveAction(method, url);
          const entityType = this.deriveEntityType(url);
          const entityId = this.deriveEntityId(request, data);

          const auditLog = this.dataSource.getRepository(AuditLog).create({
            userId: user.sub,
            userEmail: user.email || 'system-admin@internal.com', // Prevent null violation for SA
            action,
            entityType,
            entityId,
            ipAddress: ip || request.connection?.remoteAddress?.substring(0, 50) || 'unknown',
            userAgent: (headers['user-agent'] || 'unknown').substring(0, 500),
            companyId: user.companyId || null,
            newValues: { method, url, duration: `${Date.now() - startTime}ms` },
          });

          await this.dataSource.getRepository(AuditLog).save(auditLog);
        } catch (error) {
          console.error('[AuditLogInterceptor Error]:', error.message);
          // Never let audit logging crash the main flow
        }
      }),
    );
  }

  private deriveEntityId(request: any, data?: any): string | undefined {
    if (request.params) {
      const idStr = request.params.id || request.params.uuid || request.params.barcodeOrId;
      if (idStr) return idStr;
    }

    const cleanUrl = request.url.split('?')[0];
    const pathParts = cleanUrl.split('/').filter(Boolean);
    const uuidFromUrl = pathParts.find((p: string) =>
      p.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
    );

    if (uuidFromUrl) return uuidFromUrl;

    if (data && typeof data === 'object') {
      if (data.id) return data.id;
      if (data.uuid) return data.uuid;
      if (data.items && Array.isArray(data.items) && data.items[0]?.id) return data.items[0].id;
      if (data.item && data.item.id) return data.item.id;
    }

    return undefined;
  }

  private deriveAction(method: string, url: string): string {
    const cleanUrl = url.split('?')[0];
    const pathParts = cleanUrl.split('/').filter(Boolean);
    const resource = pathParts[pathParts.length - 1] || 'unknown';

    const methodMap: Record<string, string> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };

    return `${methodMap[method] || method}_${resource.toUpperCase()}`;
  }

  private deriveEntityType(url: string): string {
    const cleanUrl = url.split('?')[0];
    const pathParts = cleanUrl.split('/').filter(Boolean);
    // Skip 'api' and 'v1' prefixes
    const significant = pathParts.filter(
      (p) => p !== 'api' && p !== 'v1' && !p.match(/^[0-9a-f-]{36}$/i),
    );
    return significant[0] || 'unknown';
  }
}
