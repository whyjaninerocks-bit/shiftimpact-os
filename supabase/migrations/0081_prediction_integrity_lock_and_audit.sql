-- Migration 0081: Prediction integrity — lock predictions at creation, audit trail for corrections
-- Predictions are locked at creation (immutable prediction_text/predicted_value/unit/category/prediction_week).
-- Only outcome fields may be written afterward. Any edit to an already-resolved prediction
-- is appended to correction_log rather than silently overwritten.
--
-- Applied directly to the live database on 7 Sept 2026. This file exists so the schema
-- history in git matches what's actually live — same pattern as prior migrations.

alter table prediction_accuracy_log
  add column if not exists locked_at timestamptz,
  add column if not exists correction_log jsonb not null default '[]'::jsonb,
  add column if not exists source_table text,
  add column if not exists source_id uuid,
  add column if not exists source_signal_key text;

-- Lock all existing rows retroactively at their created_at (nothing to protect
-- going backward, but keeps the invariant "locked_at is always set" true going forward)
update prediction_accuracy_log set locked_at = created_at where locked_at is null;

comment on column prediction_accuracy_log.locked_at is 'Set once, at creation. Once set, prediction_text/predicted_value/unit/category/prediction_week are immutable — only outcome fields (actual_value, verdict, accuracy_pct, outcome_note, outcome_week) may be written after this.';
comment on column prediction_accuracy_log.correction_log is 'Append-only. An entry is added whenever an already-resolved (non-Pending) prediction''s outcome fields are edited again — preserves what changed, when, and why, so a resolved verdict is never silently overwritten.';
comment on column prediction_accuracy_log.source_table is 'Which table this prediction was auto-derived from (signal_thresholds / business_outcomes / phase_gates / kill_switches), null for manually-added predictions.';
comment on column prediction_accuracy_log.source_id is 'Row id in source_table, used for reliable reconciliation instead of text-matching labels.';
comment on column prediction_accuracy_log.source_signal_key is 'Which specific signal within source_table this refers to, e.g. signal_1 / signal_2 / signal_3, when source_table has multiple signals per row.';
