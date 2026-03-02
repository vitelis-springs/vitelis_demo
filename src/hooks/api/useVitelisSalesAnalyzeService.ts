import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IVitelisSalesAnalyze } from "../../app/server/models/VitelisSalesAnalyze";
import { api } from "../../lib/api-client";

export interface VitelisSalesAnalyzeData {
  companyName: string;
  url: string;
  useCase?: string;
  industry_id: number;
  user?: string;
  status?: "progress" | "finished" | "error" | "canceled";
  currentStep?: number;
  executionId?: string;
  executionStatus?: "started" | "inProgress" | "finished" | "error" | "canceled";
  executionStep?: number;
  docxFile?: string;
  companyId?: number;
  reportId?: number;
  generatedReportId?: number;
}

export interface UpdateVitelisSalesAnalyzeData
  extends Partial<VitelisSalesAnalyzeData> {
  id: string;
}

const vitelisSalesAnalyzeApi = {
  async create(data: VitelisSalesAnalyzeData): Promise<IVitelisSalesAnalyze> {
    const response = await api.post("/vitelis-sales-analyze", data);
    return response.data;
  },

  async getById(id: string): Promise<IVitelisSalesAnalyze> {
    const response = await api.get(`/vitelis-sales-analyze?id=${id}`);
    return response.data;
  },

  async getByUser(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: IVitelisSalesAnalyze[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await api.get(
      `/vitelis-sales-analyze?userId=${userId}&page=${page}&limit=${limit}`
    );
    return response.data;
  },

  async getAll(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: IVitelisSalesAnalyze[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await api.get(
      `/vitelis-sales-analyze?userId=all&page=${page}&limit=${limit}`
    );
    return response.data;
  },

  async update({
    id,
    ...data
  }: UpdateVitelisSalesAnalyzeData): Promise<IVitelisSalesAnalyze> {
    const requestBody = { analyzeId: id, ...data };
    const response = await api.post("/vitelis-sales-analyze", requestBody);
    return response.data;
  },

  async delete(id: string): Promise<boolean> {
    const response = await api.delete(`/vitelis-sales-analyze?id=${id}`);
    return response.data;
  },
};

export const useVitelisSalesAnalyzeService = () => {
  const queryClient = useQueryClient();

  const createVitelisSalesAnalyze = useMutation({
    mutationFn: vitelisSalesAnalyzeApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vitelis-sales-analyzes"] });
    },
  });

  const updateVitelisSalesAnalyze = useMutation({
    mutationFn: vitelisSalesAnalyzeApi.update,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["vitelis-sales-analyze", data._id],
      });
      queryClient.invalidateQueries({ queryKey: ["vitelis-sales-analyzes"] });
    },
  });

  const deleteVitelisSalesAnalyze = useMutation({
    mutationFn: vitelisSalesAnalyzeApi.delete,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["vitelis-sales-analyzes"] });
      queryClient.removeQueries({ queryKey: ["vitelis-sales-analyze", id] });
    },
  });

  return {
    createVitelisSalesAnalyze,
    updateVitelisSalesAnalyze,
    deleteVitelisSalesAnalyze,
  };
};

export const useGetVitelisSalesAnalyze = (
  id: string | null,
  options?: {
    refetchInterval?: number;
    enabled?: boolean;
  }
) => {
  return useQuery({
    queryKey: ["vitelis-sales-analyze", id],
    queryFn: () => vitelisSalesAnalyzeApi.getById(id!),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    refetchInterval: options?.refetchInterval,
  });
};

export const useGetVitelisSalesAnalyzesByUser = (
  userId: string | null,
  page: number = 1,
  limit: number = 10
) => {
  return useQuery({
    queryKey: ["vitelis-sales-analyzes", userId, page, limit],
    queryFn: () => vitelisSalesAnalyzeApi.getByUser(userId!, page, limit),
    enabled: !!userId,
  });
};

export const useGetAllVitelisSalesAnalyzes = (
  page: number = 1,
  limit: number = 10,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["vitelis-sales-analyzes", "all", page, limit],
    queryFn: () => vitelisSalesAnalyzeApi.getAll(page, limit),
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
};
