import express from 'express';
import { AuthRoutes } from '../modules/Auth/auth.routes';
import { CategoryRoutes } from '../modules/Category/category.routes';
import { BlogRoutes } from '../modules/Blog/blog.routes';
import { ContactRoutes } from '../modules/contact/contact.routes';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/category',
    route: CategoryRoutes,
  },
  {
    path: '/blog',
    route: BlogRoutes,
  },
  {
    path: '/contact',
    route: ContactRoutes,
  },
];
moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
