import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { sendSuccess, sendError } from '../utils/response.util';

const prisma = new PrismaClient();

export const createProfile = async (req: Request, res: Response) => {
  try {
    const {
      bio,
      avatar,
      phoneNumber,
      email,
      industry,
      tier,
      company,
      address1,
      address2,
      city,
      state,
      zip,
      country,
      website,
      remarks
    } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    // Check if profile already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (existingProfile) {
      return sendError(res, 'Profile already exists', 400);
    }

    const profile = await prisma.profile.create({
      data: {
        bio,
        avatar,
        phoneNumber,
        email,
        industry,
        tier,
        company,
        address1,
        address2,
        city,
        state,
        zip,
        country,
        website,
        remarks,
        userId
      }
    });

    return sendSuccess(res, profile, 'Profile created successfully', 201);
  } catch (error) {
    logger.error('Error creating profile:', error);
    return sendError(res, 'Error creating profile');
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!profile) {
      return sendError(res, 'Profile not found', 404);
    }

    return sendSuccess(res, profile, 'Profile retrieved successfully');
  } catch (error) {
    logger.error('Error fetching profile:', error);
    return sendError(res, 'Error fetching profile');
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const {
      bio,
      avatar,
      phoneNumber,
      email,
      industry,
      tier,
      company,
      address1,
      address2,
      city,
      state,
      zip,
      country,
      website,
      remarks
    } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const profile = await prisma.profile.update({
      where: { userId },
      data: {
        bio,
        avatar,
        phoneNumber,
        email,
        industry,
        tier,
        company,
        address1,
        address2,
        city,
        state,
        zip,
        country,
        website,
        remarks
      }
    });

    return sendSuccess(res, profile, 'Profile updated successfully');
  } catch (error) {
    logger.error('Error updating profile:', error);
    return sendError(res, 'Error updating profile');
  }
};

export const deleteProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    await prisma.profile.delete({
      where: { userId }
    });

    return sendSuccess(res, null, 'Profile deleted successfully', 204);
  } catch (error) {
    logger.error('Error deleting profile:', error);
    return sendError(res, 'Error deleting profile');
  }
}; 