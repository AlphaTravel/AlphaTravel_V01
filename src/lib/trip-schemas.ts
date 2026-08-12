import { z } from "zod";

const optionalText = z.string().trim().max(1000).optional().default("");

const tripFields = {
  title: z.string().trim().min(3).max(160),
  code: z.string().trim().regex(/^[A-Za-z0-9-]{3,20}$/),
  destination: z.string().trim().min(2).max(160),
  description: optionalText,
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  minimum: z.coerce.number().int().min(1).max(5000),
  capacity: z.coerce.number().int().min(1).max(5000),
  registrationDeadline: z.union([z.iso.date(), z.literal("")]),
  price: z.coerce.number().min(0).max(1_000_000),
  deposit: z.union([z.coerce.number().min(0).max(1_000_000), z.literal("")]),
  singleSupplement: z.union([z.coerce.number().min(0).max(1_000_000), z.literal("")]),
  balanceDeadline: z.union([z.iso.date(), z.literal("")]),
};

export const createTripSchema = z.object(tripFields)
  .refine((value) => value.endDate >= value.startDate, { message: "La data di rientro precede la partenza." })
  .refine((value) => value.capacity >= value.minimum, { message: "La capienza è inferiore al numero minimo." });

export const updateTripSchema = z.object({
  ...tripFields,
  tripId: z.uuid(),
  status: z.enum(["draft", "open", "confirmed", "full", "completed", "cancelled"]),
  walkingKm: z.coerce.number().min(0).max(10_000),
})
  .refine((value) => value.endDate >= value.startDate, { message: "La data di rientro precede la partenza." })
  .refine((value) => value.capacity >= value.minimum, { message: "La capienza è inferiore al numero minimo." });
