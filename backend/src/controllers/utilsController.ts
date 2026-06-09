import { Request, Response } from 'express';
import { User, Hospital } from '../models/index.js';
import { asyncHandler } from '../middleware/validate.js';
import { INDIAN_CITIES } from '../utils/cities.js';

export const searchCities = asyncHandler(async (req: Request, res: Response) => {
  const { q = '', limit = '10' } = req.query;
  const query = (q as string).trim().toLowerCase();
  const limitNum = Math.min(parseInt(limit as string, 10) || 10, 20);

  if (!query) {
    const popular = await Promise.all(
      INDIAN_CITIES.slice(0, 8).map(async (c) => {
        const [doctorCount, hospitalCount] = await Promise.all([
          User.countDocuments({
            userType: 'doctor',
            isActive: true,
            'profile.address.city': { $regex: new RegExp(`^${c.city}$`, 'i') },
          }),
          Hospital.countDocuments({ city: { $regex: new RegExp(`^${c.city}$`, 'i') }, isActive: true }),
        ]);
        return { city: c.city, state: c.state, doctorCount, hospitalCount };
      })
    );
    res.json({ success: true, data: popular });
    return;
  }

  const staticMatches = INDIAN_CITIES.filter(
    (c) =>
      c.city.toLowerCase().includes(query) ||
      c.state.toLowerCase().includes(query)
  );

  const [doctorCities, hospitalCities] = await Promise.all([
    User.aggregate([
      {
        $match: {
          userType: 'doctor',
          isActive: true,
          'profile.address.city': { $exists: true, $ne: '' },
        },
      },
      {
        $group: {
          _id: { city: '$profile.address.city', state: '$profile.address.state' },
          doctorCount: { $sum: 1 },
        },
      },
      {
        $match: {
          $or: [
            { '_id.city': { $regex: query, $options: 'i' } },
            { '_id.state': { $regex: query, $options: 'i' } },
          ],
        },
      },
    ]),
    Hospital.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: { city: '$city', state: '$state' },
          hospitalCount: { $sum: 1 },
        },
      },
      {
        $match: {
          $or: [
            { '_id.city': { $regex: query, $options: 'i' } },
            { '_id.state': { $regex: query, $options: 'i' } },
          ],
        },
      },
    ]),
  ]);

  const cityMap = new Map<string, { city: string; state: string; doctorCount: number; hospitalCount: number }>();

  for (const c of staticMatches) {
    const key = c.city.toLowerCase();
    cityMap.set(key, { city: c.city, state: c.state, doctorCount: 0, hospitalCount: 0 });
  }

  for (const d of doctorCities) {
    const city = d._id.city as string;
    const state = (d._id.state as string) || '';
    const key = city.toLowerCase();
    const existing = cityMap.get(key);
    if (existing) {
      existing.doctorCount = d.doctorCount;
      if (state) existing.state = state;
    } else {
      cityMap.set(key, { city, state, doctorCount: d.doctorCount, hospitalCount: 0 });
    }
  }

  for (const h of hospitalCities) {
    const city = h._id.city as string;
    const state = h._id.state as string;
    const key = city.toLowerCase();
    const existing = cityMap.get(key);
    if (existing) {
      existing.hospitalCount = h.hospitalCount;
    } else {
      cityMap.set(key, { city, state, doctorCount: 0, hospitalCount: h.hospitalCount });
    }
  }

  const results = Array.from(cityMap.values())
    .sort((a, b) => {
      const aMatch = a.city.toLowerCase().startsWith(query) ? 0 : 1;
      const bMatch = b.city.toLowerCase().startsWith(query) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return b.doctorCount + b.hospitalCount - (a.doctorCount + a.hospitalCount);
    })
    .slice(0, limitNum);

  for (const r of results) {
    if (r.doctorCount === 0) {
      r.doctorCount = await User.countDocuments({
        userType: 'doctor',
        isActive: true,
        'profile.address.city': { $regex: new RegExp(`^${r.city}$`, 'i') },
      });
    }
    if (r.hospitalCount === 0) {
      r.hospitalCount = await Hospital.countDocuments({
        city: { $regex: new RegExp(`^${r.city}$`, 'i') },
        isActive: true,
      });
    }
  }

  res.json({ success: true, data: results });
});

export const getCityDetails = asyncHandler(async (req: Request, res: Response) => {
  const city = decodeURIComponent(String(req.params.city));
  const [doctorCount, hospitalCount, hospitals] = await Promise.all([
    User.countDocuments({
      userType: 'doctor',
      isActive: true,
      'profile.address.city': { $regex: new RegExp(`^${city}$`, 'i') },
    }),
    Hospital.countDocuments({ city: { $regex: new RegExp(`^${city}$`, 'i') }, isActive: true }),
    Hospital.find({ city: { $regex: new RegExp(`^${city}$`, 'i') }, isActive: true })
      .sort({ rating: -1 })
      .limit(5)
      .select('name type rating emergencyAvailable specialties'),
  ]);

  const state =
    hospitals[0]?.state ||
    INDIAN_CITIES.find((c) => c.city.toLowerCase() === city.toLowerCase())?.state ||
    '';

  res.json({
    success: true,
    data: { city, state, doctorCount, hospitalCount, topHospitals: hospitals },
  });
});
