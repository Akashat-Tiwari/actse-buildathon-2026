import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const apiService = {
  // Check backend server health
  checkHealth: async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/`, { timeout: 3000 });
      return res.data;
    } catch (err) {
      console.error('Health check failed:', err);
      return { status: 'UNAVAILABLE', models_loaded: false };
    }
  },

  // Ingest & Score Transaction
  initiateTransaction: async (data) => {
    const res = await apiClient.post('/transactions/initiate', data);
    return res.data;
  },

  // Verify Receiver (Step-Up KYC)
  verifyReceiver: async (txId, verificationData) => {
    const res = await apiClient.post(`/transactions/${txId}/verify_receiver`, verificationData);
    return res.data;
  },

  // Final Settlement
  finalSettle: async (txId, reason = 'User_Authorization_Approved') => {
    const res = await apiClient.post(`/transactions/${txId}/final_settle?reason=${encodeURIComponent(reason)}`);
    return res.data;
  },

  // Get Single Transaction
  getTransaction: async (txId) => {
    const res = await apiClient.get(`/transactions/${txId}`);
    return res.data;
  },

  // List Transactions
  listTransactions: async (limit = 20, offset = 0) => {
    const res = await apiClient.get(`/transactions?limit=${limit}&offset=${offset}`);
    return res.data;
  },
};

export default apiService;
