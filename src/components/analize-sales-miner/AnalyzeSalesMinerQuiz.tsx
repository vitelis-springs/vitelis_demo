"use client";

import { MinusCircleOutlined, PlusOutlined, SendOutlined } from "@ant-design/icons";
import { useSalesMinerWorkflow } from "@hooks/api/useN8NService";
import { useGetSalesMinerAnalyze, useSalesMinerAnalyzeService } from "@hooks/api/useSalesMinerAnalyzeService";
import { useGetUserCredits } from "@hooks/api/useUsersService";
import { App, Button, Card, Form, Input, Layout, Select, Space, Spin, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "../ui/sidebar";
import SalesMinerAnalyzeResult from "./SalesMinerAnalyzeResult";
import SalesMinerAnimation from "./SalesMinerAnimation";
import SalesMinerExtendedAnalyzeResult from "./SalesMinerExtendedAnalyzeResult";
import SalesMinerYamlViewer from "./SalesMinerYamlViewer";
import CreditsDisplay from "../ui/credits-display";
import { CreditsService } from "../../lib/creditsService";
const { TextArea } = Input;

const { Title, Text } = Typography;
const { Option } = Select;
const { Content } = Layout;

interface Competitor {
	name: string;
	url: string;
}

interface AnalyzeSalesMinerQuizData {
	companyName: string;
	url: string;
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
    rules: [
			{ required: true, message: "Company name is required" },
			{ min: 2, message: "Company name must contain at least 2 characters" },
			{ max: 100, message: "Company name cannot exceed 100 characters" },
			{ pattern: /^[a-zA-Z0-9\s\-&.,()]+$/, message: "Company name can only contain letters, numbers, spaces and symbols -&.,()" }
		]
	},
  {
    name:"url",
    label: "Company Official Website",
    type: "input",
    placeholder: "e.g., https://www.tesla.com, https://www.apple.com, https://www.microsoft.com...",
    required: true,  
    rules: [
			{ required: true, message: "Company website URL is required" },
			{ 
				pattern: /^https?:\/\/(www\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(\.[a-zA-Z]{2,})(\/.*)?$/,
				message: "Please enter a valid URL (e.g., https://www.example.com)"
			}
		]
  },
	{
		name: "businessLine",
		label: "Business Line / Industry",
		type: "input",
		placeholder: "e.g., Automotive, Technology, Healthcare...",
		required: true,
    rules: [
			{ required: true, message: "Business line is required" },
			{ min: 2, message: "Business line must contain at least 2 characters" },
			{ max: 100, message: "Business line cannot exceed 100 characters" },
			{ pattern: /^[a-zA-Zа-яА-Я0-9\s\-&.,()]+$/, message: "Business line can only contain letters, numbers, spaces and symbols -&.,()" }
		]
	},
	{
		name: "country",
		label: "Country",
		type: "input",
		placeholder: "e.g., US, Germany, Japan...",
		required: true,
    rules: [
			{ required: true, message: "Country is required" },
			{ min: 2, message: "Country name must contain at least 2 characters" },
			{ max: 50, message: "Country name cannot exceed 50 characters" },
			{ pattern: /^[a-zA-Zа-яА-Я\s\-()]+$/, message: "Country name can only contain letters, spaces and symbols -()" }
		]
	},
	{
		name: "useCase",
		label: "Use Case / Analysis Area",
		type: "select",
		placeholder: "Select a use case...",
		options: ["Qualtrics" ,"ON24","Equinix"],
		required: true,
    rules: [
			{ required: true, message: "Analysis area is required" }
		]
	},
	{
		name: "timeline",
		label: "Timeline",
		type: "input",
		placeholder: "e.g., Q1 2025, Q1 2024 - Q3 2025...",
		required: true,
    rules: [
			{ required: true, message: "Timeline is required" },
			{ min: 3, message: "Timeline must contain at least 3 characters" },
			{ max: 50, message: "Timeline cannot exceed 50 characters" },
			{ pattern: /^[a-zA-Z0-9\s\-.,/Q]+$/, message: "Timeline can only contain letters, numbers, spaces and symbols -.,/Q" }
		]
	},
	{
		name: "language",
		label: "Language",
		type: "select",
		placeholder: "Select language...",
		options: ["English", "German"],
		required: true,
    rules: [
			{ required: true, message: "Language is required" }
		]
	},
	{
		name: "additionalInformation",
		label: "Additional Information",
		type: "textarea",
		placeholder:
			"Any additional context or specific requirements for the analysis...",
		required: false,
    rules: [
			{ max: 1000, message: "Additional information cannot exceed 1000 characters" }
		]
	},
	{
		name: "competitors",
		label: "Competitors",
		type: "competitors",
		placeholder: "Add competitor information",
		required: false,
    rules: [{ max: 5, message: 'Maximum 5 competitors allowed',type: 'array' }],
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
		url: "",
		businessLine: "",
		country: "",
		useCase: "",
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
	const { data: creditsInfo, isLoading: isLoadingCredits } = useGetUserCredits();

	const hasEnoughCredits = CreditsService.hasEnoughCreditsFromApi(creditsInfo, 1);
	const shouldShowCreditsWarning = CreditsService.shouldDisplayCreditsFromApi(creditsInfo) && !hasEnoughCredits;

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
				url: "",
				businessLine: "",
				country: "",
				useCase: "",
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
				url: analyzeData.url || "",
				businessLine: analyzeData.businessLine || "",
				country: analyzeData.country || "",
				useCase: analyzeData.useCase || "",
				timeline: analyzeData.timeline || "",
				language: analyzeData.language || "",
				additionalInformation: analyzeData.additionalInformation || "",
				competitors: analyzeData.competitors || [],
			});

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
				url: data.url || "",
				businessLine: data.businessLine || "",
				country: data.country || "",
				useCase: data.useCase || "",
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
				url: data.url || "",
				country: data.country || "",
				useCase: data.useCase || "",
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
			const salesMinerData = { ...completeData };
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
						useCase: completeData.useCase,
						url: completeData.url,
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
			url: "",
			businessLine: "",
			country: "",
			useCase: "",
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
								position: "relative",
							}}
						>
							{/* Credits Display - Top Right Corner */}
							<div
								style={{
									position: "absolute",
									top: "16px",
									right: "16px",
									zIndex: 1,
								}}
							>
								<CreditsDisplay size="default" useApi={true} />
							</div>
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
									initialValues={{ ...quizData,  competitors: quizData.competitors || [] }}
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
												<Form.List name="competitors" rules={[{ max: 5, message: 'Maximum 5 competitors allowed',type: 'array'}]}>
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

							{/* Credits Warning */}
							{shouldShowCreditsWarning && (
								<div
									style={{
										background: "#2a1a1a",
										border: "1px solid #ff4d4f",
										borderRadius: "8px",
										padding: "16px",
										marginBottom: "16px",
										textAlign: "center",
									}}
								>
									<Text style={{ color: "#ff4d4f", fontSize: "16px", fontWeight: "500" }}>
										⚠️ Insufficient Credits
									</Text>
									<br />
									<Text style={{ color: "#8c8c8c", fontSize: "14px" }}>
										You need at least 1 credit to generate SalesMiner analysis. Please contact your administrator to add credits.
									</Text>
								</div>
							)}

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
									disabled={!hasEnoughCredits}
									loading={
										loading ||
										isPending ||
										createSalesMinerAnalyze.isPending ||
										updateSalesMinerAnalyze.isPending ||
										isLoadingCredits
									}
									icon={<SendOutlined />}
									style={{
										background: hasEnoughCredits ? "#58bfce" : "#434343",
										border: hasEnoughCredits ? "1px solid #58bfce" : "1px solid #434343",
										borderRadius: "8px",
										height: "48px",
										padding: "0 24px",
									}}
								>
									{hasEnoughCredits ? "Generate SalesMiner Analysis" : "Insufficient Credits"}
								</Button>
							</div>
						</Card>
					</div>
				</Content>
			</Layout>
		</Layout>
	);
}