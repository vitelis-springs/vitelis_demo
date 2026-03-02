import type { industries } from "../../../../generated/prisma";
import { IndustriesRepository } from "./industries.repository";

export class IndustriesService {
  static async listIndustries(): Promise<industries[]> {
    return IndustriesRepository.findAll();
  }

  static async createIndustry(name: string): Promise<industries> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("Industry name must not be empty");
    }
    return IndustriesRepository.upsertByName(trimmed);
  }
}

