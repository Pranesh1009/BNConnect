import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createItem = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const item = await prisma.item.create({
      data: {
        name,
        description,
        userId: req.user.id
      }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getItems = async (req: Request, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      where: { userId: req.user.id }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await prisma.item.findUnique({
      where: { id }
    });

    if (!item || item.userId !== req.user.id) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const existingItem = await prisma.item.findUnique({
      where: { id }
    });

    if (!existingItem || existingItem.userId !== req.user.id) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const item = await prisma.item.update({
      where: { id },
      data: { name, description }
    });

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existingItem = await prisma.item.findUnique({
      where: { id }
    });

    if (!existingItem || existingItem.userId !== req.user.id) {
      return res.status(404).json({ message: 'Item not found' });
    }

    await prisma.item.delete({
      where: { id }
    });

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}; 