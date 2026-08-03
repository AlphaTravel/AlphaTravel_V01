export type PilgrimStatus = "Confermato" | "In attesa" | "Da completare";
export type TripStatus = "Bozza" | "Aperto" | "Confermato" | "Completo" | "Concluso";
export type PaymentStatus = "Pagato" | "Parziale" | "Da pagare" | "Scaduto";
export type MobilityLevel = "Autonomo" | "Supporto leggero" | "Assistenza";

export interface Pilgrim {
  id: string;
  initials: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  city: string;
  group: string;
  tripId: string;
  tripName: string;
  status: PilgrimStatus;
  paymentStatus: PaymentStatus;
  paid: number;
  total: number;
  room: string | null;
  coachSeat: string | null;
  dietary: string[];
  mobility: MobilityLevel;
  walkingKm: number;
  missingItems: string[];
  emergencyContact: string;
  documentExpiry: string;
}

export interface Trip {
  id: string;
  code: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  participants: number;
  capacity: number;
  revenue: number;
  collected: number;
  hotels: number;
  coaches: number;
  walkingKm: number;
  leader: string;
  coverTone: "blue" | "amber" | "violet" | "teal";
  checklist: {
    documents: number;
    rooms: number;
    seats: number;
    balances: number;
  };
}

export interface ItineraryItem {
  time: string;
  title: string;
  detail: string;
  type: "travel" | "walk" | "meal" | "event" | "hotel";
}

export interface Room {
  id: string;
  number: string;
  type: "Singola" | "Doppia" | "Tripla" | "Accessibile";
  capacity: number;
  guests: string[];
  floor: number;
}

export interface CoachSeat {
  number: string;
  passenger: string | null;
  reserved?: boolean;
  accessibility?: boolean;
}
