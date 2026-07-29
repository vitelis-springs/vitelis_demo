import type { GicsCodeRow } from "../hooks/api/useSalesMinerSignalCatalogService";

export interface GicsTreeNode {
	title: string;
	value: string;
	children: GicsTreeNode[];
}

export function buildGicsTree(items: GicsCodeRow[]): GicsTreeNode[] {
	const map = new Map<string, GicsTreeNode>();
	for (const item of items) {
		map.set(item.code, {
			title: `${item.code} — ${item.name}`,
			value: item.code,
			children: [],
		});
	}
	const roots: GicsTreeNode[] = [];
	for (const item of items) {
		const node = map.get(item.code)!;
		if (item.parent_code && map.has(item.parent_code)) {
			map.get(item.parent_code)!.children.push(node);
		} else {
			roots.push(node);
		}
	}
	return roots;
}
