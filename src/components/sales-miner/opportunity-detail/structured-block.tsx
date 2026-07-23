import { Tag, Typography } from "antd";
import type { OpportunityStructuredBlock } from "../../../types/deep-dive.types";
import styles from "./opportunity-detail.module.css";
import { renderStructuredValue } from "./structured-value";

const { Text } = Typography;

export default function StructuredBlock({
	block,
}: {
	block: OpportunityStructuredBlock;
}) {
	return (
		<article className={styles.structuredBlock}>
			<div className={styles.structuredHead}>
				<div>
					<Text className={styles.structuredTitle}>{block.label}</Text>
					{block.group && (
						<Text className={styles.fieldSource}>{block.group}</Text>
					)}
				</div>
				{block.status && <Tag>{block.status}</Tag>}
			</div>
			<div className={styles.structuredBody}>
				{renderStructuredValue(block.value)}
			</div>
		</article>
	);
}
