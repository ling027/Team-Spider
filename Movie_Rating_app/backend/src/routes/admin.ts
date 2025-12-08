import express, { Request, Response } from 'express';
import { User } from '../models/User.js';
import { MovieComment } from '../models/MovieComment.js';
import { DiscussionThread } from '../models/DiscussionThread.js';
import { Watchlist } from '../models/Watchlist.js';
import { UserActivity } from '../models/UserActivity.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require admin authentication
router.use(adminMiddleware);

// Get dashboard statistics
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments({ isDeleted: { $ne: true } });
    const totalComments = await MovieComment.countDocuments({ isDeleted: { $ne: true } });
    const totalDiscussions = await DiscussionThread.countDocuments({ isDeleted: { $ne: true } });
    const totalWatchlists = await Watchlist.countDocuments({ isDeleted: { $ne: true } });
    const deletedItems = await User.countDocuments({ isDeleted: true }) +
      await MovieComment.countDocuments({ isDeleted: true }) +
      await DiscussionThread.countDocuments({ isDeleted: true }) +
      await Watchlist.countDocuments({ isDeleted: true });

    res.json({
      status: 'success',
      data: {
        stats: {
          totalUsers,
          totalComments,
          totalDiscussions,
          totalWatchlists,
          deletedItems
        }
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get statistics'
    });
  }
});

// Get all users with filtering
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { search, startDate, endDate, includeDeleted, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    
    if (includeDeleted !== 'true') {
      query.isDeleted = { $ne: true };
    }

    if (search) {
      query.$or = [
        { username: { $regex: search as string, $options: 'i' } },
        { email: { $regex: search as string, $options: 'i' } },
        { fullname: { $regex: search as string, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    const total = await User.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        users: users.map(user => ({
          id: user._id,
          username: user.username,
          email: user.email,
          fullname: user.fullname,
          isAdmin: user.isAdmin,
          isDeleted: user.isDeleted,
          deletedAt: user.deletedAt,
          createdAt: user.createdAt
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get users'
    });
  }
});

// Soft delete user
router.delete('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete user'
    });
  }
});

// Restore user
router.post('/users/:id/restore', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'User restored successfully'
    });
  } catch (error) {
    console.error('Restore user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to restore user'
    });
  }
});

// Get all comments with filtering
router.get('/comments', async (req: Request, res: Response) => {
  try {
    const { search, userId, movieId, startDate, endDate, includeDeleted, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    
    if (includeDeleted !== 'true') {
      query.isDeleted = { $ne: true };
    }

    if (userId) {
      query.userId = userId;
    }

    if (movieId) {
      query.movieTmdbId = parseInt(movieId as string);
    }

    if (search) {
      query.text = { $regex: search as string, $options: 'i' };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const comments = await MovieComment.find(query)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    const total = await MovieComment.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        comments: comments.map(comment => ({
          id: comment._id,
          userId: comment.userId,
          username: (comment.userId as any)?.username || 'Unknown',
          email: (comment.userId as any)?.email || '',
          movieTmdbId: comment.movieTmdbId,
          text: comment.text,
          rating: comment.rating || null,
          replies: comment.replies || [],
          isDeleted: comment.isDeleted,
          deletedAt: comment.deletedAt,
          createdAt: comment.createdAt
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get comments'
    });
  }
});

// Soft delete comment
router.delete('/comments/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const commentId = req.params.id;

    const comment = await MovieComment.findByIdAndUpdate(
      commentId,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!comment) {
      res.status(404).json({
        status: 'error',
        message: 'Comment not found'
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete comment'
    });
  }
});

// Restore comment
router.post('/comments/:id/restore', async (req: Request, res: Response): Promise<void> => {
  try {
    const commentId = req.params.id;

    const comment = await MovieComment.findByIdAndUpdate(
      commentId,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );

    if (!comment) {
      res.status(404).json({
        status: 'error',
        message: 'Comment not found'
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Comment restored successfully'
    });
  } catch (error) {
    console.error('Restore comment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to restore comment'
    });
  }
});

// Delete a specific reply from a comment
router.delete('/comments/:id/replies/:replyId', async (req: Request, res: Response): Promise<void> => {
  try {
    const commentId = req.params.id;
    const replyId = req.params.replyId;

    const comment = await MovieComment.findById(commentId);

    if (!comment) {
      res.status(404).json({
        status: 'error',
        message: 'Comment not found'
      });
      return;
    }

    const initialLength = comment.replies.length;
    comment.replies = comment.replies.filter(
      (reply: any) => reply._id?.toString() !== replyId
    );

    if (comment.replies.length === initialLength) {
      res.status(404).json({
        status: 'error',
        message: 'Reply not found'
      });
      return;
    }

    await comment.save();

    res.json({
      status: 'success',
      message: 'Reply deleted successfully'
    });
  } catch (error) {
    console.error('Delete reply error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete reply'
    });
  }
});

// Get all discussions with filtering
router.get('/discussions', async (req: Request, res: Response) => {
  try {
    const { search, userId, movieId, startDate, endDate, includeDeleted, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    
    if (includeDeleted !== 'true') {
      query.isDeleted = { $ne: true };
    }

    if (userId) {
      query.userId = userId;
    }

    if (movieId) {
      query.movieTmdbId = parseInt(movieId as string);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { content: { $regex: search as string, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const discussions = await DiscussionThread.find(query)
      .populate('userId', 'username')
      .sort({ lastActivity: -1 })
      .limit(limitNum)
      .skip(skip);

    const total = await DiscussionThread.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        discussions: discussions.map(thread => ({
          id: thread._id,
          title: thread.title,
          movie: thread.movieTitle,
          movieTmdbId: thread.movieTmdbId,
          author: (thread.userId as any)?.username || 'Unknown',
          content: thread.content,
          tags: thread.tags,
          replies: thread.replies.length,
          views: thread.views,
          isDeleted: thread.isDeleted,
          deletedAt: thread.deletedAt,
          lastActivity: thread.lastActivity,
          createdAt: thread.createdAt
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get discussions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get discussions'
    });
  }
});

// Soft delete discussion
router.delete('/discussions/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const discussionId = req.params.id;

    const discussion = await DiscussionThread.findByIdAndUpdate(
      discussionId,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!discussion) {
      res.status(404).json({
        status: 'error',
        message: 'Discussion not found'
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Discussion deleted successfully'
    });
  } catch (error) {
    console.error('Delete discussion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete discussion'
    });
  }
});

// Restore discussion
router.post('/discussions/:id/restore', async (req: Request, res: Response): Promise<void> => {
  try {
    const discussionId = req.params.id;

    const discussion = await DiscussionThread.findByIdAndUpdate(
      discussionId,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );

    if (!discussion) {
      res.status(404).json({
        status: 'error',
        message: 'Discussion not found'
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Discussion restored successfully'
    });
  } catch (error) {
    console.error('Restore discussion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to restore discussion'
    });
  }
});

// Get specific discussion with replies (admin view)
router.get('/discussions/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const discussionId = req.params.id;

    const discussion = await DiscussionThread.findById(discussionId)
      .populate('userId', 'username email')
      .populate('replies.userId', 'username email');

    if (!discussion) {
      res.status(404).json({
        status: 'error',
        message: 'Discussion not found'
      });
      return;
    }

    res.json({
      status: 'success',
      data: {
        thread: {
          id: discussion._id,
          title: discussion.title,
          movie: discussion.movieTitle,
          movieTmdbId: discussion.movieTmdbId,
          author: (discussion.userId as any)?.username || 'Unknown',
          authorEmail: (discussion.userId as any)?.email || '',
          content: discussion.content,
          tags: discussion.tags,
          replies: discussion.replies.map(reply => ({
            id: (reply as any)._id,
            userId: reply.userId,
            author: reply.author,
            content: reply.content,
            timestamp: reply.timestamp
          })),
          views: discussion.views,
          isDeleted: discussion.isDeleted,
          deletedAt: discussion.deletedAt,
          lastActivity: discussion.lastActivity,
          createdAt: discussion.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get discussion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get discussion'
    });
  }
});

// Delete a specific reply from a discussion
router.delete('/discussions/:id/replies/:replyId', async (req: Request, res: Response): Promise<void> => {
  try {
    const discussionId = req.params.id;
    const replyId = req.params.replyId;

    const discussion = await DiscussionThread.findById(discussionId);

    if (!discussion) {
      res.status(404).json({
        status: 'error',
        message: 'Discussion not found'
      });
      return;
    }

    const initialLength = discussion.replies.length;
    discussion.replies = discussion.replies.filter(
      (reply: any) => reply._id?.toString() !== replyId
    );

    if (discussion.replies.length === initialLength) {
      res.status(404).json({
        status: 'error',
        message: 'Reply not found'
      });
      return;
    }

    discussion.lastActivity = new Date();
    await discussion.save();

    res.json({
      status: 'success',
      message: 'Reply deleted successfully'
    });
  } catch (error) {
    console.error('Delete reply error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete reply'
    });
  }
});

// Get user details with activity
router.get('/users/:id/details', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
      return;
    }

    // Get user statistics
    const watchlists = await Watchlist.find({ 
      userId,
      isDeleted: { $ne: true }
    });
    
    const totalComments = await MovieComment.countDocuments({ 
      userId,
      isDeleted: { $ne: true }
    });

    const totalDiscussions = await DiscussionThread.countDocuments({ 
      userId,
      isDeleted: { $ne: true }
    });

    // Get user's comments
    const comments = await MovieComment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100);

    // Get user's discussions
    const discussions = await DiscussionThread.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100);

    // Get all discussion threads that contain replies from this user
    const allThreads = await DiscussionThread.find()
      .sort({ createdAt: -1 })
      .limit(500); // Get more threads to find user's replies

    const userReplies: any[] = [];
    allThreads.forEach(thread => {
      thread.replies.forEach((reply: any) => {
        if (reply.userId && reply.userId.toString() === userId) {
          userReplies.push({
            id: reply._id,
            threadId: thread._id,
            threadTitle: thread.title,
            threadMovie: thread.movieTitle,
            threadMovieId: thread.movieTmdbId,
            content: reply.content,
            timestamp: reply.timestamp,
            threadIsDeleted: thread.isDeleted
          });
        }
      });
    });

    // Sort replies by timestamp (newest first) and limit
    userReplies.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedReplies = userReplies.slice(0, 100);

    // Get recent activity
    const activities = await UserActivity.find({ userId })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullname: user.fullname,
          isAdmin: user.isAdmin,
          isDeleted: user.isDeleted,
          deletedAt: user.deletedAt,
          createdAt: user.createdAt
        },
        stats: {
          totalWatchlists: watchlists.length,
          totalComments,
          totalDiscussions
        },
        watchlists: watchlists.map(watchlist => ({
          id: watchlist._id,
          name: watchlist.name,
          movies: watchlist.movies,
          movieCount: watchlist.movies.length,
          isDeleted: watchlist.isDeleted,
          deletedAt: watchlist.deletedAt,
          createdAt: watchlist.createdAt,
          updatedAt: watchlist.updatedAt
        })),
        comments: comments.map(comment => ({
          id: comment._id,
          movieTmdbId: comment.movieTmdbId,
          text: comment.text,
          rating: comment.rating || null,
          replies: comment.replies || [],
          isDeleted: comment.isDeleted,
          deletedAt: comment.deletedAt,
          createdAt: comment.createdAt
        })),
        discussions: discussions.map(discussion => ({
          id: discussion._id,
          title: discussion.title,
          movieTitle: discussion.movieTitle,
          movieTmdbId: discussion.movieTmdbId,
          content: discussion.content,
          tags: discussion.tags,
          replies: discussion.replies.length,
          views: discussion.views,
          isDeleted: discussion.isDeleted,
          deletedAt: discussion.deletedAt,
          createdAt: discussion.createdAt
        })),
        replies: limitedReplies,
        activities: activities.map(activity => ({
          id: activity._id,
          activityType: activity.activityType,
          movieId: activity.movieId,
          timestamp: activity.timestamp
        }))
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user details'
    });
  }
});

// Get all watchlists with filtering
router.get('/watchlists', async (req: Request, res: Response) => {
  try {
    const { search, userId, startDate, endDate, includeDeleted, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    
    if (includeDeleted !== 'true') {
      query.isDeleted = { $ne: true };
    }

    if (userId) {
      query.userId = userId;
    }

    if (search) {
      query.name = { $regex: search as string, $options: 'i' };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const watchlists = await Watchlist.find(query)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    const total = await Watchlist.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        watchlists: watchlists.map(watchlist => ({
          id: watchlist._id,
          userId: watchlist.userId,
          username: (watchlist.userId as any)?.username || 'Unknown',
          email: (watchlist.userId as any)?.email || '',
          name: watchlist.name,
          movies: watchlist.movies,
          movieCount: watchlist.movies.length,
          isDeleted: watchlist.isDeleted,
          deletedAt: watchlist.deletedAt,
          createdAt: watchlist.createdAt,
          updatedAt: watchlist.updatedAt
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get watchlists error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get watchlists'
    });
  }
});

// Soft delete watchlist
router.delete('/watchlists/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const watchlistId = req.params.id;

    const watchlist = await Watchlist.findByIdAndUpdate(
      watchlistId,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!watchlist) {
      res.status(404).json({
        status: 'error',
        message: 'Watchlist not found'
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Watchlist deleted successfully'
    });
  } catch (error) {
    console.error('Delete watchlist error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete watchlist'
    });
  }
});

// Restore watchlist
router.post('/watchlists/:id/restore', async (req: Request, res: Response): Promise<void> => {
  try {
    const watchlistId = req.params.id;

    const watchlist = await Watchlist.findByIdAndUpdate(
      watchlistId,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );

    if (!watchlist) {
      res.status(404).json({
        status: 'error',
        message: 'Watchlist not found'
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Watchlist restored successfully'
    });
  } catch (error) {
    console.error('Restore watchlist error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to restore watchlist'
    });
  }
});

// Remove movie from watchlist (admin only)
router.delete('/watchlists/:id/movies/:movieId', async (req: Request, res: Response): Promise<void> => {
  try {
    const watchlistId = req.params.id;
    const movieTmdbId = parseInt(req.params.movieId);

    if (isNaN(movieTmdbId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid movie ID'
      });
      return;
    }

    const watchlist = await Watchlist.findById(watchlistId);

    if (!watchlist) {
      res.status(404).json({
        status: 'error',
        message: 'Watchlist not found'
      });
      return;
    }

    const initialLength = watchlist.movies.length;
    watchlist.movies = watchlist.movies.filter(m => m.tmdbId !== movieTmdbId);

    if (watchlist.movies.length === initialLength) {
      res.status(404).json({
        status: 'error',
        message: 'Movie not found in watchlist'
      });
      return;
    }

    await watchlist.save();

    // Track activity for the watchlist owner
    try {
      await UserActivity.create({
        userId: watchlist.userId,
        activityType: 'watchlist_remove',
        movieId: movieTmdbId
      });
    } catch (activityError) {
      console.error('Failed to track activity:', activityError);
      // Don't fail the request if activity tracking fails
    }

    res.json({
      status: 'success',
      message: 'Movie removed from watchlist successfully',
      data: {
        watchlist: {
          id: watchlist._id,
          name: watchlist.name,
          movies: watchlist.movies,
          movieCount: watchlist.movies.length
        }
      }
    });
  } catch (error) {
    console.error('Remove movie from watchlist error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove movie from watchlist'
    });
  }
});

// Get activity logs with filtering
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const { userId, movieId, type, startDate, endDate, page = '1', limit = '100' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (userId) {
      query.userId = userId;
    }

    if (movieId) {
      query.movieId = parseInt(movieId as string);
    }

    if (type) {
      query.activityType = type;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }

    const activities = await UserActivity.find(query)
      .populate('userId', 'username')
      .sort({ timestamp: -1 })
      .limit(limitNum)
      .skip(skip);

    const total = await UserActivity.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        activities: activities.map(activity => ({
          id: activity._id,
          userId: activity.userId,
          username: (activity.userId as any)?.username || 'Unknown',
          activityType: activity.activityType,
          movieId: activity.movieId,
          timestamp: activity.timestamp
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get activity logs'
    });
  }
});

// Get unified trash view (all soft-deleted items)
router.get('/trash', async (req: Request, res: Response) => {
  try {
    const { type, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const trashItems: any[] = [];

    // Get deleted users
    if (!type || type === 'user') {
      const users = await User.find({ isDeleted: true })
        .select('-password')
        .sort({ deletedAt: -1 })
        .limit(limitNum)
        .skip(skip);
      
      users.forEach(user => {
        trashItems.push({
          id: user._id,
          type: 'user',
          title: user.username,
          content: user.email,
          deletedAt: user.deletedAt,
          createdAt: user.createdAt
        });
      });
    }

    // Get deleted comments
    if (!type || type === 'comment') {
      const comments = await MovieComment.find({ isDeleted: true })
        .populate('userId', 'username')
        .sort({ deletedAt: -1 })
        .limit(limitNum)
        .skip(skip);
      
      comments.forEach(comment => {
        trashItems.push({
          id: comment._id,
          type: 'comment',
          title: `Comment by ${(comment.userId as any)?.username || 'Unknown'}`,
          content: comment.text.substring(0, 100),
          movieId: comment.movieTmdbId,
          deletedAt: comment.deletedAt,
          createdAt: comment.createdAt
        });
      });
    }

    // Get deleted discussions
    if (!type || type === 'discussion') {
      const discussions = await DiscussionThread.find({ isDeleted: true })
        .populate('userId', 'username')
        .sort({ deletedAt: -1 })
        .limit(limitNum)
        .skip(skip);
      
      discussions.forEach(discussion => {
        trashItems.push({
          id: discussion._id,
          type: 'discussion',
          title: discussion.title,
          content: discussion.content.substring(0, 100),
          movieId: discussion.movieTmdbId,
          deletedAt: discussion.deletedAt,
          createdAt: discussion.createdAt
        });
      });
    }

    // Get deleted watchlists
    if (!type || type === 'watchlist') {
      const watchlists = await Watchlist.find({ isDeleted: true })
        .populate('userId', 'username')
        .sort({ deletedAt: -1 })
        .limit(limitNum)
        .skip(skip);
      
      watchlists.forEach(watchlist => {
        trashItems.push({
          id: watchlist._id,
          type: 'watchlist',
          title: watchlist.name,
          content: `${watchlist.movies.length} movies`,
          deletedAt: watchlist.deletedAt,
          createdAt: watchlist.createdAt
        });
      });
    }

    // Sort by deletedAt
    trashItems.sort((a, b) => {
      const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
      const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
      return dateB - dateA;
    });

    res.json({
      status: 'success',
      data: {
        trash: trashItems.slice(0, limitNum),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: trashItems.length,
          pages: Math.ceil(trashItems.length / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get trash error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get trash items'
    });
  }
});

export default router;

