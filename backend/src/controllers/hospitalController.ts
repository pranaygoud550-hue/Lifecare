import { Request, Response } from 'express';
import { Hospital } from '../models/index.js';
import { asyncHandler } from '../middleware/validate.js';

export const getHospitals = asyncHandler(async (req: Request, res: Response) => {
  const { city, search, specialty, type, page = '1', limit = '12' } = req.query;

  const filter: Record<string, unknown> = { isActive: true };

  if (city) {
    filter.city = { $regex: city as string, $options: 'i' };
  }

  if (type) filter.type = type;

  if (specialty) filter.specialties = specialty;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { address: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  const [hospitals, total] = await Promise.all([
    Hospital.find(filter)
      .sort({ rating: -1, reviewCount: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Hospital.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      hospitals,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    },
  });
});

export const getHospitalById = asyncHandler(async (req: Request, res: Response) => {
  const hospital = await Hospital.findById(req.params.id);
  if (!hospital || !hospital.isActive) {
    res.status(404).json({ success: false, message: 'Hospital not found' });
    return;
  }
  res.json({ success: true, data: hospital });
});

export const searchHospitalsByCity = asyncHandler(async (req: Request, res: Response) => {
  const { q = '', limit = '8' } = req.query;
  const city = decodeURIComponent(String(req.params.city));
  const query = (q as string).trim();
  const limitNum = Math.min(parseInt(limit as string, 10) || 8, 20);

  const filter: Record<string, unknown> = {
    isActive: true,
    city: { $regex: new RegExp(`^${city}$`, 'i') },
  };

  if (query) {
    filter.$or = [
      { name: { $regex: query, $options: 'i' } },
      { specialties: { $regex: query, $options: 'i' } },
      { address: { $regex: query, $options: 'i' } },
    ];
  }

  const hospitals = await Hospital.find(filter)
    .sort({ rating: -1 })
    .limit(limitNum);

  res.json({ success: true, data: { city, hospitals, total: hospitals.length } });
});
