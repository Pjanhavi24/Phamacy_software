import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  code?: string;
  requestId?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const successResponse = <T>(
  data: T,
  message: string = 'Success',
  requestId?: string
): ApiResponse<T> => ({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString(),
  ...(requestId && { requestId }),
});

export const errorResponse = (
  message: string,
  code?: string,
  requestId?: string
): ApiResponse<never> => ({
  success: false,
  message,
  ...(code && { code }),
  timestamp: new Date().toISOString(),
  ...(requestId && { requestId }),
});

export const paginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message: string = 'Data retrieved successfully',
  requestId?: string
): PaginatedResponse<T> => {
  const totalPages = Math.ceil(total / limit);
  return {
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
  };
};

// Express response helpers
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response => {
  return res.status(statusCode).json(successResponse(data, message, res.req?.requestId));
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): Response => {
  return res.status(201).json(successResponse(data, message, res.req?.requestId));
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400,
  code?: string
): Response => {
  return res.status(statusCode).json(errorResponse(message, code, res.req?.requestId));
};

export const sendNotFound = (
  res: Response,
  resource: string = 'Resource'
): Response => {
  return res.status(404).json(
    errorResponse(`${resource} not found`, 'NOT_FOUND', res.req?.requestId)
  );
};

export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized'
): Response => {
  return res.status(401).json(errorResponse(message, 'UNAUTHORIZED', res.req?.requestId));
};

export const sendForbidden = (
  res: Response,
  message: string = 'Access denied'
): Response => {
  return res.status(403).json(errorResponse(message, 'FORBIDDEN', res.req?.requestId));
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): Response => {
  return res.status(200).json(
    paginatedResponse(data, total, page, limit, message, res.req?.requestId)
  );
};

export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

// Parse pagination query params
export const parsePagination = (
  query: Record<string, string | string[] | undefined>
): { page: number; limit: number; skip: number } => {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
