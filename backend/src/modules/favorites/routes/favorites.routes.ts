import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../../middleware/authenticate';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import * as controller from '../controllers/favorites.controller';

export const favoritesRouter = Router();

// Public: answers `isFavorited: false` for anonymous callers instead of 401.
favoritesRouter.get('/check/:propertyId', optionalAuthenticate, asyncHandler(controller.checkFavorite));

// Authenticated: the user's own saved properties.
favoritesRouter.get('/', authenticate, asyncHandler(controller.listFavorites));
favoritesRouter.post('/:propertyId', authenticate, asyncHandler(controller.addFavorite));
favoritesRouter.delete('/:propertyId', authenticate, asyncHandler(controller.removeFavorite));
