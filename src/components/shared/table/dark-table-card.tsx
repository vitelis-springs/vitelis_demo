"use client";

import type { CardProps, TableProps } from "antd";
import { Card, Table } from "antd";
import { DARK_CARD_STYLE } from "../../../config/chart-theme";

interface DarkTableCardProps<RecordType extends object>
	extends TableProps<RecordType> {
	cardProps?: Omit<CardProps, "style" | "styles"> & {
		style?: CardProps["style"];
		styles?: CardProps["styles"];
	};
}

export function DarkTableCard<RecordType extends object>({
	cardProps,
	style,
	...tableProps
}: DarkTableCardProps<RecordType>) {
	const {
		style: cardStyle,
		styles: cardStyles,
		...restCardProps
	} = cardProps ?? {};

	return (
		<Card
			{...restCardProps}
			style={{ ...DARK_CARD_STYLE, ...cardStyle }}
			styles={{
				...cardStyles,
				body: { padding: 0, ...cardStyles?.body },
			}}
		>
			<Table<RecordType>
				{...tableProps}
				style={{ background: "#1f1f1f", ...style }}
			/>
		</Card>
	);
}
