import express from 'express';
import Notification from '../../shared/models/Notification.model.js';
import { authenticate } from '../../middlewares/authenticate.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';

const router = express.Router();

const getMyNotifications = asyncHandler(async (req, res) => {
  const { page, perPage, skip } = parsePaginationQuery(req.query);
  const filter = { userId: req.user.id, isDeleted: false };
  if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user.id, isRead: false, isDeleted: false }),
  ]);

  ApiResponse.paginated(res, 'Notifications fetched', notifications, { ...buildPaginationMeta(page, perPage, total), unreadCount });
});

const markRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isRead: true, readAt: new Date() });
  ApiResponse.success(res, 'Notification marked as read');
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true, readAt: new Date() });
  ApiResponse.success(res, 'All notifications marked as read');
});

const unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user.id, isRead: false, isDeleted: false });
  ApiResponse.success(res, 'Unread notification count fetched', { unreadCount: count });
});

const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true });
  ApiResponse.noContent(res);
});

router.get('/', authenticate, getMyNotifications);
router.get('/unread-count', authenticate, unreadCount);
router.patch('/:id/read', authenticate, markRead);
router.patch('/read-all', authenticate, markAllRead);
router.delete('/:id', authenticate, deleteNotification);

export default router;
