import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { MovieComment } from '../models/MovieComment.js';
import { User } from '../models/User.js';
import { UserActivity } from '../models/UserActivity.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get all comments for a movie
router.get('/:movieId/comments', async (req: Request, res: Response): Promise<void> => {
  try {
    const movieTmdbId = parseInt(req.params.movieId);

    if (isNaN(movieTmdbId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid movie ID'
      });
      return;
    }

    const comments = await MovieComment.find({ 
      movieTmdbId,
      isDeleted: { $ne: true }
    })
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });

    res.json({
      status: 'success',
      data: {
        comments: comments.map(comment => ({
          id: comment._id,
          userId: comment.userId,
          username: (comment.userId as any)?.username || 'Unknown',
          email: (comment.userId as any)?.email || '',
          text: comment.text,
          rating: comment.rating || null,
          replies: comment.replies || [],
          createdAt: comment.createdAt
        }))
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

// Add comment to movie (requires authentication)
router.post(
  '/:movieId/comments',
  authMiddleware,
  [
    body('text')
      .trim()
      .notEmpty()
      .withMessage('Comment text is required')
      .isLength({ max: 500 })
      .withMessage('Comment cannot exceed 500 characters'),
    body('rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5')
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

      const movieTmdbId = parseInt(req.params.movieId);
      const userId = req.userId!;
      const { text, rating } = req.body;

      if (isNaN(movieTmdbId)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid movie ID'
        });
        return;
      }

      const comment = new MovieComment({
        userId: new mongoose.Types.ObjectId(userId),
        movieTmdbId,
        text: text.trim(),
        rating: rating ? parseInt(rating) : undefined
      });

      await comment.save();

      // Populate user data for response
      await comment.populate('userId', 'username email');

      // Track activity
      try {
        await UserActivity.create({
          userId: new mongoose.Types.ObjectId(userId),
          activityType: 'comment',
          movieId: movieTmdbId
        });
      } catch (activityError) {
        console.error('Failed to track activity:', activityError);
      }

      res.status(201).json({
        status: 'success',
        message: 'Comment added successfully',
        data: {
          comment: {
            id: comment._id,
            userId: comment.userId,
            username: (comment.userId as any)?.username || 'Unknown',
            email: (comment.userId as any)?.email || '',
            text: comment.text,
            rating: comment.rating || null,
            replies: comment.replies || [],
            createdAt: comment.createdAt
          }
        }
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to add comment'
      });
    }
  }
);

// Add reply to comment (requires authentication)
router.post(
  '/:movieId/comments/:commentId/replies',
  authMiddleware,
  [
    body('text')
      .trim()
      .notEmpty()
      .withMessage('Reply text is required')
      .isLength({ max: 500 })
      .withMessage('Reply cannot exceed 500 characters')
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

      const commentId = req.params.commentId;
      const userId = req.userId!;
      const { text } = req.body;

      const comment = await MovieComment.findById(commentId);
      if (!comment) {
        res.status(404).json({
          status: 'error',
          message: 'Comment not found'
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

      const newReply = {
        userId: new mongoose.Types.ObjectId(userId),
        author: user.username,
        text: text.trim(),
        timestamp: new Date()
      };

      comment.replies.push(newReply);
      await comment.save();

      // Get the saved reply (Mongoose adds _id after save)
      const savedReply = comment.replies[comment.replies.length - 1];

      // Track activity
      try {
        await UserActivity.create({
          userId: new mongoose.Types.ObjectId(userId),
          activityType: 'comment',
          movieId: comment.movieTmdbId
        });
      } catch (activityError) {
        console.error('Failed to track activity:', activityError);
      }

      res.status(201).json({
        status: 'success',
        message: 'Reply added successfully',
        data: {
          reply: {
            id: savedReply._id,
            userId: savedReply.userId,
            author: savedReply.author,
            text: savedReply.text,
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

export default router;


