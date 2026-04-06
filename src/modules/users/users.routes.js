import express from 'express';
import * as usersController from './users.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import auditLog from '../../middlewares/auditLog.js';

const router = express.Router();

router.get('/profile', authenticate, usersController.getProfile);
router.put('/profile', authenticate, usersController.updateProfile);

router.get('/', authenticate, isAdmin, usersController.getAllUsers);
router.get('/:id', authenticate, isAdmin, usersController.getUserById);
router.patch('/:id/status', authenticate, isAdmin, auditLog('update_user_status', 'users'), usersController.updateUserStatus);
router.delete('/:id', authenticate, isAdmin, auditLog('delete_user', 'users'), usersController.deleteUser);

export default router;
