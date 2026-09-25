import { z } from "zod";
import { INDUSTRIES } from "./industry-catalog";

const uuid = z.string().uuid();
const optionalText = z
  .string()
  .trim()
  .max(2_000)
  .optional()
  .transform((value) => value || undefined);

const quickLeadFields = {
  firstName: z.string().trim().min(1).max(80),
  lastName: optionalText,
  email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  phone: optionalText,
  sourceId: uuid
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  note: optionalText,
};

export const quickLeadSchema = z.preprocess(
  (value) => {
    if (value && typeof value === "object" && !("companyMode" in value))
      return { ...value, companyMode: "new" };
    return value;
  },
  z.discriminatedUnion("companyMode", [
    z.object({
      companyMode: z.literal("new").default("new"),
      companyName: z.string().trim().min(2).max(160),
      ...quickLeadFields,
    }),
    z
      .object({
        companyMode: z.literal("existing"),
        companyId: uuid,
        contactId: uuid
          .optional()
          .or(z.literal(""))
          .transform((value) => value || undefined),
        firstName: z
          .string()
          .trim()
          .max(80)
          .optional()
          .transform((value) => value || undefined),
        lastName: optionalText,
        email: z
          .string()
          .trim()
          .email()
          .optional()
          .or(z.literal(""))
          .transform((value) => value || undefined),
        phone: optionalText,
        sourceId: uuid
          .optional()
          .or(z.literal(""))
          .transform((value) => value || undefined),
        note: optionalText,
      })
      .superRefine((value, context) => {
        if (!value.contactId && !value.firstName)
          context.addIssue({
            code: "custom",
            path: ["firstName"],
            message:
              "El contacto es obligatorio cuando no se selecciona uno existente.",
          });
      }),
  ]),
);

export const companyCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  industry: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z
      .enum(INDUSTRIES)
      .optional()
      .or(z.literal(""))
      .transform((value) => value || undefined),
  ),
  email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  phone: optionalText,
  whatsapp: optionalText,
  website: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  city: optionalText,
  legalName: optionalText,
  taxId: optionalText,
  instagramUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  facebookUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  linkedinUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
});

export const contactCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: optionalText,
  companyId: uuid
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  phone: optionalText,
  whatsapp: optionalText,
  preferredChannel: z
    .enum(["whatsapp", "email", "phone", "linkedin"])
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  influence: z
    .enum(["decision_maker", "influencer", "user", "other"])
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  jobTitle: optionalText,
});

export const companyUpdateSchema = companyCreateSchema.extend({ id: uuid });
export const contactUpdateSchema = contactCreateSchema.extend({ id: uuid });
export const recordIdSchema = z.object({ id: uuid });

export const convertLeadSchema = z.object({
  leadId: uuid,
  pipelineId: uuid,
  stageId: uuid,
  name: z.string().trim().min(2).max(180),
  implementationValue: z.coerce.number().min(0).max(99_999_999),
  potentialMrr: z.coerce.number().min(0).max(99_999_999).default(0),
});

export const leadFollowupSchema = z.object({
  leadId: uuid,
  status: z.enum(["new", "contacted", "qualified", "unqualified"]),
  nextAction: optionalText,
  nextActionAt: z
    .string()
    .date()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  noteAppend: optionalText,
});

export const stageUpdateSchema = z.object({ dealId: uuid, stageId: uuid });
export const activitySchema = z.object({
  type: z.enum(["note", "call", "email", "whatsapp", "meeting"]),
  title: z.string().trim().min(1).max(180),
  body: optionalText,
  companyId: uuid
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  contactId: uuid
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  leadId: uuid
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  dealId: uuid
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
});
export const taskSchema = z.object({
  id: uuid
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  title: z.string().trim().min(1).max(180),
  description: optionalText,
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueAt: z
    .string()
    .date()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  companyId: uuid
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  contactId: uuid
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  leadId: uuid
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  dealId: uuid
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
});
export const taskCompletionSchema = z.object({
  id: uuid,
  completed: z.enum(["true", "false"]).transform((value) => value === "true"),
});
export const diagnosticAnswerSchema = z.object({
  diagnosticId: uuid,
  questionKey: z.string().trim().min(1).max(120),
  answer: optionalText,
});
export const diagnosticProblemSchema = z.object({
  diagnosticId: uuid,
  description: z.string().trim().min(1).max(2_000),
  severity: z.enum(["low", "medium", "high", "critical"]),
  impact: optionalText,
  potentialSolution: optionalText,
});

export function formValues(
  formData: FormData,
): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

export const serviceInterestSchema = z.object({
  diagnosticId: uuid,
  serviceId: uuid,
  interest: z.enum(["wanted", "later", "declined"]),
  note: optionalText,
});
