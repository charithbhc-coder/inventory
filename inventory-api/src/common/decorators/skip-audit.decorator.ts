import { SetMetadata } from '@nestjs/common';

export const SKIP_AUDIT_KEY = 'skipAudit';

/**
 * Marks a route handler so the global AuditLogInterceptor will NOT write an
 * audit_logs row for it. Use sparingly — only for intentionally untracked
 * operations (e.g. the time-boxed permanent-delete cleanup tool).
 */
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);
