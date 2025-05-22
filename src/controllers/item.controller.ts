import { Request, Response } from 'express';
import { PrismaClient, User } from '@prisma/client';
import logger from '../utils/logger';
import { handlePrismaError } from '../utils/prisma-error';

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
    res.status(201).json(item);
  } catch (error) {
    const prismaError = handlePrismaError(error);
    res.status(prismaError.statusCode).json({ message: prismaError.message });
  }
};

export const getItems = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      where: { userId: req.user.id }
    });
    res.json(items);
  } catch (error) {
    const prismaError = handlePrismaError(error);
    res.status(prismaError.statusCode).json({ message: prismaError.message });
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
      return res.status(404).json({ message: 'Item not found' });
    }

    if (item.userId !== req.user.id) {
      logger.warn('Unauthorized item access attempt', { itemId: id, userId: req.user.id });
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    res.json(item);
  } catch (error) {
    const prismaError = handlePrismaError(error);
    res.status(prismaError.statusCode).json({ message: prismaError.message });
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
      return res.status(404).json({ message: 'Item not found' });
    }

    if (existingItem.userId !== req.user.id) {
      logger.warn('Unauthorized item update attempt', { itemId: id, userId: req.user.id });
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const updatedItem = await prisma.item.update({
      where: { id },
      data: { name, description }
    });

    logger.info('Item updated successfully', { itemId: id });
    res.json(updatedItem);
  } catch (error) {
    const prismaError = handlePrismaError(error);
    res.status(prismaError.statusCode).json({ message: prismaError.message });
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
      return res.status(404).json({ message: 'Item not found' });
    }

    if (existingItem.userId !== req.user.id) {
      logger.warn('Unauthorized item deletion attempt', { itemId: id, userId: req.user.id });
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    await prisma.item.delete({
      where: { id }
    });

    logger.info('Item deleted successfully', { itemId: id });
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    const prismaError = handlePrismaError(error);
    res.status(prismaError.statusCode).json({ message: prismaError.message });
  }
}; 