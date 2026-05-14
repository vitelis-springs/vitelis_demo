"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Result, Spin } from "antd";
import { useAuth } from "../../../../hooks/useAuth";
import SalesMinerGlobalSignalCatalogPage from "../../../../components/sales-miner/sales-miner-global-signal-catalog-page";

export default function SalesMinerGlobalSignalCatalogRoute() {
	const { isLoggedIn, isAdmin } = useAuth();
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => setIsLoading(false), 100);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (!isLoading && !isLoggedIn) router.push("/");
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
					extra={
						<Button type="primary" onClick={() => router.push("/sales-miner")}>
							Go to Sales Miner
						</Button>
					}
				/>
			</div>
		);
	}

	return <SalesMinerGlobalSignalCatalogPage />;
}
