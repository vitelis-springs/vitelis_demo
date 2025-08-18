import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IAnalyze } from '../../app/server/models/Analyze';

// Types
export interface AnalyzeData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
  userId?: string;
  status?: 'progress' | 'finished';
  currentStep?: number;
  executionId?: string;
  executionStatus?: 'started' | 'inProgress' | 'finished' | 'errored';
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
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create analyze record');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to create analyze record');
    }
    return result.data;
  },

  // Get analyze by ID
  async getById(id: string): Promise<IAnalyze> {
    const response = await fetch(`/api/analyze?id=${id}`);

    if (!response.ok) {
      throw new Error('Failed to fetch analyze record');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch analyze record');
    }
    return result.data;
  },

  // Get all analyzes for a user
  async getByUser(userId: string): Promise<IAnalyze[]> {
    const response = await fetch(`/api/analyze?userId=${userId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch analyze records');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch analyze records');
    }
    return result.data;
  },

  // Get all analyzes (admin)
  async getAll(): Promise<IAnalyze[]> {
    const response = await fetch('/api/analyze');

    if (!response.ok) {
      throw new Error('Failed to fetch analyze records');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch analyze records');
    }
    return result.data;
  },

  // Update analyze record
  async update({ id, ...data }: UpdateAnalyzeData): Promise<IAnalyze> {
    console.log('🌐 Client: Starting update request with:', { id, data });
    const requestBody = { analyzeId: id, ...data };
    console.log('📤 Client: Request body:', requestBody);
    
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('📡 Client: Response status:', response.status);
    
    if (!response.ok) {
      console.error('❌ Client: Response not ok:', response.status, response.statusText);
      throw new Error('Failed to update analyze record');
    }

    const result = await response.json();
    console.log('📥 Client: Response result:', result);
    
    if (!result.success) {
      console.error('❌ Client: API returned error:', result.message);
      throw new Error(result.message || 'Failed to update analyze record');
    }
    
    console.log('✅ Client: Update successful, returning data:', result.data);
    return result.data;
  },

  // Delete analyze record
  async delete(id: string): Promise<boolean> {
    const response = await fetch(`/api/analyze?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete analyze record');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to delete analyze record');
    }
    return true;
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
      queryClient.invalidateQueries({ queryKey: ['analyzes', data.userId] });
      queryClient.invalidateQueries({ queryKey: ['analyzes'] });
    },
  });

  // Update analyze mutation
  const updateAnalyze = useMutation({
    mutationFn: analyzeApi.update,
    onSuccess: (data) => {
      // Invalidate and refetch specific analyze and user's analyzes
      queryClient.invalidateQueries({ queryKey: ['analyze', data._id] });
      queryClient.invalidateQueries({ queryKey: ['analyzes', data.userId] });
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
