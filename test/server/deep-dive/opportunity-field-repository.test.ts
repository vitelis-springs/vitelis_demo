/**
 * @jest-environment node
 */

jest.mock("../../../src/lib/prisma", () => {
	const mockExecuteRaw = jest.fn();
	const mockExecuteRawUnsafe = jest.fn();

	return {
		__esModule: true,
		default: {
			$executeRaw: mockExecuteRaw,
			$executeRawUnsafe: mockExecuteRawUnsafe,
		},
		__mockPrisma: {
			mockExecuteRaw,
			mockExecuteRawUnsafe,
		},
	};
});

import { DeepDiveRepository } from "../../../src/app/server/modules/deep-dive/deep-dive.repository";

const { __mockPrisma } = require("../../../src/lib/prisma") as {
	__mockPrisma: {
		mockExecuteRaw: jest.Mock;
		mockExecuteRawUnsafe: jest.Mock;
	};
};
const { mockExecuteRaw, mockExecuteRawUnsafe } = __mockPrisma;

describe("DeepDiveRepository opportunity field updates", () => {
	beforeEach(() => {
		mockExecuteRaw.mockResolvedValue(1);
		mockExecuteRaw.mockClear();
		mockExecuteRawUnsafe.mockResolvedValue(1);
		mockExecuteRawUnsafe.mockClear();
	});

	it("updates allowlisted base fields with a literal column and parameterized value", async () => {
		await DeepDiveRepository.updateOpportunityBaseTextField(
			172,
			2916,
			BigInt(4439),
			"primary_business_problem",
			"Updated problem",
		);

		expect(mockExecuteRawUnsafe).toHaveBeenCalledTimes(1);
		const [sql, ...params] = mockExecuteRawUnsafe.mock.calls[0] as unknown[];

		expect(sql).toContain("SET primary_business_problem = $3");
		expect(sql).not.toContain("Updated problem");
		expect(params).toEqual([172, 2916, "Updated problem", 2916, BigInt(4439)]);
	});

	it("updates deep-dive array JSON text paths with plain text-array parameters", async () => {
		await DeepDiveRepository.updateOpportunityDeepDiveJsonTextField(
			172,
			2916,
			BigInt(4439),
			"nextBestActions",
			["1", "who"],
			"Updated owner",
		);

		expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
		const [, ...values] = mockExecuteRaw.mock.calls[0] as unknown[];

		expect(values).toContainEqual(["1", "who"]);
		expect(values).not.toContainEqual(
			expect.objectContaining({ strings: expect.any(Array) }),
		);
		expect(values).not.toContainEqual(
			expect.objectContaining({ values: expect.any(Array) }),
		);
		expect(values).toContain("Updated owner");
	});
});
