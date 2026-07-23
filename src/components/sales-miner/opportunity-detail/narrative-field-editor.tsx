"use client";

import { CheckOutlined, CloseOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Input, Typography } from "antd";
import { useEffect, useState } from "react";
import type { OpportunityNarrativeField } from "../../../types/deep-dive.types";
import styles from "./opportunity-detail.module.css";

const { Text } = Typography;

export default function NarrativeFieldEditor({
	field,
	active,
	saving,
	error,
	onEdit,
	onCancel,
	onSave,
}: {
	field: OpportunityNarrativeField;
	active: boolean;
	saving: boolean;
	error: string | null;
	onEdit: () => void;
	onCancel: () => void;
	onSave: (value: string) => Promise<void>;
}) {
	const [draft, setDraft] = useState(field.value ?? "");
	const trimmed = draft.trim();
	const original = field.value ?? "";
	const canSave = trimmed.length > 0 && trimmed !== original.trim();

	useEffect(() => {
		if (!active) setDraft(field.value ?? "");
	}, [active, field.value]);

	return (
		<div className={styles.field}>
			<div className={styles.fieldHead}>
				<div>
					<Text className={styles.fieldLabel}>{field.label}</Text>
					<Text className={styles.fieldSource}>
						{field.source === "base" ? "Opportunity" : "Deep Dive"}
					</Text>
				</div>
				{!active && (
					<Button
						type="text"
						size="small"
						icon={<EditOutlined />}
						onClick={onEdit}
						aria-label={`Edit ${field.label}`}
					/>
				)}
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
						<Button
							type="primary"
							icon={<CheckOutlined />}
							loading={saving}
							disabled={!canSave}
							onClick={() => onSave(trimmed)}
						>
							Save
						</Button>
					</div>
				</div>
			) : (
				<p className={styles.fieldText}>{field.value || "-"}</p>
			)}
		</div>
	);
}
