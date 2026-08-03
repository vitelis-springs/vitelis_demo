"use client";

import { useMemo, useState } from "react";
import {
	useExportSalesMinerCategoryProductTagMatrixXlsx,
	useExportSalesMinerSignalCategoryStatsXlsx,
	useExportSalesMinerSignalStatsXlsx,
	useGetSalesMinerCategoryProductTagMatrix,
	useGetSalesMinerSignalCategoryStats,
	useGetSalesMinerSignalStats,
} from "../../hooks/api/useDeepDiveService";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import {
	buildCategoryColumns,
	buildColumns,
	buildProductTagMatrixColumns,
} from "./signal-stats-columns";
import {
	SignalStatsResults,
	type SignalStatsView,
} from "./signal-stats-results";

/** Static column set (no args, always the same) — computed once at module load rather than per-render. */
const CATEGORY_COLUMNS = buildCategoryColumns();

interface Props {
	reportId: number;
}

export default function SignalStatsTable({ reportId }: Props) {
	const [view, setView] = useState<SignalStatsView>("signal");

	const signalQuery = useGetSalesMinerSignalStats(reportId, view === "signal");
	// "By Product Tag" reuses the category rows as its base table, so it fetches
	// alongside "By Category" too — see buildProductTagMatrixColumns.
	const categoryQuery = useGetSalesMinerSignalCategoryStats(
		reportId,
		view === "category" || view === "productTag",
	);
	const matrixQuery = useGetSalesMinerCategoryProductTagMatrix(
		reportId,
		view === "productTag",
	);
	const { mutateAsync: exportSignalXlsx, isPending: exportSignalPending } =
		useExportSalesMinerSignalStatsXlsx();
	const { mutateAsync: exportCategoryXlsx, isPending: exportCategoryPending } =
		useExportSalesMinerSignalCategoryStatsXlsx();
	const { mutateAsync: exportMatrixXlsx, isPending: exportMatrixPending } =
		useExportSalesMinerCategoryProductTagMatrixXlsx();

	const signalRows = useMemo(
		() => signalQuery.data?.data ?? [],
		[signalQuery.data],
	);
	const categoryRows = useMemo(
		() => categoryQuery.data?.data ?? [],
		[categoryQuery.data],
	);
	const matrixCells = useMemo(
		() => matrixQuery.data?.data ?? [],
		[matrixQuery.data],
	);
	const signalColumns = useMemo(() => buildColumns(signalRows), [signalRows]);
	const productTagColumns = useMemo(
		() => [...CATEGORY_COLUMNS, ...buildProductTagMatrixColumns(matrixCells)],
		[matrixCells],
	);

	return (
		<SignalStatsResults
			view={view}
			onViewChange={setView}
			cardStyle={{ ...DARK_CARD_STYLE, marginBottom: 24 }}
			signalRows={signalRows}
			signalColumns={signalColumns}
			signalLoading={signalQuery.isLoading}
			signalExportPending={exportSignalPending}
			onExportSignal={() => {
				exportSignalXlsx(reportId).catch(() => undefined);
			}}
			categoryRows={categoryRows}
			categoryColumns={CATEGORY_COLUMNS}
			categoryLoading={categoryQuery.isLoading}
			categoryExportPending={exportCategoryPending}
			onExportCategory={() => {
				exportCategoryXlsx(reportId).catch(() => undefined);
			}}
			productTagColumns={productTagColumns}
			matrixLoading={matrixQuery.isLoading}
			matrixExportPending={exportMatrixPending}
			onExportMatrix={() => {
				exportMatrixXlsx(reportId).catch(() => undefined);
			}}
		/>
	);
}
