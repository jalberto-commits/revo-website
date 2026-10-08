import { validateAttribution, type Attribution, safePagePath } from "./lead-attribution";
export type LeadInput = { submissionId: string; name: string; phone: string; source: string; attribution?: Attribution };
export function validateLead(value: unknown): LeadInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  const allowed=new Set(['submissionId','name','phone','source','attribution','website']);
  if(Object.keys(p).some(key=>!allowed.has(key)))return null;
  if(p.website!==undefined && (typeof p.website!=='string' || p.website.length>0))return null;
  if (typeof p.submissionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.submissionId)) return null;
  if (typeof p.name !== "string" || typeof p.phone !== "string" || typeof p.source !== "string") return null;
  if(p.name.length>120 || p.phone.length>32 || p.source.length>500)return null;
  const name = p.name.trim(), phone = p.phone.trim(), source = p.source.trim();
  if (!name || name.length > 120 || /[\u0000-\u001f\u007f]/.test(p.name)) return null;
  if (!/^\+?[\d .-]*(?:\(\d{2,5}\))?[\d .-]*$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15) return null;
  if (!source.startsWith("/") || source.startsWith("//") || source.length > 500 || /[\u0000-\u001f]/.test(source)) return null;
  if(safePagePath(source)!==source)return null;
  const attribution=p.attribution===undefined || p.attribution===null ? null : validateAttribution(p.attribution);
  if(p.attribution!=null && (!attribution || attribution.submission_page!==source))return null;
  return { submissionId: p.submissionId, name, phone, source, ...(attribution ? {attribution} : {}) };
}
export type Receipt = { id: string };
export async function captureLead(input: LeadInput, persist: (input: LeadInput) => Promise<Receipt>): Promise<Receipt> {
  const receipt = await persist(input);
  if (!receipt || typeof receipt.id !== "string" || !receipt.id) throw new Error("Missing durable receipt");
  return receipt;
}
export function acceptedLeadResponse(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return p.ok === true && typeof p.receipt === "string" && p.receipt.length > 0;
}
