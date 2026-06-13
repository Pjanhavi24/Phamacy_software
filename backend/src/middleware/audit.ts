import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { AuditAction } from '../types';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const resolveAction = (method: string, path: string): AuditAction => {
  const upperMethod = method.toUpperCase();
  if (upperMethod === 'POST') return AuditAction.CREATE;
  if (upperMethod === 'PUT' || upperMethod === 'PATCH') return AuditAction.UPDATE;
  if (upperMethod === 'DELETE') return AuditAction.DELETE;
  return AuditAction.READ;
};

const resolveEntityType = (path: string): string => {
  const segments = path.split('/').filter(Boolean);
  // /api/v1/<entity>/...
  const entityIndex = 3; // after 'api', 'v1'
  return segments[entityIndex - 1] || 'unknown';
};

const resolveEntityId = (req: Request): string | undefined => {
  return req.params?.id || req.params?.medicineId || req.params?.saleId || req.params?.purchaseId;
};

export const auditLog = (req: Request, res: Response, next: NextFunction): void => {
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);
  const startTime = Date.now();

  res.json = function (body: any) {
    const duration = Date.now() - startTime;

    if (req.user) {
      const action = resolveAction(req.method, req.path);
      const entityType = resolveEntityType(req.originalUrl);
      const entityId = resolveEntityId(req);

      const auditPayload = {
        userId: req.user.userId,
        action,
        entityType,
        entityId: entityId || null,
        requestPath: req.originalUrl,
        requestMethod: req.method,
        requestBody: sanitizeBody(req.body),
        responseStatus: res.statusCode,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || null,
        requestId: req.requestId || null,
        durationMs: duration,
        success: res.statusCode < 400,
      };

      // Fire-and-forget audit log â€” do not block response
      setImmediate(async () => {
        try {
          await prisma.auditLog.create({ data: auditPayload });
        } catch (err) {
          console.error('[AuditLog] Failed to write audit log:', err);
        }
      });
    }

    return originalJson(body);
  };

  next();
};

const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'token',
  'refreshToken',
  'otp',
  'secret',
  'pin',
  'cvv',
  'cardNumber',
]);

const sanitizeBody = (body: Record<string, any>): Record<string, any> => {
  if (!body || typeof body !== 'object') return {};

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.has(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
};

// Standalone function for manual audit logging from service layer
export const createAuditEntry = async (params: {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        requestPath: null,
        requestMethod: null,
        requestBody: params.metadata || {},
        responseStatus: 200,
        ipAddress: params.ipAddress || null,
        userAgent: null,
        requestId: null,
        durationMs: 0,
        success: true,
      },
    });
  } catch (err) {
    console.error('[AuditLog] Failed to create manual audit entry:', err);
  }
};
