import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ISalesMinerAnalyze } from "../../app/server/models/SalesMinerAnalyze";
import { api } from "../../lib/api-client";

// Types
export interface Competitor {
  name: string;
  url: string;
}

export interface SalesMinerAnalyzeData {
  companyName: string;
  url?: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
  language: string;
  additionalInformation?: string;
  competitors?: Competitor[];
  user?: string;
  status?: "progress" | "finished" | "error" | "canceled";
  currentStep?: number;
  executionId?: string;
  executionStatus?:
    | "started"
    | "inProgress"
    | "finished"
    | "error"
    | "canceled";
  executionStep?: number;
  resultText?: string;
  summary?: string;
  improvementLeverages?: string;
  headToHead?: string;
  sources?: string;
}

export interface UpdateSalesMinerAnalyzeData
  extends Partial<SalesMinerAnalyzeData> {
  id: string;
}

// API functions
const salesMinerAnalyzeApi = {
  // Create new sales miner analyze record
  async create(data: SalesMinerAnalyzeData): Promise<ISalesMinerAnalyze> {
    const response = await api.post("/sales-miner-analyze", data);
    return response.data;
  },

  // Get sales miner analyze by ID
  async getById(id: string): Promise<ISalesMinerAnalyze> {
    const response = await api.get(`/sales-miner-analyze?id=${id}`);
    return response.data;
  },

  // Get all sales miner analyzes for a user
  async getByUser(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: ISalesMinerAnalyze[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await api.get(
      `/sales-miner-analyze?userId=${userId}&page=${page}&limit=${limit}`
    );
    console.log("🌐 Client: getByUser response:", response);
    console.log("🌐 Client: response.data:", response.data);
    return response.data;
  },

  // Get all sales miner analyzes (admin)
  async getAll(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: ISalesMinerAnalyze[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await api.get(
      `/sales-miner-analyze?userId=all&page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // Update sales miner analyze record
  async update({
    id,
    ...data
  }: UpdateSalesMinerAnalyzeData): Promise<ISalesMinerAnalyze> {
    console.log("🌐 Client: Starting update request with:", { id, data });
    const requestBody = { analyzeId: id, ...data };
    console.log("📤 Client: Request body:", requestBody);

    const response = await api.post("/sales-miner-analyze", requestBody);
    console.log("✅ Client: Update successful, returning data:", response.data);
    return response.data;
  },

  // Delete sales miner analyze record
  async delete(id: string): Promise<boolean> {
    const response = await api.delete(`/sales-miner-analyze?id=${id}`);
    return response.data;
  },

  // Get sales miner analyze by execution ID
  async getByExecutionId(executionId: string): Promise<ISalesMinerAnalyze> {
    const response = await api.get(
      `/sales-miner-analyze?executionId=${executionId}`
    );
    return response.data;
  },
};

// React Query hooks
export const useSalesMinerAnalyzeService = () => {
  const queryClient = useQueryClient();

  // Create sales miner analyze mutation
  const createSalesMinerAnalyze = useMutation({
    mutationFn: salesMinerAnalyzeApi.create,
    onSuccess: (data) => {
      // Invalidate and refetch user's sales miner analyzes
      queryClient.invalidateQueries({
        queryKey: ["sales-miner-analyzes", data.user],
      });
      queryClient.invalidateQueries({ queryKey: ["sales-miner-analyzes"] });
    },
  });

  // Update sales miner analyze mutation
  const updateSalesMinerAnalyze = useMutation({
    mutationFn: salesMinerAnalyzeApi.update,
    onSuccess: (data) => {
      // Invalidate and refetch specific sales miner analyze and user's sales miner analyzes
      queryClient.invalidateQueries({
        queryKey: ["sales-miner-analyze", data._id],
      });
      queryClient.invalidateQueries({
        queryKey: ["sales-miner-analyzes", data.user],
      });
      queryClient.invalidateQueries({ queryKey: ["sales-miner-analyzes"] });
    },
  });

  // Delete sales miner analyze mutation
  const deleteSalesMinerAnalyze = useMutation({
    mutationFn: salesMinerAnalyzeApi.delete,
    onSuccess: (_, id) => {
      // Invalidate and refetch sales miner analyzes
      queryClient.invalidateQueries({ queryKey: ["sales-miner-analyzes"] });
      queryClient.removeQueries({ queryKey: ["sales-miner-analyze", id] });
    },
  });

  return {
    createSalesMinerAnalyze,
    updateSalesMinerAnalyze,
    deleteSalesMinerAnalyze,
  };
};

// Get sales miner analyze by ID hook
export const useGetSalesMinerAnalyze = (
  id: string | null,
  options?: {
    refetchInterval?: number;
    enabled?: boolean;
  }
) => {
  return useQuery({
    queryKey: ["sales-miner-analyze", id],
    queryFn: () => salesMinerAnalyzeApi.getById(id!),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    refetchInterval: options?.refetchInterval,
  });
};

// Get sales miner analyzes by user hook
export const useGetSalesMinerAnalyzesByUser = (
  userId: string | null,
  page: number = 1,
  limit: number = 10
) => {
  return useQuery({
    queryKey: ["sales-miner-analyzes", userId, page, limit],
    queryFn: () => salesMinerAnalyzeApi.getByUser(userId!, page, limit),
    enabled: !!userId,
  });
};

// Get all sales miner analyzes hook (admin)
export const useGetAllSalesMinerAnalyzes = (
  page: number = 1,
  limit: number = 10,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["sales-miner-analyzes", "all", page, limit],
    queryFn: () => salesMinerAnalyzeApi.getAll(page, limit),
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
};

// Get latest progress for user hook
export const useGetLatestSalesMinerProgress = (userId: string | null) => {
  return useQuery({
    queryKey: ["sales-miner-analyzes", userId, "latest"],
    queryFn: () => salesMinerAnalyzeApi.getByUser(userId!, 1, 50),
    enabled: !!userId,
    select: (response) => {
      // Handle both new paginated format and potential old format
      const data = "data" in response ? response.data : response;
      return Array.isArray(data)
        ? data.find((analyze) => analyze.status === "progress")
        : undefined;
    },
  });
};

// Get sales miner analyze by execution ID hook
export const useGetSalesMinerAnalyzeByExecutionId = (
  executionId: string | null
) => {
  return useQuery({
    queryKey: ["sales-miner-analyze", "execution", executionId],
    queryFn: () => salesMinerAnalyzeApi.getByExecutionId(executionId!),
    enabled: !!executionId,
  });
};
