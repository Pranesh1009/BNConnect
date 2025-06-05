import { Response } from 'express';

interface ApiResponse<T> {
  data?: T;
  status: 'success' | 'error';
  message?: string;
  metadata?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const sendSuccess = <T>(res: Response, data: T, message: string = 'Success', statusCode: number = 200, metadata?: {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}) => {
  const response: ApiResponse<T> = {
    data,
    status: 'success',
    message,
    metadata
  };
  return res.status(statusCode).json(response);
};

export const sendError = (res: Response, message: string = 'Error', statusCode: number = 500) => {
  const response: ApiResponse<null> = {
    status: 'error',
    message
  };
  return res.status(statusCode).json(response);
}; 