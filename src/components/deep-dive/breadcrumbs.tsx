import { Breadcrumb } from "antd";
import Link from "next/link";
import type { CSSProperties } from "react";

export interface BreadcrumbItem {
	label: string;
	href?: string;
}

const crumbTextStyle: CSSProperties = {
	display: "inline-block",
	maxWidth: "min(28vw, 260px)",
	overflow: "hidden",
	textOverflow: "ellipsis",
	verticalAlign: "bottom",
	whiteSpace: "nowrap",
};

const currentCrumbTextStyle: CSSProperties = {
	...crumbTextStyle,
	maxWidth: "min(42vw, 360px)",
};

export default function DeepDiveBreadcrumbs({
	items,
}: {
	items: BreadcrumbItem[];
}) {
	return (
		<Breadcrumb
			style={{ marginBottom: 8 }}
			items={items.map((item, index) => {
				const isLast = index === items.length - 1;
				const style = isLast ? currentCrumbTextStyle : crumbTextStyle;

				return {
					title:
						item.href && !isLast ? (
							<Link
								href={item.href}
								style={{ ...style, color: "#58bfce" }}
								title={item.label}
							>
								{item.label}
							</Link>
						) : (
							<span style={{ ...style, color: "#8c8c8c" }} title={item.label}>
								{item.label}
							</span>
						),
				};
			})}
		/>
	);
}
