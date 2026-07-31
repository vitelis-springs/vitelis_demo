"use client";

import {
	CheckOutlined,
	CloseOutlined,
	EditOutlined,
	HistoryOutlined,
	RollbackOutlined,
} from "@ant-design/icons";
import {
	Button,
	Input,
	Modal,
	Popconfirm,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import { useEffect, useState } from "react";
import type { OpportunityNarrativeField } from "../../../types/deep-dive.types";
import type { OpportunityFieldHistory } from "./opportunity-edit-history";
import styles from "./opportunity-detail.module.css";

const { Text } = Typography;

export default function NarrativeFieldEditor({
	field,
	active,
	saving,
	error,
	history,
	restoring,
	onEdit,
	onCancel,
	onSave,
	onRestore,
}: {
	field: OpportunityNarrativeField;
	active: boolean;
	saving: boolean;
	error: string | null;
	history: OpportunityFieldHistory | null;
	restoring: boolean;
	onEdit: () => void;
	onCancel: () => void;
	onSave: (value: string) => Promise<void>;
	onRestore: (value: string) => Promise<void>;
}) {
	const [draft, setDraft] = useState(field.value ?? "");
	const [historyOpen, setHistoryOpen] = useState(false);
	const trimmed = draft.trim();
	const original = field.value ?? "";
	const canSave = trimmed.length > 0 && trimmed !== original.trim();
	const editedInSession = history != null && history.changes.length > 0;
	const currentValue = field.value ?? "";
	const historyEntries = history
		? [
				{
					id: field.source + ":" + field.field + ":original",
					label: "Original generated value",
					meta: "Before session edits",
					value: history.originalValue,
				},
				...history.changes.map((change, index) => ({
					id: change.id,
					label:
						change.action === "restore"
							? "Rollback " + (index + 1)
							: "Change " + (index + 1),
					meta: new Date(change.savedAt).toLocaleString(),
					value: change.nextValue,
				})),
			]
		: [];

	useEffect(() => {
		if (!active) setDraft(field.value ?? "");
	}, [active, field.value]);

	async function restoreValue(value: string) {
		await onRestore(value);
		setHistoryOpen(false);
	}

	return (
		<div
			className={[styles.field, editedInSession ? styles.fieldEdited : ""]
				.filter(Boolean)
				.join(" ")}
		>
			<div className={styles.fieldHead}>
				<div>
					<div className={styles.fieldLabelRow}>
						<Text className={styles.fieldLabel}>{field.label}</Text>
						{editedInSession && (
							<Tag className={styles.editedTag}>Edited in session</Tag>
						)}
					</div>
					<Text className={styles.fieldSource}>
						{field.source === "base" ? "Opportunity" : "Deep Dive"}
					</Text>
				</div>
				<div className={styles.fieldTools}>
					<Tooltip
						title={
							editedInSession
								? "Review or restore session edits"
								: "No session edits for this field"
						}
					>
						<Button
							type="text"
							size="small"
							icon={<HistoryOutlined />}
							disabled={!editedInSession}
							onClick={() => setHistoryOpen(true)}
							aria-label={"Open history for " + field.label}
						/>
					</Tooltip>
					{!active && (
						<Button
							type="text"
							size="small"
							icon={<EditOutlined />}
							onClick={onEdit}
							aria-label={"Edit " + field.label}
						/>
					)}
				</div>
			</div>

			{active ? (
				<div className={styles.editor}>
					<Input.TextArea
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						autoSize={{ minRows: field.field === "title" ? 2 : 5, maxRows: 14 }}
						status={!trimmed ? "error" : undefined}
						className={styles.textarea}
					/>
					{!trimmed && (
						<Text type="danger" className={styles.fieldError}>
							Field value cannot be empty
						</Text>
					)}
					{error && (
						<Text type="danger" className={styles.fieldError}>
							{error}
						</Text>
					)}
					<div className={styles.fieldActions}>
						<Button icon={<CloseOutlined />} onClick={onCancel}>
							Cancel
						</Button>
						<Popconfirm
							title="Save this change?"
							description="You can restore this field from session history until this browser session ends."
							okText="Save changes"
							cancelText="Keep editing"
							disabled={!canSave || saving}
							onConfirm={() => onSave(trimmed)}
						>
							<Button
								type="primary"
								icon={<CheckOutlined />}
								loading={saving}
								disabled={!canSave}
							>
								Save
							</Button>
						</Popconfirm>
					</div>
				</div>
			) : (
				<p className={styles.fieldText}>{field.value || "-"}</p>
			)}

			<Modal
				title={field.label + " history"}
				open={historyOpen}
				onCancel={() => setHistoryOpen(false)}
				footer={null}
				width={760}
			>
				<div className={styles.historyList}>
					{historyEntries.map((entry) => {
						const isCurrentValue = entry.value.trim() === currentValue.trim();
						const canRestore = entry.value.trim().length > 0 && !isCurrentValue;

						return (
							<div key={entry.id} className={styles.historyItem}>
								<div className={styles.historyItemHead}>
									<div>
										<Text className={styles.historyItemTitle}>
											{entry.label}
										</Text>
										<Text className={styles.historyItemMeta}>{entry.meta}</Text>
									</div>
									{isCurrentValue ? (
										<Tag className={styles.currentTag}>Current</Tag>
									) : (
										<Popconfirm
											title="Restore this value?"
											description="This will overwrite the current field value and add the rollback to session history."
											okText="Restore"
											cancelText="Cancel"
											disabled={!canRestore || restoring}
											onConfirm={() => restoreValue(entry.value)}
										>
											<Button
												size="small"
												icon={<RollbackOutlined />}
												loading={restoring}
												disabled={!canRestore}
											>
												Restore
											</Button>
										</Popconfirm>
									)}
								</div>
								<p className={styles.historyValue}>{entry.value || "-"}</p>
							</div>
						);
					})}
				</div>
			</Modal>
		</div>
	);
}
