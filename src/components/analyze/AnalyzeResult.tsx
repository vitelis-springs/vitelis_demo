"use client";

import { CheckCircleOutlined, DownOutlined } from "@ant-design/icons";
import { Button, Card, Layout, Space, Typography } from "antd";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkToc from "remark-toc";
import Sidebar from "./ui/sidebar";

const { Title, Text } = Typography;
const { Content } = Layout;

interface AnalyzeQuizData {
	companyName: string;
	businessLine: string;
	country: string;
	useCase: string;
	timeline: string;
	additionalInformation?: string;
}

interface AnalyzeResultProps {
	quizData: AnalyzeQuizData;
	resultText?: string;
	onReset: () => void;
}

export default function AnalyzeResult({
	quizData,
	resultText,
	onReset,
}: AnalyzeResultProps) {
	const [tocOpen, setTocOpen] = useState(true);
	// summary -> head to head -> sources -> improvementLeverages
	// Use provided resultText or fallback to default content
	const reportContent =
		resultText ||
		`\n\n# Analysis Report\n\nNo analysis results available yet. Please wait for the analysis to complete.`;

	// Generate TOC content - only the TOC structure
	const tocContent = `# Table of Contents\n\n${reportContent}`;

	// Function to extract headings and create TOC
	const generateTOC = (content: string) => {
		const lines = content.split("\n");
		const headings: Array<{ level: number; text: string; id: string }> = [];

		lines.forEach((line) => {
			const h1Match = line.match(/^# (.+)$/);
			const h2Match = line.match(/^## (.+)$/);
			const h3Match = line.match(/^### (.+)$/);

			if (h1Match) {
				const text = h1Match[1];
				const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
				headings.push({ level: 1, text, id });
			} else if (h2Match) {
				const text = h2Match[1];
				const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
				headings.push({ level: 2, text, id });
			} else if (h3Match) {
				const text = h3Match[1];
				const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
				headings.push({ level: 3, text, id });
			}
		});

		return headings;
	};

	const tocHeadings = generateTOC(reportContent);

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
									Analysis Report Generated
								</Title>
								<Text style={{ color: "#8c8c8c" }}>
									Your comprehensive analysis report is ready
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
									<Title level={4} style={{ color: "#58bfce", margin: 0 }}>
										Analysis Parameters
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
									{quizData.additionalInformation && (
										<p>
											<strong>Additional Information:</strong>{" "}
											{quizData.additionalInformation}
										</p>
									)}
								</div>
							</Card>

							{/* Table of Contents */}
							<Card
								style={{
									background: "#262626",
									border: "1px solid #434343",
									borderRadius: "8px",
									marginBottom: "24px",
								}}
								styles={{ body: { padding: "0" } }}
							>
								<div
									style={{
										padding: "16px 24px",
										borderBottom: "1px solid #434343",
										cursor: "pointer",
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										background: "#1f1f1f",
									}}
									onClick={() => setTocOpen(!tocOpen)}
								>
									<Title level={4} style={{ color: "#58bfce", margin: 0 }}>
										Table of Contents
									</Title>
									<DownOutlined
										style={{
											color: "#58bfce",
											fontSize: "16px",
											transform: tocOpen ? "rotate(180deg)" : "rotate(0deg)",
											transition: "transform 0.3s ease",
										}}
									/>
								</div>
								{tocOpen && (
									<div style={{ padding: "24px" }}>
										<div
											style={{
												color: "#d9d9d9",
												fontSize: "14px",
												lineHeight: "1.6",
											}}
										>
											{tocHeadings.length > 0 ? (
												<ul style={{ margin: 0, paddingLeft: "20px" }}>
													{tocHeadings.map((heading, index) => (
														<li
															key={index}
															style={{
																marginBottom: "8px",
																paddingLeft: `${(heading.level - 1) * 20}px`,
																listStyle: "none",
															}}
														>
															<a
																href={`#${heading.id}`}
																style={{
																	color: "#58bfce",
																	textDecoration: "none",
																	borderBottom: "1px solid transparent",
																	transition: "border-bottom 0.2s ease",
																	fontSize:
																		heading.level === 1
																			? "16px"
																			: heading.level === 2
																				? "14px"
																				: "13px",
																	fontWeight:
																		heading.level === 1 ? "600" : "500",
																}}
																onClick={(e) => {
																	e.preventDefault();
																	const targetElement = document.getElementById(
																		heading.id,
																	);
																	if (targetElement) {
																		targetElement.scrollIntoView({
																			behavior: "smooth",
																		});
																	}
																}}
																onMouseEnter={(e) =>
																	(e.currentTarget.style.borderBottom =
																		"1px solid #58bfce")
																}
																onMouseLeave={(e) =>
																	(e.currentTarget.style.borderBottom =
																		"1px solid transparent")
																}
															>
																{heading.text}
															</a>
														</li>
													))}
												</ul>
											) : (
												<p style={{ color: "#8c8c8c", fontStyle: "italic" }}>
													No headings found in the report
												</p>
											)}
										</div>
									</div>
								)}
							</Card>

							{/* Markdown Report */}
							<Card
								style={{
									background: "#262626",
									border: "1px solid #434343",
									borderRadius: "8px",
									marginBottom: "32px",
								}}
								styles={{ body: { padding: "32px" } }}
							>
								<div
									style={{
										color: "#d9d9d9",
										fontSize: "14px",
										lineHeight: "1.6",
									}}
								>
									<ReactMarkdown
										remarkPlugins={[
											remarkGfm,
											[remarkToc, { tight: true, maxDepth: 3 }],
										]}
										components={{
											h1: ({ children }) => {
												const id = children
													?.toString()
													.toLowerCase()
													.replace(/[^a-z0-9]+/g, "-");
												return (
													<h1
														id={id}
														style={{
															color: "#58bfce",
															fontSize: "24px",
															marginBottom: "16px",
															marginTop: "24px",
														}}
													>
														{children}
													</h1>
												);
											},
											h2: ({ children }) => {
												const id = children
													?.toString()
													.toLowerCase()
													.replace(/[^a-z0-9]+/g, "-");
												return (
													<h2
														id={id}
														style={{
															color: "#58bfce",
															fontSize: "20px",
															marginBottom: "12px",
															marginTop: "20px",
														}}
													>
														{children}
													</h2>
												);
											},
											h3: ({ children }) => {
												const id = children
													?.toString()
													.toLowerCase()
													.replace(/[^a-z0-9]+/g, "-");
												return (
													<h3
														id={id}
														style={{
															color: "#58bfce",
															fontSize: "18px",
															marginBottom: "10px",
															marginTop: "16px",
														}}
													>
														{children}
													</h3>
												);
											},
											h4: ({ children }) => (
												<h4
													style={{
														color: "#58bfce",
														fontSize: "16px",
														marginBottom: "8px",
														marginTop: "14px",
													}}
												>
													{children}
												</h4>
											),
											p: ({ children }) => (
												<p style={{ marginBottom: "12px" }}>{children}</p>
											),
											strong: ({ children }) => (
												<strong style={{ color: "#ffffff" }}>{children}</strong>
											),
											a: ({ children, href }) => (
												<a
													href={href}
													target="_blank"
													rel="noopener noreferrer"
													style={{
														color: "#1890ff",
														textDecoration: "underline",
														textDecorationColor: "#1890ff",
														textDecorationThickness: "1px",
														textUnderlineOffset: "2px",
													}}
												>
													{children}
												</a>
											),
											table: ({ children }) => (
												<div
													style={{ overflowX: "auto", marginBottom: "16px" }}
												>
													<table
														style={{
															width: "100%",
															borderCollapse: "collapse",
															marginBottom: "16px",
															minWidth: "600px",
														}}
													>
														{children}
													</table>
												</div>
											),
											th: ({ children }) => (
												<th
													style={{
														border: "1px solid #434343",
														padding: "12px 8px",
														textAlign: "left",
														backgroundColor: "#1f1f1f",
														color: "#58bfce",
														fontWeight: "bold",
														fontSize: "14px",
													}}
												>
													{children}
												</th>
											),
											td: ({ children }) => (
												<td
													style={{
														border: "1px solid #434343",
														padding: "12px 8px",
														color: "#d9d9d9",
														fontSize: "14px",
														verticalAlign: "top",
													}}
												>
													{children}
												</td>
											),

											ul: ({ children }) => (
												<ul
													style={{ marginBottom: "12px", paddingLeft: "20px" }}
												>
													{children}
												</ul>
											),
											ol: ({ children }) => (
												<ol
													style={{ marginBottom: "12px", paddingLeft: "20px" }}
												>
													{children}
												</ol>
											),
											li: ({ children }) => (
												<li style={{ marginBottom: "4px" }}>{children}</li>
											),
											blockquote: ({ children }) => (
												<blockquote
													style={{
														borderLeft: "4px solid #58bfce",
														paddingLeft: "16px",
														margin: "16px 0",
														fontStyle: "italic",
														color: "#8c8c8c",
													}}
												>
													{children}
												</blockquote>
											),
											code: ({ children }) => (
												<code
													style={{
														backgroundColor: "#1f1f1f",
														padding: "2px 6px",
														borderRadius: "4px",
														fontFamily: "monospace",
													}}
												>
													{children}
												</code>
											),
											pre: ({ children }) => (
												<pre
													style={{
														backgroundColor: "#1f1f1f",
														padding: "16px",
														borderRadius: "8px",
														overflow: "auto",
														marginBottom: "16px",
													}}
												>
													{children}
												</pre>
											),
										}}
									>
										{reportContent}
									</ReactMarkdown>
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
										Start New Analysis
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
