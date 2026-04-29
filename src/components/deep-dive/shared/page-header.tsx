"use client";

import { Space, Typography } from "antd";
import DeepDiveBreadcrumbs from "../breadcrumbs";

const { Title } = Typography;

interface BreadcrumbItem {
	label: string;
	href?: string;
}

interface PageHeaderProps {
	breadcrumbs: BreadcrumbItem[];
	title: string;
	extra?: React.ReactNode;
}

export default function PageHeader({
	breadcrumbs,
	title,
	extra,
}: PageHeaderProps) {
	return (
		<div style={{ marginBottom: 24 }}>
			<DeepDiveBreadcrumbs items={breadcrumbs} />
			<Space align="center" size="middle" style={{ marginTop: 4 }}>
				<Title level={2} style={{ margin: 0, color: "#58bfce" }}>
					{title}
				</Title>
				{extra}
			</Space>
		</div>
	);
}
