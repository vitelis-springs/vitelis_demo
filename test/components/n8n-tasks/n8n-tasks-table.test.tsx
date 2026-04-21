import { App } from "antd";
import type { ReactElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import N8NTasksTable, {
	buildCreateTaskPayload,
	CreateTaskModal,
} from "../../../src/components/n8n-tasks/n8n-tasks-table";
import { useGetDeepDiveCompanies } from "../../../src/hooks/api/useDeepDiveService";
import {
	useCreateN8NTask,
	useDeleteN8NTask,
	useGetN8NTasks,
	useStartN8NTask,
	useStopN8NTask,
} from "../../../src/hooks/api/useN8NTasksService";

jest.mock("../../../src/hooks/api/useN8NTasksService", () => ({
	useCreateN8NTask: jest.fn(),
	useDeleteN8NTask: jest.fn(),
	useGetN8NTasks: jest.fn(),
	useStartN8NTask: jest.fn(),
	useStopN8NTask: jest.fn(),
}));

jest.mock("../../../src/hooks/api/useDeepDiveService", () => ({
	useGetDeepDiveCompanies: jest.fn(),
}));

const mockUseCreateN8NTask = useCreateN8NTask as jest.Mock;
const mockUseDeleteN8NTask = useDeleteN8NTask as jest.Mock;
const mockUseGetDeepDiveCompanies = useGetDeepDiveCompanies as jest.Mock;
const mockUseGetN8NTasks = useGetN8NTasks as jest.Mock;
const mockUseStartN8NTask = useStartN8NTask as jest.Mock;
const mockUseStopN8NTask = useStopN8NTask as jest.Mock;

function flushPromises() {
	return act(async () => {
		await Promise.resolve();
	});
}

function findButton(label: string) {
	return Array.from(document.querySelectorAll("button")).find((button) =>
		button.textContent?.includes(label),
	);
}

async function clickElement(element: Element | null | undefined) {
	if (!element) {
		throw new Error("Missing clickable element");
	}

	await act(async () => {
		element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
	});
}

describe("N8N task shared shells", () => {
	const createTaskMutateAsync = jest.fn();
	let container: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		jest.clearAllMocks();
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);

		mockUseCreateN8NTask.mockReturnValue({
			mutateAsync: createTaskMutateAsync,
			isPending: false,
		});
		mockUseDeleteN8NTask.mockReturnValue({
			mutate: jest.fn(),
			isPending: false,
		});
		mockUseGetDeepDiveCompanies.mockReturnValue({
			data: {
				data: {
					companies: [
						{ id: 11, name: "Acme" },
						{ id: 22, name: "Globex" },
						{ id: 33, name: "Initech" },
					],
				},
			},
		});
		mockUseGetN8NTasks.mockReturnValue({
			data: { data: [] },
			isLoading: false,
		});
		mockUseStartN8NTask.mockReturnValue({
			mutate: jest.fn(),
			isPending: false,
		});
		mockUseStopN8NTask.mockReturnValue({
			mutate: jest.fn(),
			isPending: false,
		});
		createTaskMutateAsync.mockResolvedValue({
			success: true,
			data: {},
		});
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		document.body.innerHTML = "";
	});

	async function renderWithApp(node: ReactElement) {
		await act(async () => {
			root.render(<App>{node}</App>);
		});
		await flushPromises();
	}

	it("renders the dark table shell with the existing empty state copy", async () => {
		await renderWithApp(<N8NTasksTable reportId={7} />);

		expect(findButton("New company level report")).toBeTruthy();
		expect(document.body.textContent).toContain(
			'No tasks yet. Click "New report" to add one.',
		);
	});

	it("shows loading state through the shared table shell", async () => {
		mockUseGetN8NTasks.mockReturnValueOnce({
			data: undefined,
			isLoading: true,
		});

		await renderWithApp(<N8NTasksTable reportId={7} />);

		expect(container.querySelector(".ant-spin-spinning")).not.toBeNull();
	});

	it("keeps modal validation when submitted empty", async () => {
		await renderWithApp(
			<CreateTaskModal reportId={7} open onClose={jest.fn()} />,
		);

		await clickElement(findButton("Create"));
		await flushPromises();

		expect(document.body.textContent).toContain(
			"Select at least one competitor",
		);
		expect(
			document.querySelectorAll(".ant-form-item-explain-error").length,
		).toBeGreaterThanOrEqual(2);
		expect(createTaskMutateAsync).not.toHaveBeenCalled();
	});

	it("closes the modal through the shared shell cancel action", async () => {
		const onClose = jest.fn();
		await renderWithApp(
			<CreateTaskModal reportId={7} open onClose={onClose} />,
		);

		await clickElement(findButton("Cancel"));
		expect(onClose).toHaveBeenCalled();
	});
});

describe("buildCreateTaskPayload", () => {
	it("keeps the existing report payload shape", () => {
		expect(
			buildCreateTaskPayload(7, {
				targetCompany: 11,
				competitors: [22, 33],
			}),
		).toEqual({
			reportId: 7,
			targetCompany: 11,
			competitors: [22, 33],
			id: 7,
		});
	});
});
