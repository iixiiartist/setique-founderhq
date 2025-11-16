import { z } from 'zod';

/**
 * Validation schemas for business profile onboarding
 * These provide inline validation feedback and error messages
 */

// Step 1: Basic Company Information
export const step1Schema = z.object({
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters'),
  industry: z.string().optional(),
  companySize: z.string().optional(),
});

// Step 2: Business Model & Description
export const step2Schema = z.object({
  businessModel: z.string().optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

// Step 3: Market & Value Proposition
export const step3Schema = z.object({
  targetMarket: z
    .string()
    .max(300, 'Target market description must be less than 300 characters')
    .optional()
    .or(z.literal('')),
  valueProposition: z
    .string()
    .max(300, 'Value proposition must be less than 300 characters')
    .optional()
    .or(z.literal('')),
});

// Step 4: Goals & Challenges
export const step4Schema = z.object({
  primaryGoal: z.string().optional(),
  keyChallenges: z
    .string()
    .max(500, 'Key challenges must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  growthStage: z.string().optional(),
});

// Step 5: Revenue & Metrics
export const step5Schema = z.object({
  currentMrr: z
    .number()
    .min(0, 'MRR must be a positive number')
    .optional()
    .or(z.nan()),
  targetMrr: z
    .number()
    .min(0, 'Target MRR must be a positive number')
    .optional()
    .or(z.nan()),
  customerCount: z
    .number()
    .min(0, 'Customer count must be a positive number')
    .optional()
    .or(z.nan()),
});

// Step 6: Team Information
export const step6Schema = z.object({
  teamSize: z
    .number()
    .min(0, 'Team size must be a positive number')
    .optional()
    .or(z.nan()),
  remotePolicy: z.string().optional(),
});

// Step 7: Additional Context
export const step7Schema = z.object({
  companyValues: z
    .array(z.string())
    .max(10, 'You can select up to 10 values')
    .optional(),
  techStack: z
    .array(z.string())
    .max(20, 'You can select up to 20 technologies')
    .optional(),
  competitors: z
    .array(z.string())
    .max(15, 'You can list up to 15 competitors')
    .optional(),
  uniqueDifferentiators: z
    .string()
    .max(500, 'Differentiators must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

// Complete business profile schema
export const businessProfileSchema = z.object({
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters'),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  foundedYear: z
    .number()
    .min(1800, 'Founded year must be after 1800')
    .max(new Date().getFullYear(), 'Founded year cannot be in the future')
    .optional()
    .or(z.nan()),
  website: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  businessModel: z.string().optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  targetMarket: z
    .string()
    .max(300, 'Target market description must be less than 300 characters')
    .optional()
    .or(z.literal('')),
  valueProposition: z
    .string()
    .max(300, 'Value proposition must be less than 300 characters')
    .optional()
    .or(z.literal('')),
  primaryGoal: z.string().optional(),
  keyChallenges: z
    .string()
    .max(500, 'Key challenges must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  growthStage: z.string().optional(),
  currentMrr: z
    .number()
    .min(0, 'MRR must be a positive number')
    .optional()
    .or(z.nan()),
  targetMrr: z
    .number()
    .min(0, 'Target MRR must be a positive number')
    .optional()
    .or(z.nan()),
  currentArr: z
    .number()
    .min(0, 'ARR must be a positive number')
    .optional()
    .or(z.nan()),
  customerCount: z
    .number()
    .min(0, 'Customer count must be a positive number')
    .optional()
    .or(z.nan()),
  teamSize: z
    .number()
    .min(0, 'Team size must be a positive number')
    .optional()
    .or(z.nan()),
  remotePolicy: z.string().optional(),
  companyValues: z
    .array(z.string())
    .max(10, 'You can select up to 10 values')
    .optional(),
  techStack: z
    .array(z.string())
    .max(20, 'You can select up to 20 technologies')
    .optional(),
  competitors: z
    .array(z.string())
    .max(15, 'You can list up to 15 competitors')
    .optional(),
  uniqueDifferentiators: z
    .string()
    .max(500, 'Differentiators must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

export type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;

/**
 * Get the schema for a specific step
 */
export function getStepSchema(step: number) {
  switch (step) {
    case 1:
      return step1Schema;
    case 2:
      return step2Schema;
    case 3:
      return step3Schema;
    case 4:
      return step4Schema;
    case 5:
      return step5Schema;
    case 6:
      return step6Schema;
    case 7:
      return step7Schema;
    default:
      return step1Schema;
  }
}

/**
 * Validate a specific step's data
 */
export function validateStep(step: number, data: any): { success: boolean; errors: Record<string, string> } {
  const schema = getStepSchema(step);
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, errors: {} };
  }

  const errors: Record<string, string> = {};
  if (!result.success && result.error) {
    result.error.issues.forEach((err) => {
      const field = err.path.join('.');
      errors[field] = err.message;
    });
  }

  return { success: false, errors };
}
