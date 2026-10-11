import type { Request, Response } from 'express';
import { sendSuccess } from '../../../shared/response';
import { searchService } from '../services/search.service';
import type { SearchQuery } from '../schemas/search.schema';

export async function search(req: Request, res: Response): Promise<Response> {
  const query = req.query as unknown as SearchQuery;
  const result = await searchService.search(query, req.user?.userId);
  return sendSuccess(res, result.items, {
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      hasNextPage: result.page < result.totalPages,
      hasPreviousPage: result.page > 1,
    },
  });
}

export async function mapSearch(req: Request, res: Response): Promise<Response> {
  const { swLat, swLng, neLat, neLng, limit, city } = req.query as {
    swLat?: string;
    swLng?: string;
    neLat?: string;
    neLng?: string;
    limit?: string;
    city?: string;
  };

  const results = await searchService.mapSearch({
    swLat: swLat ? parseFloat(swLat) : undefined,
    swLng: swLng ? parseFloat(swLng) : undefined,
    neLat: neLat ? parseFloat(neLat) : undefined,
    neLng: neLng ? parseFloat(neLng) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
    city,
  });

  return sendSuccess(res, results);
}
