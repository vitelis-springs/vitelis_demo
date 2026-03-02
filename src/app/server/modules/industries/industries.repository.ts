import type { industries } from "../../../../generated/prisma";
import prisma from "../../../../lib/prisma";

export class IndustriesRepository {
  static async findAll(): Promise<industries[]> {
    return prisma.industries.findMany({
      orderBy: { name: "asc" },
    });
  }

  static async upsertByName(name: string): Promise<industries> {
    const trimmed = name.trim();
    return prisma.industries.upsert({
      where: { name: trimmed },
      update: {},
      create: { name: trimmed },
    });
  }
}

