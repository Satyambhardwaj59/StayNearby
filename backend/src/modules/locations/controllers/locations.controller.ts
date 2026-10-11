import type { Request, Response } from 'express';
import { sendSuccess } from '../../../shared/response';
import { PropertyModel } from '../../properties/models/property.model';

/**
 * Location service using MongoDB aggregation on published properties.
 * In production this can be replaced with a dedicated location DB or
 * geocoding provider without touching the controller layer.
 */

export async function suggest(req: Request, res: Response): Promise<void> {
  const { q, limit = 8 } = req.query as { q: string; limit?: string };
  const regex = new RegExp(q, 'i');
  const lim = Math.min(Number(limit), 20);

  // Aggregate unique cities and localities from published listings
  const [cities, localities] = await Promise.all([
    PropertyModel.aggregate([
      { $match: { listingStatus: 'PUBLISHED', 'address.city': regex } },
      { $group: { _id: { city: '$address.city', citySlug: '$citySlug' } } },
      { $limit: Math.ceil(lim / 2) },
    ]),
    PropertyModel.aggregate([
      {
        $match: {
          listingStatus: 'PUBLISHED',
          $or: [{ 'address.locality': regex }, { 'address.landmark': regex }],
        },
      },
      {
        $group: {
          _id: {
            locality: '$address.locality',
            localitySlug: '$localitySlug',
            city: '$address.city',
            citySlug: '$citySlug',
            state: '$address.state',
          },
          count: { $sum: 1 },
          lat: { $first: { $arrayElemAt: ['$location.coordinates', 1] } },
          lng: { $first: { $arrayElemAt: ['$location.coordinates', 0] } },
        },
      },
      { $limit: lim },
    ]),
  ]);

  const results = [
    ...cities.map((c: { _id: { city: string; citySlug: string } }) => ({
      name: c._id.city,
      slug: c._id.citySlug,
      type: 'CITY',
      citySlug: c._id.citySlug,
      cityName: c._id.city,
      state: '',
      point: { latitude: 0, longitude: 0 },
      displayName: c._id.city,
    })),
    ...localities.map((l: {
      _id: { locality: string; localitySlug: string; city: string; citySlug: string; state: string };
      lat?: number;
      lng?: number;
    }) => ({
      name: l._id.locality,
      slug: l._id.localitySlug,
      type: 'LOCALITY',
      citySlug: l._id.citySlug,
      cityName: l._id.city,
      state: l._id.state,
      point: { latitude: l.lat ?? 0, longitude: l.lng ?? 0 },
      displayName: `${l._id.locality}, ${l._id.city}`,
    })),
  ].slice(0, lim);

  sendSuccess(res, results);
}

export async function listCities(req: Request, res: Response): Promise<void> {
  const cities = await PropertyModel.aggregate<{
    _id: { city: string; citySlug: string; state: string };
    count: number;
    minRent: number;
    avgRent: number;
    lat: number;
    lng: number;
  }>([
    { $match: { listingStatus: 'PUBLISHED' } },
    {
      $group: {
        _id: { city: '$address.city', citySlug: '$citySlug', state: '$address.state' },
        count: { $sum: 1 },
        minRent: { $min: '$rent' },
        avgRent: { $avg: '$rent' },
        lat: { $first: { $arrayElemAt: ['$location.coordinates', 1] } },
        lng: { $first: { $arrayElemAt: ['$location.coordinates', 0] } },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);

  const result = cities.map((c) => ({
    name: c._id.city,
    slug: c._id.citySlug,
    type: 'CITY',
    citySlug: c._id.citySlug,
    cityName: c._id.city,
    state: c._id.state,
    point: { latitude: c.lat ?? 0, longitude: c.lng ?? 0 },
    displayName: c._id.city,
    count: c.count,
    minRent: c.minRent,
    avgRent: Math.round(c.avgRent),
  }));

  sendSuccess(res, result);
}

export async function getCity(req: Request, res: Response): Promise<void> {
  const { city: citySlug } = req.params;

  const [cityAgg, localities] = await Promise.all([
    PropertyModel.aggregate<{
      _id: { city: string; citySlug: string; state: string };
      count: number;
    }>([
      { $match: { listingStatus: 'PUBLISHED', citySlug } },
      { $group: { _id: { city: '$address.city', citySlug: '$citySlug', state: '$address.state' }, count: { $sum: 1 } } },
      { $limit: 1 },
    ]),
    PropertyModel.aggregate<{
      _id: { locality: string; localitySlug: string };
      count: number;
      minRent: number;
      maxRent: number;
      avgRent: number;
    }>([
      { $match: { listingStatus: 'PUBLISHED', citySlug } },
      {
        $group: {
          _id: { locality: '$address.locality', localitySlug: '$localitySlug' },
          count: { $sum: 1 },
          minRent: { $min: '$rent' },
          maxRent: { $max: '$rent' },
          avgRent: { $avg: '$rent' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]),
  ]);

  const cityInfo = cityAgg[0];
  const city = cityInfo
    ? {
        name: cityInfo._id.city,
        slug: cityInfo._id.citySlug,
        type: 'CITY' as const,
        citySlug: cityInfo._id.citySlug,
        cityName: cityInfo._id.city,
        state: cityInfo._id.state,
        point: { latitude: 0, longitude: 0 },
        displayName: cityInfo._id.city,
      }
    : null;

  const localityList = localities.map((l) => ({
    name: l._id.locality,
    slug: l._id.localitySlug,
    type: 'LOCALITY' as const,
    citySlug,
    cityName: cityInfo?._id.city ?? '',
    state: cityInfo?._id.state ?? '',
    point: { latitude: 0, longitude: 0 },
    displayName: `${l._id.locality}, ${cityInfo?._id.city ?? ''}`,
    count: l.count,
    minRent: l.minRent,
    maxRent: l.maxRent,
    avgRent: Math.round(l.avgRent),
  }));

  sendSuccess(res, { city, localities: localityList });
}

export async function nearbyPlaces(req: Request, res: Response): Promise<void> {
  const { latitude, longitude, radiusMeters = '5000', limit = '10' } = req.query as Record<
    string,
    string
  >;

  // Find localities near the given point
  const results = await PropertyModel.aggregate([
    {
      $match: {
        listingStatus: 'PUBLISHED',
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
            $maxDistance: Number(radiusMeters),
          },
        },
      },
    },
    { $limit: Number(limit) * 3 },
    {
      $group: {
        _id: { locality: '$address.locality', localitySlug: '$localitySlug' },
        count: { $sum: 1 },
        lat: { $first: { $arrayElemAt: ['$location.coordinates', 1] } },
        lng: { $first: { $arrayElemAt: ['$location.coordinates', 0] } },
      },
    },
    { $limit: Number(limit) },
  ]);

  const places = results.map((r: {
    _id: { locality: string; localitySlug: string };
    lat: number;
    lng: number;
  }) => {
    const dlat = (r.lat - Number(latitude)) * 111320;
    const dlng =
      (r.lng - Number(longitude)) * 111320 * Math.cos((Number(latitude) * Math.PI) / 180);
    const distanceMeters = Math.round(Math.sqrt(dlat * dlat + dlng * dlng));
    const distanceLabel =
      distanceMeters < 1000
        ? `${distanceMeters}m`
        : `${(distanceMeters / 1000).toFixed(1)}km`;
    return {
      name: r._id.locality,
      slug: r._id.localitySlug,
      type: 'LOCALITY',
      distanceMeters,
      distanceLabel,
    };
  });

  sendSuccess(res, places);
}
