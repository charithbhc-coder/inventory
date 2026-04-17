import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataSource } from 'typeorm';
import { AuditLog } from '../../audit-logs/entities/audit-log.entity';

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

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
          const sanitizedBody = this.sanitizeBody(request.body);
          const responseMetadata = this.extractResponseMetadata(data);

          const auditLog = this.dataSource.getRepository(AuditLog).create({
            userId: user.sub,
            userEmail: user.email || 'system-admin@internal.com',
            action,
            entityType,
            entityId,
            ipAddress: ip || request.connection?.remoteAddress?.substring(0, 50) || 'unknown',
            userAgent: (headers['user-agent'] || 'unknown').substring(0, 500),
            companyId: user.companyId || null,
            newValues: { 
              ...sanitizedBody,
              ...responseMetadata,
              method, 
              url, 
              duration: `${Date.now() - startTime}ms` 
            },
          });

          await this.dataSource.getRepository(AuditLog).save(auditLog);
          
          // Emit internal event for notification system (e.g. to broadbast WebSocket updates)
          this.eventEmitter.emit('audit.log_created', auditLog);
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
    
    let resource = 'unknown';
    for (let i = pathParts.length - 1; i >= 0; i--) {
      // Ignore standard UUIDs and numeric IDs
      if (!pathParts[i].match(/^[0-9a-f-]{36}$/i) && !pathParts[i].match(/^[0-9]+$/)) {
        resource = pathParts[i];
        break;
      }
    }

    const methodMap: Record<string, string> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };

    return `${methodMap[method] || method}_${resource.toUpperCase().replace(/-/g, '_')}`;
  }

  private extractResponseMetadata(data: any): any {
    if (!data || typeof data !== 'object') return {};
    
    // Pick interesting fields that help display names in logs
    const fields = ['assignedToName', 'toPersonName', 'fromPersonName', 'previousAssignedToName', 'name'];
    const metadata: Record<string, any> = {};
    
    fields.forEach(f => {
      if (data[f]) metadata[f] = data[f];
      // If nested in 'item' property
      if (data.item?.[f]) metadata[f] = data.item[f];
    });

    return metadata;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    
    const sensitiveFields = ['password', 'confirmPassword', 'token', 'secret', 'apiKey', 'creditCard'];
    const sanitized = { ...body };
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
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
