// lib/growth-decision/preview.ts
// REVIEW-ONLY: builds a Growth Driver BlueprintRow from the curated stage JSON checked into the
// repo, so the revised view can be reviewed WITHOUT persisting anything to the database.
// Remove (with app/(os)/blueprints/preview) once the curated row has been persisted.
import s1 from "../../scripts/fixtures/blueprint-curated/growth_driver.stage1.json";
import s2 from "../../scripts/fixtures/blueprint-curated/growth_driver.stage2.json";
import s3 from "../../scripts/fixtures/blueprint-curated/growth_driver.stage3.json";
import { parseInputs } from "./draft";
import { buildIllustrativeNext, buildIllustrativeOutcome, EXAMPLES } from "./examples";
import { reconcile } from "./reconcile";
import { Stage1V, Stage2V, Stage3V, type BlueprintRow } from "./schema";

export function growthDriverPreviewRow(): BlueprintRow {
  const ex = EXAMPLES.growth_driver;
  const inputs = parseInputs(ex.inputs);
  const p1 = Stage1V.parse(s1);
  const p2 = Stage2V.parse(s2);
  const p3 = Stage3V.parse(s3);
  if (!p1.ok || !p2.ok || !p3.ok) throw new Error("curated Growth Driver fixtures failed validation");
  const { outcome } = buildIllustrativeOutcome("growth_driver", p3.value);
  const rec = reconcile(p3.value, outcome);
  const now = new Date().toISOString();
  return {
    id: "preview",
    title: ex.title,
    territory: inputs.territory,
    market: inputs.market,
    execution_owner_label: inputs.execution_owner.label,
    execution_owner_type: inputs.execution_owner.type,
    is_demo: true,
    schema_version: 1,
    inputs,
    content: {
      stage1: p1.value,
      stage2: p2.value,
      stage3: p3.value,
      outcome,
      next: buildIllustrativeNext("growth_driver", rec.suggested_move),
    },
    stages: {},
    created_at: now,
    updated_at: now,
  };
}
