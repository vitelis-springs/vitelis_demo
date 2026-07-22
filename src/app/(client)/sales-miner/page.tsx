"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppstoreOutlined } from "@ant-design/icons";
import { Button, Result, Spin, Tabs } from "antd";
import { useAuth } from "../../../hooks/useAuth";
import DeepDiveList from "../../../components/deep-dive/deep-dive-list";
import { SalesMinerCustomersEmbedded } from "../../../components/sales-miner/sales-miner-customers-page";
import DeepDivePageLayout from "../../../components/deep-dive/shared/page-layout";
import PageHeader from "../../../components/deep-dive/shared/page-header";

const VALID_TABS = ["customers", "reports"] as const;
type SalesMinerTab = (typeof VALID_TABS)[number];

export default function SalesMinerPage() {
	const { isLoggedIn, isAdmin } = useAuth();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isLoading, setIsLoading] = useState(true);

	const tabParam = searchParams.get("tab");
	const activeTab: SalesMinerTab =
		tabParam && (VALID_TABS as readonly string[]).includes(tabParam)
			? (tabParam as SalesMinerTab)
			: "customers";

	const handleTabChange = (key: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("tab", key);
		router.replace(`${pathname}?${params.toString()}`);
	};

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 100);

		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (!isLoading && !isLoggedIn) {
			router.push("/");
		}
	}, [isLoggedIn, router, isLoading]);

	if (isLoading) {
		return (
			<div
				style={{
					minHeight: "100vh",
					background: "#141414",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Spin size="large" />
			</div>
		);
	}

	if (!isLoggedIn) return null;

	if (!isAdmin()) {
		return (
			<div
				style={{
					minHeight: "100vh",
					background: "#141414",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Result
					status="403"
					title="Admin access required"
					subTitle="You do not have permission to view this page."
					extra={
						<Button type="primary" onClick={() => router.push("/history")}>
							Go to My Reports
						</Button>
					}
				/>
			</div>
		);
	}

	return (
		<DeepDivePageLayout>
			<PageHeader
				breadcrumbs={[]}
				title="Sales Miner"
				extra={
					<Button
						icon={<AppstoreOutlined />}
						onClick={() => router.push("/sales-miner/signal-catalog")}
					>
						Signal Catalog
					</Button>
				}
			/>
			<Tabs
				activeKey={activeTab}
				onChange={handleTabChange}
				items={[
					{
						key: "customers",
						label: "Customers",
						children: <SalesMinerCustomersEmbedded />,
					},
					{
						key: "reports",
						label: "Reports",
						children: <DeepDiveList fixedReportType="sales_miner" embedded />,
					},
				]}
			/>
		</DeepDivePageLayout>
	);
}
