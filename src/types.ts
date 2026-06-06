/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RideStatus = 
  | 'pending'      // Client requested, driver has not accepted yet (ringing)
  | 'accepted'     // Driver accepted, heading to pickup point
  | 'arrived'      // Driver arrived at pickup, waiting for client
  | 'pickedup'     // Client in vehicle, heading to destination
  | 'completed'    // Arrived at destination, payment collected
  | 'declined';    // Driver refused

export type PaymentType = 'Espèces';

export interface Ride {
  id: string;
  clientName: string;
  clientPhone: string;
  clientAvatar: string;
  clientRating: number;
  pickupLocation: string;
  pickupCoords: { x: number; y: number }; // Percentage coordinate on simulated map
  dropoffLocation: string;
  dropoffCoords: { x: number; y: number };
  priceFCFA: number;
  distanceKM: number;
  durationMinutes: number;
  status: RideStatus;
  isScheduled: boolean;
  scheduledTime?: string;
  paymentMethod: PaymentType;
  trafficIntensity: 'Fluide' | 'Modéré' | 'Saturé';
  createdTime: string;
  messages: ChatMessage[];
  ticket_number?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'driver' | 'client' | 'system';
  text: string;
  time: string;
}

export interface DriverSchedule {
  id: string;
  day: string;
  time: string;
  route: string;
  isActive: boolean;
}

export interface DriverProfile {
  name: string;
  rating: number;
  tripsCount: number;
  seniority: string;
  vehicleModel: string;
  vehiclePlate: string;
  avatarInitials: string;
  walletBalanceFCFA: number;
  withdrawMethods: {
    wave: string;
    orangeMoney: string;
    bank: string;
  };
}

export interface SoundPreset {
  id: string;
  name: string;
  frequency: number;
  type: OscillatorType;
}
