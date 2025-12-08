import apiClient from './apiClient';

export interface MovieCommentReply {
  id: string;
  userId: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface MovieComment {
  id: string;
  userId: string;
  username: string;
  email: string;
  text: string;
  rating?: number | null;
  replies?: MovieCommentReply[];
  createdAt: string;
}

export interface CommentsResponse {
  status: string;
  data: {
    comments: MovieComment[];
  };
}

export interface CreateCommentData {
  text: string;
  rating?: number;
}

export interface CreateReplyData {
  text: string;
}

export const commentsAPI = {
  getByMovie: async (movieTmdbId: number): Promise<CommentsResponse> => {
    const response = await apiClient.get(`/movies/${movieTmdbId}/comments`);
    return response.data;
  },

  create: async (movieTmdbId: number, data: CreateCommentData): Promise<{ status: string; data: { comment: MovieComment } }> => {
    const response = await apiClient.post(`/movies/${movieTmdbId}/comments`, data);
    return response.data;
  },

  addReply: async (movieTmdbId: number, commentId: string, data: CreateReplyData): Promise<{ status: string; data: { reply: MovieCommentReply } }> => {
    const response = await apiClient.post(`/movies/${movieTmdbId}/comments/${commentId}/replies`, data);
    return response.data;
  },

  delete: async (movieTmdbId: number, commentId: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.delete(`/movies/${movieTmdbId}/comments/${commentId}`);
    return response.data;
  },

  deleteReply: async (movieTmdbId: number, commentId: string, replyId: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.delete(`/movies/${movieTmdbId}/comments/${commentId}/replies/${replyId}`);
    return response.data;
  }
};


