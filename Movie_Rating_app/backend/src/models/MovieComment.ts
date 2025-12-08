import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMovieCommentReply {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  author: string;
  text: string;
  timestamp: Date;
}

export interface IMovieComment extends Document {
  userId: Types.ObjectId;
  movieTmdbId: number;
  text: string;
  rating?: number;
  replies: IMovieCommentReply[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
}

const MovieCommentReplySchema = new Schema<IMovieCommentReply>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Reply cannot exceed 500 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const MovieCommentSchema = new Schema<IMovieComment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    movieTmdbId: {
      type: Number,
      required: true,
      index: true
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      default: null
    },
    replies: {
      type: [MovieCommentReplySchema],
      default: []
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
MovieCommentSchema.index({ movieTmdbId: 1, createdAt: -1 });
MovieCommentSchema.index({ userId: 1, createdAt: -1 });

export const MovieComment = mongoose.model<IMovieComment>('MovieComment', MovieCommentSchema);


