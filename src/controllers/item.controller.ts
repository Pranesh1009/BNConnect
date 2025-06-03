import { Request, Response } from 'express';
import { PrismaClient, User } from '@prisma/client';
import logger from '../utils/logger';
import { handlePrismaError } from '../utils/prisma-error';
import { sendSuccess, sendError } from '../utils/response.util';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user: User;
}

export const createItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    const item = await prisma.item.create({
      data: {
        name,
        description,
        userId: req.user.id
      }
    });
    logger.info('Item created successfully', { itemId: item.id });
    return sendSuccess(res, item, 'Item created successfully', 201);
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

export const getItems = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      where: { userId: req.user.id }
    });
    return sendSuccess(res, items, 'Items retrieved successfully');
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

export const getItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const item = await prisma.item.findUnique({
      where: { id }
    });

    if (!item) {
      logger.warn('Item not found', { itemId: id });
      return sendError(res, 'Item not found', 404);
    }

    if (item.userId !== req.user.id) {
      logger.warn('Unauthorized item access attempt', { itemId: id, userId: req.user.id });
      return sendError(res, 'Unauthorized access', 403);
    }

    return sendSuccess(res, item, 'Item retrieved successfully');
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

export const updateItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const existingItem = await prisma.item.findUnique({
      where: { id }
    });

    if (!existingItem) {
      logger.warn('Update attempt for non-existent item', { itemId: id });
      return sendError(res, 'Item not found', 404);
    }

    if (existingItem.userId !== req.user.id) {
      logger.warn('Unauthorized item update attempt', { itemId: id, userId: req.user.id });
      return sendError(res, 'Unauthorized access', 403);
    }

    const updatedItem = await prisma.item.update({
      where: { id },
      data: { name, description }
    });

    logger.info('Item updated successfully', { itemId: id });
    return sendSuccess(res, updatedItem, 'Item updated successfully');
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

export const deleteItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingItem = await prisma.item.findUnique({
      where: { id }
    });

    if (!existingItem) {
      logger.warn('Delete attempt for non-existent item', { itemId: id });
      return sendError(res, 'Item not found', 404);
    }

    if (existingItem.userId !== req.user.id) {
      logger.warn('Unauthorized item deletion attempt', { itemId: id, userId: req.user.id });
      return sendError(res, 'Unauthorized access', 403);
    }

    await prisma.item.delete({
      where: { id }
    });

    logger.info('Item deleted successfully', { itemId: id });
    return sendSuccess(res, null, 'Item deleted successfully');
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
}; 