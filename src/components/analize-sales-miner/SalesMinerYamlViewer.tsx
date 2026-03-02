"use client";

import { Button, Card, Layout, Space, Typography, message, Spin } from "antd";
import { DownloadOutlined, LinkOutlined, ReloadOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "../ui/sidebar";

const { Title, Text } = Typography;
const { Content } = Layout;

interface SalesMinerQuizData {
	companyName: string;
	businessLine: string;
	country: string;
	useCase: string;
	timeline: string;
	language: string;
	additionalInformation?: string;
}

interface SalesMinerYamlViewerProps {
	quizData: SalesMinerQuizData;
	yamlFileUrl?: string;
	onReset: () => void;
}

export default function SalesMinerYamlViewer({
	quizData,
	yamlFileUrl,
	onReset,
}: SalesMinerYamlViewerProps) {
	const [yamlContent, setYamlContent] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

	// Резолвим S3-ключ в presigned URL (или используем URL напрямую)
	useEffect(() => {
		if (!yamlFileUrl) { setResolvedUrl(null); return; }

		if (yamlFileUrl.startsWith('http')) {
			setResolvedUrl(yamlFileUrl);
		} else {
			fetch('/api/s3/presigned-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ key: yamlFileUrl }),
			})
				.then(res => res.json())
				.then(data => setResolvedUrl(data.presignedUrl ?? null))
				.catch(() => setResolvedUrl(null));
		}
	}, [yamlFileUrl]);

	// Fetch YAML content from URL using proxy
	const fetchYamlContent = useCallback(async () => {
		if (!resolvedUrl) {
			setError("No YAML file URL provided");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			// Use proxy route to avoid CORS issues
			const proxyUrl = `/api/yaml-proxy?url=${encodeURIComponent(resolvedUrl)}`;
			const response = await fetch(proxyUrl);
			
			if (!response.ok) {
				throw new Error(`Failed to fetch YAML file: ${response.statusText}`);
			}
			
			const content = await response.text();
			setYamlContent(content);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to load YAML file";
			setError(errorMessage);
			message.error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}, [resolvedUrl]);

	// Загружаем контент когда resolvedUrl готов
	useEffect(() => {
		if (resolvedUrl) {
			fetchYamlContent();
		}
	}, [resolvedUrl, fetchYamlContent]);

	// Download YAML file
	const handleDownload = () => {
		if (!resolvedUrl) return;

		const link = document.createElement('a');
		link.href = resolvedUrl;
		link.download = 'salesminer-config.yaml';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		message.success('YAML file download started');
	};

	// Open YAML file in new tab
	const handleOpenInNewTab = () => {
		if (!resolvedUrl) return;
		window.open(resolvedUrl, '_blank');
	};

	// Format YAML content for display
	const formatYamlContent = (content: string) => {
		const lines = content.split('\n');
		return lines.map((line, index) => {
			// Determine indentation level
			const indentMatch = line.match(/^(\s*)/);
			const indent = indentMatch ? indentMatch[1] : '';
			const indentLevel = indent.length;
			
			// Determine if it's a key, value, or comment
			const isComment = line.trim().startsWith('#');
			const isKey = line.includes(':') && !isComment;
			const isListItem = line.trim().startsWith('-');
			
			return (
				<div
					key={index}
					style={{
						display: 'flex',
						fontFamily: 'monospace',
						fontSize: '14px',
						lineHeight: '1.6',
						marginBottom: '2px',
						paddingLeft: `${indentLevel * 2}px`,
					}}
				>
					<span style={{ color: '#8c8c8c', marginRight: '8px', minWidth: '40px' }}>
						{index + 1}
					</span>
					<pre
						style={{
							margin: 0,
							color: isComment 
								? '#8c8c8c' 
								: isKey 
									? '#58bfce' 
									: isListItem 
										? '#52c41a' 
										: '#d9d9d9',
							fontWeight: isKey ? '600' : 'normal',
						}}
					>
						{line}
					</pre>
				</div>
			);
		});
	};

	return (
		<Layout style={{ minHeight: "100vh", background: "#141414" }}>
			<Sidebar />
			<Layout style={{ marginLeft: 280, background: "#141414" }}>
				<Content
					style={{
						padding: "24px",
						background: "#141414",
						minHeight: "100vh",
						display: "flex",
						flexDirection: "column",
					}}
				>
					<div style={{ width: "100%" }}>
						<Card
							style={{
								background: "#1f1f1f",
								border: "1px solid #303030",
								borderRadius: "12px",
							}}
						>
							{/* Header */}
							<div style={{ textAlign: "center", marginBottom: "32px" }}>
								<Title
									level={2}
									style={{ color: "#52c41a", marginBottom: "8px" }}
								>
									SalesMiner Report
								</Title>
								<Text style={{ color: "#8c8c8c" }}>
									Your comprehensive sales analysis report is ready
								</Text>
							</div>

							{/* Quiz Data Summary */}
							<Card
								style={{
									background: "#262626",
									border: "1px solid #434343",
									borderRadius: "8px",
									marginBottom: "32px",
								}}
								styles={{ body: { padding: "20px" } }}
							>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "flex-start",
										marginBottom: "16px",
										padding: "relative",
									}}
								>
									<Title level={4} style={{ color: "#52c41a", margin: 0 }}>
										SalesMiner Analysis Parameters
									</Title>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											position: "absolute",
											right: "65px",
											top: "75px",
										}}
									>
										<CheckCircleOutlined
											style={{
												color: "#52c41a",
												marginRight: "12px",
												fontSize: "32px",
											}}
										/>
										<span
											style={{
												color: "#52c41a",
												fontSize: "24px",
												fontWeight: "600",
											}}
										>
											Sources verified
										</span>
									</div>
								</div>
								<div style={{ color: "#d9d9d9" }}>
									<p>
										<strong>Company:</strong> {quizData.companyName}
									</p>
									<p>
										<strong>Business Line:</strong> {quizData.businessLine}
									</p>
									<p>
										<strong>Country:</strong> {quizData.country}
									</p>
									<p>
										<strong>Use Case:</strong> {quizData.useCase}
									</p>
									<p>
										<strong>Timeline:</strong> {quizData.timeline}
									</p>
									<p>
										<strong>Language:</strong> {quizData.language}
									</p>
									{quizData.additionalInformation && (
										<p>
											<strong>Additional Information:</strong>{" "}
											{quizData.additionalInformation}
										</p>
									)}
								</div>
							</Card>

							{/* YAML File Info */}
							{resolvedUrl && (
								<Card
									style={{
										background: "#262626",
										border: "1px solid #434343",
										borderRadius: "8px",
										marginBottom: "24px",
									}}
									styles={{ body: { padding: "20px" } }}
								>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
										<div>
											<Title level={4} style={{ color: "#52c41a", margin: 0 }}>
												YAML File Information
											</Title>
											<Text style={{ color: "#8c8c8c", fontSize: "12px" }}>
												File key: {yamlFileUrl}
											</Text>
										</div>
										<Space>
											<Button
												icon={<ReloadOutlined />}
												onClick={fetchYamlContent}
												loading={isLoading}
												style={{
													background: "#1f1f1f",
													border: "1px solid #434343",
													color: "#d9d9d9",
												}}
											>
												Refresh
											</Button>
											<Button
												icon={<LinkOutlined />}
												onClick={handleOpenInNewTab}
												style={{
													background: "#1f1f1f",
													border: "1px solid #434343",
													color: "#d9d9d9",
												}}
											>
												Open in New Tab
											</Button>
											<Button
												icon={<DownloadOutlined />}
												onClick={handleDownload}
												type="primary"
												style={{
													background: "#52c41a",
													border: "1px solid #52c41a",
												}}
											>
												Download
											</Button>
										</Space>
									</div>
								</Card>
							)}

							{/* YAML Content */}
							<Card
								style={{
									background: "#262626",
									border: "1px solid #434343",
									borderRadius: "8px",
									marginBottom: "32px",
								}}
								styles={{ body: { padding: "0" } }}
							>
								<div
									style={{
										padding: "16px 24px",
										borderBottom: "1px solid #434343",
										background: "#1f1f1f",
									}}
								>
									<Title level={4} style={{ color: "#52c41a", margin: 0 }}>
										YAML Content
									</Title>
								</div>
								
								<div style={{ padding: "24px", maxHeight: "600px", overflowY: "auto" }}>
									{isLoading ? (
										<div style={{ textAlign: "center", padding: "40px" }}>
											<Spin size="large" />
											<div style={{ color: "#8c8c8c", marginTop: "16px" }}>
												Loading YAML content...
											</div>
										</div>
									) : error ? (
										<div style={{ textAlign: "center", padding: "40px" }}>
											<Text style={{ color: "#ff4d4f" }}>
												Error: {error}
											</Text>
											<br />
											<Button
												onClick={fetchYamlContent}
												style={{
													marginTop: "16px",
													background: "#1f1f1f",
													border: "1px solid #434343",
													color: "#d9d9d9",
												}}
											>
												Retry
											</Button>
										</div>
									) : yamlContent ? (
										<div
											style={{
												background: "#1f1f1f",
												border: "1px solid #303030",
												borderRadius: "8px",
												padding: "16px",
												overflowX: "auto",
											}}
										>
											{formatYamlContent(yamlContent)}
										</div>
									) : (
										<div style={{ textAlign: "center", padding: "40px" }}>
											<Text style={{ color: "#8c8c8c" }}>
												No YAML file available
											</Text>
										</div>
									)}
								</div>
							</Card>

							{/* Action Buttons */}
							<div style={{ textAlign: "center" }}>
								<Space>
									<Button
										size="large"
										onClick={onReset}
										style={{
											background: "#1f1f1f",
											border: "1px solid #434343",
											color: "#d9d9d9",
											borderRadius: "8px",
											height: "48px",
											padding: "0 24px",
										}}
									>
										Start New SalesMiner Analysis
									</Button>
								</Space>
							</div>
						</Card>
					</div>
				</Content>
			</Layout>
		</Layout>
	);
}
