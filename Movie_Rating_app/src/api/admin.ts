import apiClient from './apiClient';

export interface AdminStats {
  totalUsers: number;
  totalComments: number;
  totalDiscussions: number;
  totalWatchlists: number;
  deletedItems: number;
}

export interface AdminFilters {
  search?: string;
  userId?: string;
  movieId?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullname: string;
  isAdmin: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
}

export interface AdminCommentReply {
  id: string;
  userId: any;
  author: string;
  text: string;
  timestamp: Date;
}

export interface AdminComment {
  id: string;
  userId: any;
  username: string;
  email: string;
  movieTmdbId: number;
  text: string;
  rating?: number | null;
  replies?: AdminCommentReply[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
}

export interface AdminDiscussion {
  id: string;
  title: string;
  movie: string;
  movieTmdbId: number;
  author: string;
  content: string;
  tags: string[];
  replies: number;
  views: number;
  isDeleted: boolean;
  deletedAt?: Date;
  lastActivity: Date;
  createdAt: Date;
}

export interface AdminWatchlist {
  id: string;
  userId: any;
  username: string;
  email: string;
  name: string;
  movies: any[];
  movieCount: number;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminActivity {
  id: string;
  userId: any;
  username: string;
  activityType: string;
  movieId: number;
  timestamp: Date;
}

export interface TrashItem {
  id: string;
  type: 'user' | 'comment' | 'discussion' | 'watchlist';
  title: string;
  content: string;
  movieId?: number;
  deletedAt?: Date;
  createdAt: Date;
}

export const adminAPI = {
  getStats: async (): Promise<{ status: string; data: { stats: AdminStats } }> => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },

  getUsers: async (filters?: AdminFilters): Promise<{ status: string; data: { users: AdminUser[]; pagination: any } }> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.includeDeleted) params.append('includeDeleted', 'true');
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await apiClient.get(`/admin/users?${params.toString()}`);
    return response.data;
  },

  deleteUser: async (id: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.delete(`/admin/users/${id}`);
    return response.data;
  },

  restoreUser: async (id: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.post(`/admin/users/${id}/restore`);
    return response.data;
  },

  getComments: async (filters?: AdminFilters): Promise<{ status: string; data: { comments: AdminComment[]; pagination: any } }> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.movieId) params.append('movieId', filters.movieId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.includeDeleted) params.append('includeDeleted', 'true');
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await apiClient.get(`/admin/comments?${params.toString()}`);
    return response.data;
  },

  deleteComment: async (id: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.delete(`/admin/comments/${id}`);
    return response.data;
  },

  restoreComment: async (id: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.post(`/admin/comments/${id}/restore`);
    return response.data;
  },

  getDiscussions: async (filters?: AdminFilters): Promise<{ status: string; data: { discussions: AdminDiscussion[]; pagination: any } }> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.movieId) params.append('movieId', filters.movieId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.includeDeleted) params.append('includeDeleted', 'true');
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await apiClient.get(`/admin/discussions?${params.toString()}`);
    return response.data;
  },

  deleteDiscussion: async (id: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.delete(`/admin/discussions/${id}`);
    return response.data;
  },

  restoreDiscussion: async (id: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.post(`/admin/discussions/${id}/restore`);
    return response.data;
  },

  getWatchlists: async (filters?: AdminFilters): Promise<{ status: string; data: { watchlists: AdminWatchlist[]; pagination: any } }> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.includeDeleted) params.append('includeDeleted', 'true');
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await apiClient.get(`/admin/watchlists?${params.toString()}`);
    return response.data;
  },

  deleteWatchlist: async (id: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.delete(`/admin/watchlists/${id}`);
    return response.data;
  },

  restoreWatchlist: async (id: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.post(`/admin/watchlists/${id}/restore`);
    return response.data;
  },

  removeMovieFromWatchlist: async (watchlistId: string, movieId: number): Promise<{ status: string; message: string; data?: { watchlist: any } }> => {
    const response = await apiClient.delete(`/admin/watchlists/${watchlistId}/movies/${movieId}`);
    return response.data;
  },

  getActivity: async (filters?: AdminFilters): Promise<{ status: string; data: { activities: AdminActivity[]; pagination: any } }> => {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.movieId) params.append('movieId', filters.movieId);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await apiClient.get(`/admin/activity?${params.toString()}`);
    return response.data;
  },

  getTrash: async (filters?: AdminFilters): Promise<{ status: string; data: { trash: TrashItem[]; pagination: any } }> => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await apiClient.get(`/admin/trash?${params.toString()}`);
    return response.data;
  },

  getDiscussion: async (id: string): Promise<{ status: string; data: { thread: any } }> => {
    const response = await apiClient.get(`/admin/discussions/${id}`);
    return response.data;
  },

  deleteReply: async (discussionId: string, replyId: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.delete(`/admin/discussions/${discussionId}/replies/${replyId}`);
    return response.data;
  },

  deleteCommentReply: async (commentId: string, replyId: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.delete(`/admin/comments/${commentId}/replies/${replyId}`);
    return response.data;
  },

  getUserDetails: async (id: string): Promise<{ status: string; data: { user: AdminUser; stats: any; watchlists: AdminWatchlist[]; comments: AdminComment[]; discussions: AdminDiscussion[]; replies: any[]; activities: AdminActivity[] } }> => {
    const response = await apiClient.get(`/admin/users/${id}/details`);
    return response.data;
  }
};

