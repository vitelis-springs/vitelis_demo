import type { OpportunityStructuredBlock } from "../../../types/deep-dive.types";
import DossierSection from "./dossier-section";
import styles from "./opportunity-detail.module.css";
import StructuredBlock from "./structured-block";

/** Raw structured blocks not surfaced elsewhere; renders nothing when empty. */
export default function AppendixSection({
	blocks,
}: {
	blocks: OpportunityStructuredBlock[];
}) {
	if (blocks.length === 0) return null;
	return (
		<DossierSection id="appendix" eyebrow="Raw" title="Appendix">
			<div className={styles.appendix}>
				{blocks.map((block) => (
					<StructuredBlock block={block} key={block.key} />
				))}
			</div>
		</DossierSection>
	);
}
