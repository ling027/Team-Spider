import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { DiscussionThread, IDiscussionReply } from '../models/DiscussionThread.js';
import { User } from '../models/User.js';
import { UserActivity } from '../models/UserActivity.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get all discussion threads
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const threads = await DiscussionThread.find({ 
      isDeleted: { $ne: true }
    })
      .populate('userId', 'username')
      .sort({ lastActivity: -1 });

    res.json({
      status: 'success',
      data: {
        threads: threads.map(thread => ({
          id: thread._id,
          title: thread.title,
          movie: thread.movieTitle,
          movieTmdbId: thread.movieTmdbId,
          author: (thread.userId as any)?.username || 'Unknown',
          replies: thread.replies.length,
          views: thread.views,
          lastActivity: thread.lastActivity,
          tags: thread.tags,
          content: thread.content,
          createdAt: thread.createdAt
        }))
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

// Get specific thread with replies
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const threadId = req.params.id;

    const thread = await DiscussionThread.findOne({
      _id: threadId,
      isDeleted: { $ne: true }
    })
      .populate('userId', 'username')
      .populate('replies.userId', 'username');

    if (!thread) {
      res.status(404).json({
        status: 'error',
        message: 'Thread not found'
      });
      return;
    }

    // Increment view count
    thread.views += 1;
    await thread.save();

    res.json({
      status: 'success',
      data: {
        thread: {
          id: thread._id,
          title: thread.title,
          movie: thread.movieTitle,
          movieTmdbId: thread.movieTmdbId,
          author: (thread.userId as any)?.username || 'Unknown',
          content: thread.content,
          tags: thread.tags,
          replies: thread.replies.map(reply => ({
            id: (reply as any)._id,
            author: reply.author,
            content: reply.content,
            timestamp: reply.timestamp
          })),
          views: thread.views,
          lastActivity: thread.lastActivity,
          createdAt: thread.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get thread'
    });
  }
});

// Create new thread (requires authentication)
router.post(
  '/',
  authMiddleware,
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Thread title is required')
      .isLength({ max: 200 })
      .withMessage('Title cannot exceed 200 characters'),
    body('movieTitle')
      .trim()
      .notEmpty()
      .withMessage('Movie title is required'),
    body('movieTmdbId')
      .isInt()
      .withMessage('Movie TMDB ID must be a number'),
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Thread content is required')
      .isLength({ max: 1000 })
      .withMessage('Content cannot exceed 1000 characters'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const userId = req.userId!;
      const { title, movieTitle, movieTmdbId, content, tags } = req.body;

      // Get user for author name
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
        return;
      }

      const thread = new DiscussionThread({
        userId: new mongoose.Types.ObjectId(userId),
        title: title.trim(),
        movieTitle: movieTitle.trim(),
        movieTmdbId: parseInt(movieTmdbId),
        content: content.trim(),
        tags: Array.isArray(tags) ? tags.map((tag: string) => tag.trim()).filter((tag: string) => tag) : [],
        replies: [],
        views: 0,
        lastActivity: new Date()
      });

      await thread.save();

      // Track activity
      try {
        await UserActivity.create({
          userId: new mongoose.Types.ObjectId(userId),
          activityType: 'discussion',
          movieId: parseInt(movieTmdbId)
        });
      } catch (activityError) {
        console.error('Failed to track activity:', activityError);
      }

      res.status(201).json({
        status: 'success',
        message: 'Thread created successfully',
        data: {
          thread: {
            id: thread._id,
            title: thread.title,
            movie: thread.movieTitle,
            movieTmdbId: thread.movieTmdbId,
            author: user.username,
            content: thread.content,
            tags: thread.tags,
            replies: thread.replies,
            views: thread.views,
            lastActivity: thread.lastActivity,
            createdAt: thread.createdAt
          }
        }
      });
    } catch (error) {
      console.error('Create thread error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create thread'
      });
    }
  }
);

// Add reply to thread (requires authentication)
router.post(
  '/:id/replies',
  authMiddleware,
  [
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Reply content is required')
      .isLength({ max: 1000 })
      .withMessage('Reply cannot exceed 1000 characters')
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const threadId = req.params.id;
      const userId = req.userId!;
      const { content } = req.body;

      const thread = await DiscussionThread.findById(threadId);
      if (!thread) {
        res.status(404).json({
          status: 'error',
          message: 'Thread not found'
        });
        return;
      }

      // Get user for author name
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
        return;
      }

      const newReply: IDiscussionReply = {
        userId: new mongoose.Types.ObjectId(userId),
        author: user.username,
        content: content.trim(),
        timestamp: new Date()
      };

      thread.replies.push(newReply);
      thread.lastActivity = new Date();
      await thread.save();

      // Get the saved reply (Mongoose adds _id after save)
      const savedReply = thread.replies[thread.replies.length - 1];

      // Track activity
      try {
        await UserActivity.create({
          userId: new mongoose.Types.ObjectId(userId),
          activityType: 'reply',
          movieId: thread.movieTmdbId
        });
      } catch (activityError) {
        console.error('Failed to track activity:', activityError);
      }

      res.status(201).json({
        status: 'success',
        message: 'Reply added successfully',
        data: {
          reply: {
            id: (savedReply as any)._id,
            author: savedReply.author,
            content: savedReply.content,
            timestamp: savedReply.timestamp
          }
        }
      });
    } catch (error) {
      console.error('Add reply error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to add reply'
      });
    }
  }
);

// Increment view count
router.put('/:id/views', async (req: Request, res: Response): Promise<void> => {
  try {
    const threadId = req.params.id;

    const thread = await DiscussionThread.findByIdAndUpdate(
      threadId,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!thread) {
      res.status(404).json({
        status: 'error',
        message: 'Thread not found'
      });
      return;
    }

    res.json({
      status: 'success',
      data: {
        views: thread.views
      }
    });
  } catch (error) {
    console.error('Increment views error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to increment views'
    });
  }
});

// Delete own discussion thread (requires authentication)
router.delete(
  '/:id',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const threadId = req.params.id;
      const userId = req.userId!;

      const thread = await DiscussionThread.findById(threadId);
      if (!thread) {
        res.status(404).json({
          status: 'error',
          message: 'Thread not found'
        });
        return;
      }

      // Check if user owns the thread
      if (thread.userId.toString() !== userId) {
        res.status(403).json({
          status: 'error',
          message: 'You can only delete your own discussions'
        });
        return;
      }

      // Soft delete
      thread.isDeleted = true;
      thread.deletedAt = new Date();
      await thread.save();

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
  }
);

// Delete own reply to discussion (requires authentication)
router.delete(
  '/:id/replies/:replyId',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const threadId = req.params.id;
      const replyId = req.params.replyId;
      const userId = req.userId!;

      const thread = await DiscussionThread.findById(threadId);
      if (!thread) {
        res.status(404).json({
          status: 'error',
          message: 'Thread not found'
        });
        return;
      }

      // Find the reply
      const reply = thread.replies.find(
        (r: any) => r._id?.toString() === replyId
      );

      if (!reply) {
        res.status(404).json({
          status: 'error',
          message: 'Reply not found'
        });
        return;
      }

      // Check if user owns the reply
      if (reply.userId.toString() !== userId) {
        res.status(403).json({
          status: 'error',
          message: 'You can only delete your own replies'
        });
        return;
      }

      // Remove the reply
      thread.replies = thread.replies.filter(
        (r: any) => r._id?.toString() !== replyId
      );
      thread.lastActivity = new Date();
      await thread.save();

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
  }
);

export default router;
