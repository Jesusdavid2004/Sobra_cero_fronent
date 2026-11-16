import { z } from "zod";

export const WASTE_REASONS = ["expired", "damaged", "unsold", "other"] as const;
export const NARRATIVE_STATUSES = ["ai", "unavailable", "quota_exceeded"] as const;

export const DiagnosisSchema = z.object({
  facts: z.object({
    active_lots: z.number().int(),
    units_available: z.number().int(),
    lots_expiring_soon: z.number().int(),
    units_expiring_soon: z.number().int(),
    units_closing_soon: z.number().int(),
    picked_up_units: z.number().int(),
    delivered_donation_units: z.number().int(),
    cancelled_units: z.number().int(),
    wasted_units: z.number().int(),
    pending_pickup_units: z.number().int(),
  }),
  alerts: z.array(z.string()),
  limitations: z.array(z.string()),
  data_used: z.array(z.string()),
  narrative: z.string().nullable(),
  narrative_status: z.enum(NARRATIVE_STATUSES),
});

export const WasteRecordedSchema = z.object({
  lot_id: z.number().int(),
  remaining_quantity: z.number().int(),
});

export const WasteEntrySchema = z.object({
  id: z.number().int(),
  lot_id: z.number().int(),
  lot_title: z.string(),
  quantity: z.number().int(),
  reason: z.enum(WASTE_REASONS),
  note: z.string(),
  created_at: z.string(),
});

export type WasteReason = (typeof WASTE_REASONS)[number];
export type Diagnosis = z.infer<typeof DiagnosisSchema>;
export type WasteRecorded = z.infer<typeof WasteRecordedSchema>;
export type WasteEntry = z.infer<typeof WasteEntrySchema>;
export type WasteInput = { quantity: number; reason: WasteReason; note: string };
