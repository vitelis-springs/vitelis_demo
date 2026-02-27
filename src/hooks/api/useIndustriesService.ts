import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api-client";

export interface Industry {
  id: number;
  name: string;
}

const industriesApi = {
  async list(): Promise<Industry[]> {
    const response = await api.get("/industries");
    return response.data;
  },

  async create(name: string): Promise<Industry> {
    const response = await api.post("/industries", { name });
    return response.data;
  },
};

export const useGetIndustries = () => {
  return useQuery({
    queryKey: ["industries"],
    queryFn: () => industriesApi.list(),
  });
};

export const useIndustriesService = () => {
  const queryClient = useQueryClient();

  const createIndustry = useMutation({
    mutationFn: industriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industries"] });
    },
  });

  return {
    createIndustry,
  };
};

