import axios from 'axios';
import { authService } from './auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${authService.getToken()}` }
});

export const interviewService = {
  async uploadCv(file: File, candidateName: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('candidateName', candidateName);
    
    const response = await axios.post(`${API_URL}/interviews/upload`, formData, {
      headers: {
        ...getAuthHeader().headers,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async getInterviews(): Promise<any[]> {
    const response = await axios.get(`${API_URL}/interviews`, getAuthHeader());
    return response.data;
  },

  async getInterview(id: string): Promise<any> {
    const response = await axios.get(`${API_URL}/interviews/${id}`, getAuthHeader());
    return response.data;
  },

  async generateInvite(id: string): Promise<any> {
    const response = await axios.post(`${API_URL}/interviews/${id}/invite`, {}, getAuthHeader());
    return response.data;
  },

  async evaluate(id: string): Promise<any> {
    const response = await axios.post(`${API_URL}/interviews/${id}/evaluate`, {}, getAuthHeader());
    return response.data;
  },

  async getSession(token: string): Promise<any> {
    const response = await axios.get(`${API_URL}/interviews/session/${token}`);
    return response.data;
  },

  async updateStage(token: string, stage: string): Promise<any> {
    const response = await axios.post(`${API_URL}/interviews/session/${token}/stage`, { stage });
    return response.data;
  },

  async getQuiz(token: string): Promise<any> {
    const response = await axios.get(`${API_URL}/interviews/session/${token}/quiz`);
    return response.data;
  },

  async submitQuiz(token: string, results: any): Promise<any> {
    const response = await axios.post(`${API_URL}/interviews/session/${token}/quiz/submit`, { results });
    return response.data;
  },

  async getCoding(token: string): Promise<any> {
    const response = await axios.get(`${API_URL}/interviews/session/${token}/coding`);
    return response.data;
  },

  async submitCoding(token: string, solution: string, results: any): Promise<any> {
    const response = await axios.post(`${API_URL}/interviews/session/${token}/coding/submit`, { solution, results });
    return response.data;
  },

  getReportUrl(filename: string): string {
    return `${API_URL}/interviews/reports/${filename}`;
  }
};
