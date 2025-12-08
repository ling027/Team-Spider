import apiClient from './apiClient';

export interface DiscussionReply {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

export interface DiscussionThread {
  id: string;
  title: string;
  movie: string;
  movieTmdbId: number;
  author: string;
  replies: number;
  views: number;
  lastActivity: string;
  tags: string[];
  content: string;
  replyList?: DiscussionReply[];
  createdAt: string;
}

export interface DiscussionResponse {
  status: string;
  data: {
    threads: DiscussionThread[];
  };
}

export interface SingleThreadResponse {
  status: string;
  data: {
    thread: DiscussionThread & {
      replies: DiscussionReply[];
    };
  };
}

export interface CreateThreadData {
  title: string;
  movieTitle: string;
  movieTmdbId: number;
  content: string;
  tags?: string[];
}

export interface CreateReplyData {
  content: string;
}

export const discussionsAPI = {
  getAll: async (): Promise<DiscussionResponse> => {
    const response = await apiClient.get('/discussions');
    return response.data;
  },

  getById: async (id: string): Promise<SingleThreadResponse> => {
    const response = await apiClient.get(`/discussions/${id}`);
    return response.data;
  },

  create: async (data: CreateThreadData): Promise<SingleThreadResponse> => {
    const response = await apiClient.post('/discussions', data);
    return response.data;
  },

  addReply: async (threadId: string, data: CreateReplyData): Promise<{ status: string; data: { reply: DiscussionReply } }> => {
    const response = await apiClient.post(`/discussions/${threadId}/replies`, data);
    return response.data;
  },

  incrementViews: async (threadId: string): Promise<{ status: string; data: { views: number } }> => {
    const response = await apiClient.put(`/discussions/${threadId}/views`);
    return response.data;
  },

  delete: async (threadId: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.delete(`/discussions/${threadId}`);
    return response.data;
  },

  deleteReply: async (threadId: string, replyId: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.delete(`/discussions/${threadId}/replies/${replyId}`);
    return response.data;
  }
};


