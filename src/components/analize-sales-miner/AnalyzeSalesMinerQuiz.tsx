"use client";

import { App, Button, Card, Form, Input, Select, Spin, Typography, Space } from "antd";
import React, { useState, useEffect } from "react";
const { TextArea } = Input;
import { SendOutlined, PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { useSalesMinerAnalyzeService, useGetSalesMinerAnalyze } from "@hooks/api/useSalesMinerAnalyzeService";
import { useSalesMinerWorkflow } from "@hooks/api/useN8NService";
import { Layout } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import SalesMinerAnalyzeResult from "./SalesMinerAnalyzeResult";
import SalesMinerAnimation from "./SalesMinerAnimation";
import SalesMinerExtendedAnalyzeResult from "./SalesMinerExtendedAnalyzeResult";
import SalesMinerYamlViewer from "./SalesMinerYamlViewer";
import Sidebar from "../ui/sidebar";

const { Title, Text } = Typography;
const { Option } = Select;
const { Content } = Layout;

interface Competitor {
	name: string;
	url: string;
}

interface AnalyzeSalesMinerQuizData {
	companyName: string;
	businessLine: string;
	country: string;
	useCase: string;
	timeline: string;
	language: string;
	additionalInformation?: string;
	competitors?: Competitor[];
}

interface AnalyzeSalesMinerQuizProps {
	onComplete?: (data: AnalyzeSalesMinerQuizData) => void;
}

const getFormFields = () => [
	{
		name: "companyName",
		label: "Company Name",
		type: "input",
		placeholder: "e.g., Tesla, Apple, Microsoft...",
		required: true,
	},
	{
		name: "businessLine",
		label: "Business Line / Industry",
		type: "input",
		placeholder: "e.g., Automotive, Technology, Healthcare...",
		required: true,
	},
	{
		name: "country",
		label: "Country",
		type: "input",
		placeholder: "e.g., US, Germany, Japan...",
		required: true,
	},
	{
		name: "useCase",
		label: "Use Case / Analysis Area",
		type: "select",
		placeholder: "Select a use case...",
		options: ["Qualtrics"],
		required: true,
	},
	{
		name: "timeline",
		label: "Timeline",
		type: "input",
		placeholder: "e.g., Q1 2025, Q1 2024 - Q3 2025...",
		required: true,
	},
	{
		name: "language",
		label: "Language",
		type: "select",
		placeholder: "Select language...",
		options: ["English", "German"],
		required: true,
	},
	{
		name: "additionalInformation",
		label: "Additional Information",
		type: "textarea",
		placeholder:
			"Any additional context or specific requirements for the analysis...",
		required: false,
	},
	{
		name: "competitors",
		label: "Competitors",
		type: "competitors",
		placeholder: "Add competitor information",
		required: false,
	},
];

export default function AnalyzeSalesMinerQuiz({
	onComplete: _onComplete,
}: AnalyzeSalesMinerQuizProps) {
	const { notification: appNotification } = App.useApp();
	const [form] = Form.useForm();
	const [loading, setLoading] = useState(false);
	const [showResults, setShowResults] = useState(false);

	const [analyzeId, setAnalyzeId] = useState<string | null>(null);
	const [isLoadingProgress, setIsLoadingProgress] = useState(true);
	const [executionId, setExecutionId] = useState("");
	const [quizData, setQuizData] = useState<AnalyzeSalesMinerQuizData>({
		companyName: "",
		businessLine: "",
		country: "",
		useCase: "Qualtrics",
		timeline: "",
		language: "",
		additionalInformation: "",
		competitors: [],
	});

	const router = useRouter();
	const searchParams = useSearchParams();
	const isTest = true;

	const { mutateAsync, isPending } = useSalesMinerWorkflow();
	const { createSalesMinerAnalyze, updateSalesMinerAnalyze } = useSalesMinerAnalyzeService();
	const { data: analyzeData, isLoading: isLoadingAnalyze } = useGetSalesMinerAnalyze(
		analyzeId,
		{
			refetchInterval: 5000, // Poll every 5 seconds
			enabled: !!analyzeId,
		},
	);

	// Load progress from URL
	useEffect(() => {
		const urlAnalyzeId = searchParams.get("analyzeId");
		if (urlAnalyzeId) {
			setAnalyzeId(urlAnalyzeId);
		} else {
			setAnalyzeId(null);
			setShowResults(false);
			setExecutionId("");
			setQuizData({
				companyName: "",
				businessLine: "",
				country: "",
				useCase: "Qualtrics",
				timeline: "",
				language: "",
				additionalInformation: "",
				competitors: [],
			});
			form.resetFields();
		}
		setIsLoadingProgress(false);
	}, [searchParams, form]);

	// Handle analyze data
	useEffect(() => {
		if (analyzeData) {
			console.log("📊 Component: Analyze data loaded:", analyzeData);

			// Set quiz data from analyze data
			setQuizData({
				companyName: analyzeData.companyName || "",
				businessLine: analyzeData.businessLine || "",
				country: analyzeData.country || "",
				useCase: analyzeData.useCase || "Qualtrics",
				timeline: analyzeData.timeline || "",
				language: analyzeData.language || "",
				additionalInformation: analyzeData.additionalInformation || "",
				competitors: analyzeData.competitors || [],
			});
//fdefefewvwevwevwevwevwevwev
			// Check if status is error or canceled - show quiz form with error
			if (analyzeData.status === "error" || analyzeData.status === "canceled") {
				console.log(
					"❌ Component: Analysis failed with status:",
					analyzeData.status,
				);
				setShowResults(false);
				showNotification(
					"error",
					"Analysis Failed",
					`The analysis was ${analyzeData.status}. Please try again.`,
				);
				return;
			}

			// Check if status is finished - show results (regardless of resultText or other fields)
			if (analyzeData.status === "finished") {
				console.log("📋 Component: Analysis completed, showing results");
				setExecutionId(""); // Clear executionId when showing results
				setShowResults(true);
				return;
			}

			// Check if we have executionId and status is not finished - show animation
			if (
				analyzeData.executionId &&
				analyzeData.status &&
				(analyzeData.status === "progress" ||
					analyzeData.status === "error" ||
					analyzeData.status === "canceled")
			) {
				console.log("🎬 Component: Found executionId, showing animation");
				setExecutionId(analyzeData.executionId);
				setShowResults(false);
				return;
			}

			// Default: show quiz form
			console.log("📝 Component: Loading quiz progress");
			setShowResults(false);
		}
	}, [analyzeData]);

	const showNotification = (
		type: "error" | "warning" | "info" | "success",
		title: string,
		message: string,
	) => {
		appNotification[type]({
			message: title,
			description: message,
			duration: type === "error" ? 8 : 4,
			placement: "topRight",
		});
	};

	const createNewAnalyzeRecord = async (
		data: Partial<AnalyzeSalesMinerQuizData>,
	): Promise<string | null> => {
		try {
			const newAnalyzeData = {
				companyName: data.companyName || "",
				businessLine: data.businessLine || "",
				country: data.country || "",
				useCase: "SalesMiner",
				timeline: data.timeline || "",
				language: data.language || "",
				additionalInformation: data.additionalInformation || "",
				competitors: data.competitors || [],
				status: "progress" as const,
			};

			const result = await createSalesMinerAnalyze.mutateAsync(newAnalyzeData);
			if (result) {
				const newAnalyzeId = result._id as string;
				setAnalyzeId(newAnalyzeId);
				const newUrl = new URL(window.location.href);
				newUrl.searchParams.set("analyzeId", newAnalyzeId);
				router.replace(newUrl.pathname + newUrl.search, { scroll: false });
				return newAnalyzeId;
			}
			return null;
		} catch (error) {
			showNotification(
				"error",
				"Failed to Create Analysis Record",
				"Unable to create a new analysis record.",
			);
			return null;
		}
	};

	const saveProgress = async (
		data: Partial<AnalyzeSalesMinerQuizData>,
		status: "progress" | "finished" = "progress",
	) => {
		try {
			if (!analyzeId) return;
			const updateData = {
				id: analyzeId,
				companyName: data.companyName || "",
				businessLine: data.businessLine || "",
				country: data.country || "",
				useCase: "SalesMiner",
				timeline: data.timeline || "",
				language: data.language || "",
				additionalInformation: data.additionalInformation || "",
				competitors: data.competitors || [],
				status,
			};
			await updateSalesMinerAnalyze.mutateAsync(updateData);
		} catch (error) {
			showNotification(
				"warning",
				"Failed to Save Progress",
				"Unable to save your progress.",
			);
		}
	};

	const handleFormSubmit = async () => {
		try {
			const values = await form.validateFields();

			const updatedQuizData = { ...quizData, ...values };
			setQuizData(updatedQuizData);

			let currentAnalyzeId = analyzeId;
			if (!currentAnalyzeId) {
				const newAnalyzeId = await createNewAnalyzeRecord(updatedQuizData);
				currentAnalyzeId = newAnalyzeId;
			}

			await handleWorkflowSubmit(values, currentAnalyzeId);
		} catch (error) {
			console.error("Validation failed:", error);
		}
	};

	const handleWorkflowSubmit = async (
		values: AnalyzeSalesMinerQuizData,
		analyzeIdToUse?: string | null,
	) => {
		setLoading(true);
		try {
			const completeData = { ...quizData, ...values };
			// Add the useCase field for SalesMiner
			const salesMinerData = { ...completeData, useCase: "SalesMiner" };
			console.log("🚀 Starting N8N workflow with SalesMiner data:", salesMinerData);
			console.log("🏢 Competitors data being sent to N8N:", salesMinerData.competitors);

			const result = await mutateAsync({ data: salesMinerData, isTest });
			console.log("✅ N8N workflow result:", result);

			if (result && result.success !== false && result.executionId) {
				setExecutionId(result.executionId.toString());
				const currentAnalyzeId = analyzeIdToUse || analyzeId;
				if (currentAnalyzeId) {
					console.log("🔄 Component: About to call updateAnalyze with:", {
						id: currentAnalyzeId,
						executionId: result.executionId.toString(),
						executionStatus: "started",
					});

					const updatedAnalyze = await updateSalesMinerAnalyze.mutateAsync({
						id: currentAnalyzeId,
						executionId: result.executionId.toString(),
						executionStatus: "started",
						companyName: completeData.companyName,
						businessLine: completeData.businessLine,
						country: completeData.country,
						useCase: "Qualtrics",
						timeline: completeData.timeline,
						language: completeData.language,
						additionalInformation: completeData.additionalInformation,
						competitors: completeData.competitors,
					});

					console.log("✅ Component: updateAnalyze completed:", updatedAnalyze);
				}
				await saveProgress(completeData, "finished");
				setQuizData(completeData);
				showNotification(
					"success",
					"Success",
					"SalesMiner analysis request submitted successfully!",
				);
			} else {
				await saveProgress(completeData, "progress");
				showNotification(
					"error",
					"N8N Workflow Failed",
					"The SalesMiner analysis workflow did not complete successfully.",
				);
			}
		} catch (error) {
			console.error("❌ N8N workflow error:", error);
			console.error("❌ Error details:", {
				message: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
				name: error instanceof Error ? error.name : undefined,
			});

			showNotification(
				"error",
				"N8N Workflow Execution Failed",
				"Unable to start the SalesMiner analysis workflow.",
			);
		} finally {
			setLoading(false);
		}
	};

	const handleReset = () => {
		form.resetFields();
		setShowResults(false);
		setExecutionId("");
		setAnalyzeId(null);
		setQuizData({
			companyName: "",
			businessLine: "",
			country: "",
			useCase: "Qualtrics",
			timeline: "",
			language: "",
			additionalInformation: "",
			competitors: [],
		});
		const newUrl = new URL(window.location.href);
		newUrl.searchParams.delete("analyzeId");
		router.replace(newUrl.pathname + newUrl.search, { scroll: false });
	};

	const handleAnimationComplete = () => {
		setExecutionId("");
		setShowResults(true);
	};

	if (isLoadingProgress || (analyzeId && isLoadingAnalyze)) {
		return (
			<div
				style={{
					padding: "24px",
					background: "#141414",
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
					<div style={{ textAlign: "center" }}>
						<Spin size="large" style={{ marginBottom: "16px" }} />
						<Title level={3} style={{ color: "#d9d9d9" }}>
							Loading your SalesMiner progress...
						</Title>
					</div>
				</Card>
			</div>
		);
	}

	if (executionId) {
		return (
			<SalesMinerAnimation
				title="SalesMiner Analysis in Progress"
				description="Your sales analysis is being processed. This may take a few minutes."
				executionId={executionId}
				companyName={quizData.companyName}
				executionStep={analyzeData?.executionStep}
				analyzeId={analyzeId || undefined}
				analyzeData={analyzeData}
				onComplete={handleAnimationComplete}
			/>
		);
	}

	if (showResults) {
		// Check if analyze data has yamlFile - use SalesMinerYamlViewer
		if (analyzeData?.yamlFile) {
			return (
				<SalesMinerYamlViewer
					quizData={quizData}
					yamlFileUrl={analyzeData.yamlFile}
					onReset={handleReset}
				/>
			);
		}

		// Check if analyze data has summary field - use SalesMinerExtendedAnalyzeResult
		if (analyzeData?.summary) {
			return (
				<SalesMinerExtendedAnalyzeResult
					quizData={quizData}
					summary={analyzeData.summary}
					improvementLeverages={analyzeData.improvementLeverages}
					headToHead={analyzeData.headToHead}
					sources={analyzeData.sources}
					onReset={handleReset}
				/>
			);
		}

		// Fallback to SalesMinerAnalyzeResult for backward compatibility
		return (
			<SalesMinerAnalyzeResult
				quizData={quizData}
				resultText={analyzeData?.resultText}
				onReset={handleReset}
			/>
		);
	}

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
									style={{ color: "#58bfce", marginBottom: "8px" }}
								>
									SalesMiner Analysis Request
								</Title>
								<Text style={{ color: "#8c8c8c" }}>
									Complete sales analysis request form for competitive intelligence
								</Text>
							</div>

							{/* Form */}
							<Card
								style={{
									background: "#262626",
									border: "1px solid #434343",
									borderRadius: "8px",
									marginBottom: "32px",
								}}
								styles={{ body: { padding: "32px" } }}
							>
								<Form
									form={form}
									layout="vertical"
									initialValues={{ ...quizData, useCase: "Qualtrics", competitors: quizData.competitors || [] }}
									style={{ width: "100%" }}
								>
									{getFormFields().map((field) => (
										<Form.Item
											key={field.name}
											name={field.name}
											label={
												<Text
													style={{
														color: "#d9d9d9",
														fontSize: "16px",
														fontWeight: "500",
													}}
												>
													{field.label}
												</Text>
											}
											rules={[
												{
													required: field.required,
													message: "This field is required",
												},
											]}
											style={{ marginBottom: "24px" }}
										>
											{field.type === "input" ? (
												<Input
													placeholder={field.placeholder}
													size="large"
													style={{
														background: "#1f1f1f",
														border: "1px solid #434343",
														borderRadius: "8px",
														color: "#d9d9d9",
														fontSize: "16px",
														padding: "12px 16px",
														height: "48px",
													}}
												/>  
											) : field.type === "textarea" ? (
												<TextArea
													placeholder={field.placeholder}
													size="large"
													rows={4}
													style={{
														background: "#1f1f1f",
														border: "1px solid #434343",
														borderRadius: "8px",
														color: "#d9d9d9",
														fontSize: "16px",
														padding: "12px 16px",
														resize: "vertical",
													}}
												/>
											) : field.type === "select" ? (
												<Select
													placeholder={field.placeholder}
													size="large"
													style={{
														background: "#1f1f1f",
														border: "1px solid #434343",
														borderRadius: "8px",
														height: "48px",
														width: "100%",
													}}
													styles={{
														popup: {
															root: {
																background: "#1f1f1f",
																border: "1px solid #434343",
															},
														},
													}}
												>
													{field.options?.map((option) => (
														<Option key={option} value={option}>
															<Text style={{ color: "#d9d9d9" }}>{option}</Text>
														</Option>
													))}
												</Select>
											) : field.type === "competitors" ? (
												<Form.List name="competitors">
													{(fields, { add, remove }) => (
														<div>
															{fields.map(({ key, name, ...restField }) => (
																<Space
																	key={key}
																	style={{ display: 'flex', marginBottom: 8, width: '100%' }}
																	align="baseline"
																>
																	<Form.Item
																		{...restField}
																		name={[name, 'name']}
																		rules={[{ required: true, message: 'Missing competitor name' }]}
																		style={{ flex: 1, marginBottom: 0 }}
																	>
																		<Input
																			placeholder="Competitor name"
																			size="large"
																			style={{
																				width: "100%",
																				background: "#1f1f1f",
																				border: "1px solid #434343",
																				borderRadius: "8px",
																				color: "#d9d9d9",
																				fontSize: "16px",
																				padding: "12px 16px",
																				height: "48px",
																			}}
																		/>
																	</Form.Item>
																	<Form.Item
																		{...restField}
																		name={[name, 'url']}
																		rules={[{ required: true, message: 'Missing competitor URL' }]}
																		style={{ flex: 1, marginBottom: 0 }}
																	>
																		<Input
																			placeholder="Competitor URL"
																			size="large"
																			style={{
																				width: "100%",
																				background: "#1f1f1f",
																				border: "1px solid #434343",
																				borderRadius: "8px",
																				color: "#d9d9d9",
																				fontSize: "16px",
																				padding: "12px 16px",
																				height: "48px",
																			}}
																		/>
																	</Form.Item>
																	<MinusCircleOutlined
																		onClick={() => remove(name)}
																		style={{ color: "#ff4d4f", fontSize: "18px" }}
																	/>
																</Space>
															))}
															<Form.Item>
																<Button
																	type="dashed"
																	onClick={() => add()}
																	block
																	icon={<PlusOutlined />}
																	size="large"
																	style={{
																		background: "#1f1f1f",
																		border: "1px dashed #434343",
																		borderRadius: "8px",
																		color: "#d9d9d9",
																		height: "48px",
																	}}
																>
																	Add Competitor
																</Button>
															</Form.Item>
														</div>
													)}
												</Form.List>
											) : null}
										</Form.Item>
									))}
								</Form>
							</Card>

							{/* Action Buttons */}
							<div
								style={{
									display: "flex",
									justifyContent: "center",
									alignItems: "center",
									gap: "16px",
									marginTop: "24px",
								}}
							>
								<Button
									size="large"
									onClick={handleReset}
									style={{
										background: "#1f1f1f",
										border: "1px solid #434343",
										color: "#d9d9d9",
										borderRadius: "8px",
										height: "48px",
										padding: "0 24px",
									}}
								>
									Reset
								</Button>

								<Button
									type="primary"
									size="large"
									onClick={handleFormSubmit}
									loading={
										loading ||
										isPending ||
										createSalesMinerAnalyze.isPending ||
										updateSalesMinerAnalyze.isPending
									}
									icon={<SendOutlined />}
									style={{
										background: "#58bfce",
										border: "1px solid #58bfce",
										borderRadius: "8px",
										height: "48px",
										padding: "0 24px",
									}}
								>
									Generate SalesMiner Analysis
								</Button>
							</div>
						</Card>
					</div>
				</Content>
			</Layout>
		</Layout>
	);
}