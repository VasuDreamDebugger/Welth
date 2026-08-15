import { z } from "zod";

export const onboardingSchema = z.object({
  startingBalance: z
    .string()
    .min(1, "Please enter a starting balance.")
    .regex(/^[0-9,]+(\.[0-9]+)?$/, "Please enter a valid starting balance.")
    .transform((v) => {
      const parsed = parseFloat(v.replace(/,/g, ""));
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error("Please enter a valid starting balance.");
      }
      return parsed;
    }),
});

export type OnboardingFormValues = z.input<typeof onboardingSchema>;
export type OnboardingFormOutput = z.output<typeof onboardingSchema>;
