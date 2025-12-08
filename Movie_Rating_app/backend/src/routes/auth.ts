import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/passwordHash.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 20 })
    .withMessage('Password must be between 8 and 20 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must include uppercase, lowercase, number, and special character'),
  body('fullname')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name is required and cannot exceed 100 characters')
];

const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Generate JWT token
const generateToken = (userId: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign({ userId }, jwtSecret, { expiresIn: '24h' });
};

// Register new user
router.post('/register', registerValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email, password, fullname } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists. Please log in instead.'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      fullname
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id.toString());

    // Return user data (password excluded by schema method)
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullname: user.fullname,
          isAdmin: user.isAdmin || false,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to register user'
    });
  }
});

// Login user
router.post('/login', loginValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, password } = req.body;

    // Find user by username or email (exclude soft-deleted)
    const user = await User.findOne({
      $or: [{ email: username }, { username }],
      isDeleted: { $ne: true }
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username or password'
      });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username or password'
      });
    }

    // Generate token
    const token = generateToken(user._id.toString());

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullname: user.fullname,
          isAdmin: user.isAdmin || false,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to login'
    });
  }
});

// Get current user (protected route)
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          fullname: req.user.fullname,
          isAdmin: req.user.isAdmin || false,
          createdAt: req.user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user information'
    });
  }
});

// Logout (client-side token removal, but we can add token blacklisting here if needed)
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

export default router;


