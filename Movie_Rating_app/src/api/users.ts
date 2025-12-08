import apiClient from './apiClient';

export interface User {
  id: string;
  username: string;
  email: string;
  fullname: string;
  createdAt?: string;
}

export interface UserStats {
  minutesWatched: number;
  moviesWatched: number;
  avgRating: number;
  totalComments: number;
  totalDiscussions: number;
  totalWatchlists: number;
}

export interface UserActivity {
  id: string;
  activityType: string;
  movieId: number;
  timestamp: string;
}

export interface UserResponse {
  status: string;
  data: {
    user: User;
  };
}

export interface UserStatsResponse {
  status: string;
  data: {
    stats: UserStats;
  };
}

export interface UserActivityResponse {
  status: string;
  data: {
    activities: UserActivity[];
    dailyActivity: Record<string, number>;
    total: number;
  };
}

export interface UserReview {
  id: string;
  movieTmdbId: number;
  text: string;
  rating?: number | null;
  replies?: Array<{
    id: string;
    userId: string;
    author: string;
    text: string;
    timestamp: string;
  }>;
  createdAt: string;
}

export interface UserDiscussion {
  id: string;
  title: string;
  movieTitle: string;
  movieTmdbId: number;
  content: string;
  tags: string[];
  replies?: Array<{
    id: string;
    userId: string;
    author: string;
    content: string;
    timestamp: string;
  }>;
  views: number;
  lastActivity: string;
  createdAt: string;
}

export interface UserReviewsResponse {
  status: string;
  data: {
    reviews: UserReview[];
  };
}

export interface UserDiscussionsResponse {
  status: string;
  data: {
    discussions: UserDiscussion[];
  };
}

export interface UpdateUserData {
  fullname?: string;
  email?: string;
}

export const usersAPI = {
  getById: async (id: string): Promise<UserResponse> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  update: async (id: string, data: UpdateUserData): Promise<UserResponse> => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },

  getStats: async (id: string): Promise<UserStatsResponse> => {
    const response = await apiClient.get(`/users/${id}/stats`);
    return response.data;
  },

  getActivity: async (id: string, limit?: number, skip?: number): Promise<UserActivityResponse> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (skip) params.append('skip', skip.toString());
    const response = await apiClient.get(`/users/${id}/activity?${params.toString()}`);
    return response.data;
  },

  getReviews: async (id: string): Promise<UserReviewsResponse> => {
    const response = await apiClient.get(`/users/${id}/reviews`);
    return response.data;
  },

  getDiscussions: async (id: string): Promise<UserDiscussionsResponse> => {
    const response = await apiClient.get(`/users/${id}/discussions`);
    return response.data;
  }
};


