import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DarkTableCard } from "../../../src/components/shared/table";

describe("DarkTableCard", () => {
	let container: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
	});

	it("renders a shared dark card wrapper around a table", async () => {
		await act(async () => {
			root.render(
				<DarkTableCard
					cardProps={{ title: "Shared Table" }}
					columns={[
						{
							title: "Name",
							dataIndex: "name",
							key: "name",
						},
					]}
					dataSource={[{ id: 1, name: "Acme" }]}
					rowKey="id"
				/>,
			);
		});

		expect(container.textContent).toContain("Shared Table");
		expect(container.querySelector("table")).not.toBeNull();
		expect(container.textContent).toContain("Acme");
	});
});
