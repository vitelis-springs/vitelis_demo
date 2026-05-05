import SalesMinerCustomerDetailPage from "../../../../../components/sales-miner/sales-miner-customer-detail-page";

export default async function Page({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <SalesMinerCustomerDetailPage customerId={id} />;
}
