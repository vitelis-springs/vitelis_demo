import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IAnalyze } from '../../app/server/models/Analyze';
import { api } from '../../lib/api-client';

// Types
export interface AnalyzeData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
  language: string;
  additionalInformation?: string;
  user?: string;
  status?: 'progress' | 'finished' | 'error' | 'canceled';
  currentStep?: number;
  executionId?: string;
  executionStatus?: 'started' | 'inProgress' | 'finished' | 'error' | 'canceled';
  executionStep?: number;
  resultText?: string;
}

export interface UpdateAnalyzeData extends Partial<AnalyzeData> {
  id: string;
}

// API functions
const analyzeApi = {
  // Create new analyze record
  async create(data: AnalyzeData): Promise<IAnalyze> {
    const response = await api.post('/analyze', data);
    return response.data;
  },

  // Get analyze by ID
  async getById(id: string): Promise<IAnalyze> {
    const response = await api.get(`/analyze?id=${id}`);
    return response.data;
  },

  // Get all analyzes for a user
  async getByUser(userId: string): Promise<IAnalyze[]> {
    const response = await api.get(`/analyze?userId=${userId}`);
    console.log('🌐 Client: getByUser response:', response);
    console.log('🌐 Client: response.data:', response.data);
    return response.data.data || response.data; // Handle both formats
  },

  // Get all analyzes (admin)
  async getAll(): Promise<IAnalyze[]> {
    const response = await api.get('/analyze');
    return response.data;
  },

  // Update analyze record
  async update({ id, ...data }: UpdateAnalyzeData): Promise<IAnalyze> {
    console.log('🌐 Client: Starting update request with:', { id, data });
    const requestBody = { analyzeId: id, ...data };
    console.log('📤 Client: Request body:', requestBody);
    
    const response = await api.post('/analyze', requestBody);
    console.log('✅ Client: Update successful, returning data:', response.data);
    return response.data;
  },

  // Delete analyze record
  async delete(id: string): Promise<boolean> {
    const response = await api.delete(`/analyze?id=${id}`);
    return response.data;
  },
};

// React Query hooks
export const useAnalyzeService = () => {
  const queryClient = useQueryClient();

  // Create analyze mutation
  const createAnalyze = useMutation({
    mutationFn: analyzeApi.create,
    onSuccess: (data) => {
      // Invalidate and refetch user's analyzes
      queryClient.invalidateQueries({ queryKey: ['analyzes', data.user] });
      queryClient.invalidateQueries({ queryKey: ['analyzes'] });
    },
  });

  // Update analyze mutation
  const updateAnalyze = useMutation({
    mutationFn: analyzeApi.update,
    onSuccess: (data) => {
      // Invalidate and refetch specific analyze and user's analyzes
      queryClient.invalidateQueries({ queryKey: ['analyze', data._id] });
      queryClient.invalidateQueries({ queryKey: ['analyzes', data.user] });
      queryClient.invalidateQueries({ queryKey: ['analyzes'] });
    },
  });

  // Delete analyze mutation
  const deleteAnalyze = useMutation({
    mutationFn: analyzeApi.delete,
    onSuccess: (_, id) => {
      // Invalidate and refetch analyzes
      queryClient.invalidateQueries({ queryKey: ['analyzes'] });
      queryClient.removeQueries({ queryKey: ['analyze', id] });
    },
  });

  return {
    createAnalyze,
    updateAnalyze,
    deleteAnalyze,
  };
};

// Get analyze by ID hook
export const useGetAnalyze = (id: string | null, options?: {
  refetchInterval?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['analyze', id],
    queryFn: () => analyzeApi.getById(id!),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    refetchInterval: options?.refetchInterval,
  });
};

// Get analyzes by user hook
export const useGetAnalyzesByUser = (userId: string | null) => {
  return useQuery({
    queryKey: ['analyzes', userId],
    queryFn: () => analyzeApi.getByUser(userId!),
    enabled: !!userId,
  });
};

// Get all analyzes hook (admin)
export const useGetAllAnalyzes = () => {
  return useQuery({
    queryKey: ['analyzes'],
    queryFn: analyzeApi.getAll,
  });
};

// Get latest progress for user hook
export const useGetLatestProgress = (userId: string | null) => {
  return useQuery({
    queryKey: ['analyzes', userId, 'latest'],
    queryFn: () => analyzeApi.getByUser(userId!),
    enabled: !!userId,
    select: (data) => data.find(analyze => analyze.status === 'progress'),
  });
};
