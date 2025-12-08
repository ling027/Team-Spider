import express, { Response } from 'express';
import { User } from '../models/User.js';
import { Watchlist } from '../models/Watchlist.js';
import { MovieComment } from '../models/MovieComment.js';
import { DiscussionThread } from '../models/DiscussionThread.js';
import { UserActivity } from '../models/UserActivity.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get user profile by ID
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    const user = await User.findOne({ 
      _id: userId,
      isDeleted: { $ne: true }
    }).select('-password');

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
      return;
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullname: user.fullname,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user'
    });
  }
});

// Update user profile (authenticated)
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const currentUserId = req.userId;

    // Check if user is updating their own profile
    if (userId !== currentUserId) {
      res.status(403).json({
        status: 'error',
        message: 'You can only update your own profile'
      });
      return;
    }

    const { fullname, email } = req.body;
    const updateData: { fullname?: string; email?: string } = {};

    if (fullname) {
      updateData.fullname = fullname.trim();
    }

    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        res.status(400).json({
          status: 'error',
          message: 'Email is already taken'
        });
        return;
      }
      updateData.email = email.trim().toLowerCase();
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullname: user.fullname
        }
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile'
    });
  }
});

// Get user statistics
router.get('/:id/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
      return;
    }

    // Get watchlists and calculate total runtime
    const watchlists = await Watchlist.find({ 
      userId,
      isDeleted: { $ne: true }
    });
    let totalRuntime = 0;
    let totalMovies = 0;
    let totalRatings = 0;
    let ratingSum = 0;

    watchlists.forEach(watchlist => {
      watchlist.movies.forEach(movie => {
        totalRuntime += movie.runtime;
        totalMovies++;
        if (movie.rating > 0) {
          totalRatings++;
          ratingSum += movie.rating;
        }
      });
    });

    const avgRating = totalRatings > 0 ? (ratingSum / totalRatings).toFixed(1) : '0.0';

    // Get total comments
    const totalComments = await MovieComment.countDocuments({ 
      userId,
      isDeleted: { $ne: true }
    });

    // Get total discussions
    const totalDiscussions = await DiscussionThread.countDocuments({ 
      userId,
      isDeleted: { $ne: true }
    });

    res.json({
      status: 'success',
      data: {
        stats: {
          minutesWatched: totalRuntime,
          moviesWatched: totalMovies,
          avgRating: parseFloat(avgRating),
          totalComments,
          totalDiscussions,
          totalWatchlists: watchlists.length
        }
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user statistics'
    });
  }
});

// Get user reviews (comments)
router.get('/:id/reviews', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
      return;
    }

    // Get user's reviews (comments)
    const comments = await MovieComment.find({ 
      userId,
      isDeleted: { $ne: true }
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      status: 'success',
      data: {
        reviews: comments.map(comment => ({
          id: comment._id,
          movieTmdbId: comment.movieTmdbId,
          text: comment.text,
          rating: comment.rating || null,
          replies: comment.replies || [],
          createdAt: comment.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user reviews'
    });
  }
});

// Get user discussions
router.get('/:id/discussions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
      return;
    }

    // Get user's discussions
    const discussions = await DiscussionThread.find({ 
      userId,
      isDeleted: { $ne: true }
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      status: 'success',
      data: {
        discussions: discussions.map(discussion => ({
          id: discussion._id,
          title: discussion.title,
          movieTitle: discussion.movieTitle,
          movieTmdbId: discussion.movieTmdbId,
          content: discussion.content,
          tags: discussion.tags,
          replies: discussion.replies || [],
          views: discussion.views,
          lastActivity: discussion.lastActivity,
          createdAt: discussion.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Get user discussions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user discussions'
    });
  }
});

// Get user activity history
router.get('/:id/activity', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 100;
    const skip = parseInt(req.query.skip as string) || 0;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
      return;
    }

    // Get activity records
    const activities = await UserActivity.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip);

    // Format activity data for daily activity map (for profile calendar)
    const dailyActivity: Record<string, number> = {};
    activities.forEach(activity => {
      const dateKey = activity.timestamp.toISOString().split('T')[0];
      dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;
    });

    res.json({
      status: 'success',
      data: {
        activities: activities.map(activity => ({
          id: activity._id,
          activityType: activity.activityType,
          movieId: activity.movieId,
          timestamp: activity.timestamp
        })),
        dailyActivity,
        total: activities.length
      }
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user activity'
    });
  }
});

export default router;

