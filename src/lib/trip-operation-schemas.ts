import { z } from "zod";

const uuid = z.uuid();
const optionalText = z.string().trim().max(1000).optional().default("");

export const registrationOperationSchema = z.object({
  tripId: uuid, pilgrimId: uuid, groupId: z.union([uuid, z.literal("")]),
  roomPreference: z.enum(["", "single", "double", "triple", "accessible"]),
  agreedPrice: z.coerce.number().min(0).max(1_000_000), notes: optionalText,
});

export const tripGroupOperationSchema = z.object({
  tripId: uuid, name: z.string().trim().min(2).max(160),
  leaderName: z.string().trim().max(120).optional().default(""),
  leaderPhone: z.string().trim().max(40).optional().default(""),
  meetingPoint: z.string().trim().max(250).optional().default(""), notes: optionalText,
});

export const accommodationOperationSchema = z.object({
  tripId: uuid, name: z.string().trim().min(2).max(160),
  city: z.string().trim().max(120).optional().default(""),
  address: z.string().trim().max(250).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  accessibleRooms: z.coerce.number().int().min(0).max(1000),
});

export const roomOperationSchema = z.object({
  tripId: uuid, accommodationId: uuid, roomNumber: z.string().trim().min(1).max(40),
  roomType: z.enum(["single", "double", "triple", "quad", "accessible", "other"]),
  capacity: z.coerce.number().int().min(1).max(20),
  floor: z.string().trim().max(40).optional().default(""), accessible: z.enum(["true", "false"]),
});

export const roomAssignmentOperationSchema = z.object({ tripId: uuid, roomId: uuid, registrationId: uuid });

export const vehicleOperationSchema = z.object({
  tripId: uuid, name: z.string().trim().min(2).max(120),
  vehicleType: z.enum(["coach", "minibus", "plane", "train", "ship", "other"]),
  operatorName: z.string().trim().max(120).optional().default(""),
  reference: z.string().trim().max(120).optional().default(""),
  capacity: z.coerce.number().int().min(1).max(500),
});

export const seatAssignmentOperationSchema = z.object({ tripId: uuid, vehicleSeatId: uuid, registrationId: uuid });

export const itineraryOperationSchema = z.object({
  tripId: uuid, startsAt: z.iso.datetime({ local: true }),
  endsAt: z.union([z.iso.datetime({ local: true }), z.literal("")]),
  itemType: z.enum(["travel", "walk", "meal", "event", "hotel", "free_time", "other"]),
  title: z.string().trim().min(2).max(160), details: optionalText,
  location: z.string().trim().max(160).optional().default(""),
  walkingKm: z.coerce.number().min(0).max(1000), difficulty: z.enum(["", "easy", "medium", "hard"]),
  accessibleAlternative: optionalText,
}).refine((value) => !value.endsAt || value.endsAt >= value.startsAt, { message: "L’orario finale precede quello iniziale." });
