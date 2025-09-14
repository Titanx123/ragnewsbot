import axios from 'axios';

// Define types for our API responses
interface ChatSession {
  sessionId: string;
  createdAt: string;
}

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
  withCredentials: false // Disable credentials for now
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    // You can add auth tokens here if needed
    // config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.data);
    return response;
  },
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error - Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API Error - No Response:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Error - Request Setup:', error.message);
    }
    return Promise.reject(error);
  }
);

// Chat API response types
export interface ChatResponse {
  answer: string;
  hits?: Array<{
    payload?: {
      title?: string;
      url?: string;
      content?: string;
    };
    score?: number;
  }>;
}

// Chat API functions
export const chatApi = {
  // Start a new chat session
  startSession: async (): Promise<ChatSession> => {
    const response = await api.post('/chat/start');
    return response.data;
  },

  // Send a message to an existing chat session
  sendMessage: async (sessionId: string, message: string): Promise<ChatResponse> => {
    const response = await api.post(`/chat/${sessionId}/message`, { message });
    return response.data as ChatResponse;
  }
};

export default api;
