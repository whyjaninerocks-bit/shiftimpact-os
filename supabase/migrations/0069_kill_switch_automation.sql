-- Migration 0069 — Kill Switch automated evaluation
-- ShiftImpact OS
--
-- Kill switches were manual-only: a human read the free-text `condition`
-- and flipped `trigger_status` by hand. This adds an OPTIONAL structured
-- layer so a kill switch can instead be evaluated automatically against
-- live weekly signal data.
--
-- Design: `condition` stays as the human-readable label a strategist always
-- fills in. `metric_type` is null by default — a kill switch with no
-- metric_type stays exactly as it was, fully manual. Only kill switches
-- where a strategist explicitly sets metric_type/comparator/threshold_value
-- become eligible for the new weekly cron (signal-kill-switch-eval). This is
-- deliberate: existing free-text kill switches are never auto-interpreted
-- or auto-triggered without someone explicitly configuring the structured
-- fields first.

ALTER TABLE kill_switches
  ADD COLUMN IF NOT EXISTS metric_type          TEXT
    CHECK (metric_type IS NULL OR metric_type IN (
      'signal_1_actual_pct', 'signal_2_actual_pct', 'signal_3_actual_count',
      'signal_2b_actual_pct', 'signal_3b_actual_pct', 'signal_4_actual_pct'
    )),
  ADD COLUMN IF NOT EXISTS comparator           TEXT
    CHECK (comparator IS NULL OR comparator IN ('below', 'above')),
  ADD COLUMN IF NOT EXISTS threshold_value       NUMERIC,
  ADD COLUMN IF NOT EXISTS consecutive_periods   SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS auto_enabled          BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_evaluated_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_evaluation_note  TEXT;

COMMENT ON COLUMN kill_switches.metric_type IS 'Which signal_weekly_reports column to evaluate. Null = manual-only kill switch (default for all existing rows).';
COMMENT ON COLUMN kill_switches.comparator IS '''below'' or ''above'' the threshold. Null when metric_type is null.';
COMMENT ON COLUMN kill_switches.threshold_value IS 'Numeric threshold the metric is compared against.';
COMMENT ON COLUMN kill_switches.consecutive_periods IS 'Number of most-recent consecutive weeks the condition must hold before auto-triggering. Default 1.';
COMMENT ON COLUMN kill_switches.auto_enabled IS 'Lets a strategist pause automated evaluation without clearing the structured config. Default true.';
COMMENT ON COLUMN kill_switches.last_evaluated_at IS 'Timestamp of the most recent automated evaluation run.';
COMMENT ON COLUMN kill_switches.last_evaluation_note IS 'System-written explanation of the most recent automated evaluation result.';

DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'kill_switches'
      AND column_name IN ('metric_type','comparator','threshold_value','consecutive_periods','auto_enabled','last_evaluated_at','last_evaluation_note')
  ) = 7, 'kill_switches: expected 7 new automation columns';

  RAISE NOTICE 'Migration 0069 verified — kill switch automation fields ready.';
END $$;
