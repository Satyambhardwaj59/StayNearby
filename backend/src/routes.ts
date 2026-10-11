import { Router } from 'express';
import { authRouter } from './modules/auth/routes/auth.routes';
import { usersRouter } from './modules/users/routes/users.routes';
import { propertiesRouter } from './modules/properties/routes/properties.routes';
import { searchRouter } from './modules/property-search/routes/search.routes';
import { locationsRouter } from './modules/locations/routes/locations.routes';
import { favoritesRouter } from './modules/favorites/routes/favorites.routes';
import { savedSearchesRouter } from './modules/saved-searches/routes/saved-searches.routes';
import { conversationsRouter } from './modules/conversations/routes/conversations.routes';
import { messagesRouter } from './modules/messages/routes/messages.routes';
import { visitsRouter } from './modules/visits/routes/visits.routes';
import { reviewsRouter } from './modules/reviews/routes/reviews.routes';
import { notificationsRouter } from './modules/notifications/routes/notifications.routes';
import { reportsRouter } from './modules/reports/routes/reports.routes';
import { adminRouter } from './modules/admin/routes/admin.routes';

/**
 * Versioned API surface. Every feature owns its own router; this file only
 * composes them so the URL structure stays visible in one place.
 */
export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/properties', propertiesRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/locations', locationsRouter);
apiRouter.use('/favorites', favoritesRouter);
apiRouter.use('/saved-searches', savedSearchesRouter);
apiRouter.use('/conversations', conversationsRouter);
apiRouter.use('/messages', messagesRouter);
apiRouter.use('/visits', visitsRouter);
apiRouter.use('/reviews', reviewsRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/admin', adminRouter);

