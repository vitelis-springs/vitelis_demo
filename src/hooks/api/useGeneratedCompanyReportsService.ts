import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api-client";

export interface GeneratedCompanyReport {
  id: number;
  company_id: number | null;
  report_id: number | null;
  data: unknown;
  files: unknown;
  created_at: string | null;
  updated_at: string | null;
}

const generatedCompanyReportsApi = {
  async getById(id: number): Promise<GeneratedCompanyReport> {
    const response = await api.get(`/generated-company-reports?id=${id}`);
    return response.data;
  },

  async getLatestByCompanyAndReport(
    companyId: number,
    reportId: number
  ): Promise<GeneratedCompanyReport> {
    const response = await api.get(
      `/generated-company-reports?companyId=${companyId}&reportId=${reportId}`
    );
    return response.data;
  },

  async fetchSellerBriefDocx(id: number): Promise<{ blob: Blob; filename: string }> {
    const response = await api.post(
      "/generated-company-reports",
      { id },
      { responseType: "blob" }
    );

    const contentDisposition = response.headers["content-disposition"] as string | undefined;
    const utf8Match = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
    const asciiMatch = contentDisposition?.match(/filename="?([^";]+)"?/i);
    const filename = utf8Match?.[1]
      ? decodeURIComponent(utf8Match[1])
      : asciiMatch?.[1] || `seller-brief-${id}.docx`;

    return {
      blob: response.data as Blob,
      filename,
    };
  },
};

export const fetchSellerBriefDocx = (id: number) =>
  generatedCompanyReportsApi.fetchSellerBriefDocx(id);

export const downloadBlobAsFile = (blob: Blob, filename: string): void => {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
};

export const useGetGeneratedCompanyReport = (
  options: {
    id?: number;
    companyId?: number;
    reportId?: number;
  },
  queryOptions?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) => {
  const { id, companyId, reportId } = options;

  return useQuery({
    queryKey: ["generated-company-report", id, companyId, reportId],
    queryFn: () => {
      if (id) {
        return generatedCompanyReportsApi.getById(id);
      }
      if (companyId && reportId) {
        return generatedCompanyReportsApi.getLatestByCompanyAndReport(companyId, reportId);
      }
      throw new Error("id or companyId+reportId is required");
    },
    enabled:
      queryOptions?.enabled !== undefined
        ? queryOptions.enabled
        : Boolean(id || (companyId && reportId)),
    refetchInterval: queryOptions?.refetchInterval,
  });
};
