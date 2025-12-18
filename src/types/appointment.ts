export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export interface Appointment {
  id: string;
  shopId: string; // Identify which store this appointment belongs to
  userId: string; // Line User ID
  customerName: string; // Customer name
  phone?: string; // Customer phone number
  petName?: string; // Pet name
  petSpecies?: string; // Pet species (dog, cat, etc.)
  petSize?: string; // Pet size (small, medium, large)
  petPhoto?: string; // Pet photo URL
  serviceType: string; // Service name
  servicePrice?: number; // Service price
  duration: number; // Duration in minutes
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes?: string; // Additional notes
  createdAt: any; // Firestore Timestamp
  status: AppointmentStatus;
}
