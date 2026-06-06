/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { DriverProfile, DriverSchedule, Ride } from './types';

// Read Supabase environment variables from Vite's import.meta.env safely
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

// Detect if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Coordinates conversions:
// Map percent coordinate (0 to 100) to Dakar Lat/Lng:
// lng = -17.53 + (x / 100) * 0.55
// lat = 14.77 - (y / 100) * 0.35
export function xToLng(x: number): number {
  return parseFloat((-17.53 + (x / 100) * 0.55).toFixed(6));
}

export function yToLat(y: number): number {
  return parseFloat((14.77 - (y / 100) * 0.35).toFixed(6));
}

export function lngToX(lng: number): number {
  return parseFloat((((lng + 17.53) / 0.55) * 100).toFixed(2));
}

export function latToY(lat: number): number {
  return parseFloat((((14.77 - lat) / 0.35) * 100).toFixed(2));
}

// Map local string status to Supabase status defined in schema
export function mapLocalStatusToSupabase(status: string): 'pending' | 'confirmed' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled' {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'accepted':
      return 'confirmed';
    case 'arrived':
      return 'on_the_way';
    case 'pickedup':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'declined':
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

// Map Supabase status to our local RideStatus
export function mapSupabaseStatusToLocal(status: string): 'pending' | 'accepted' | 'arrived' | 'pickedup' | 'completed' | 'declined' {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'confirmed':
      return 'accepted';
    case 'on_the_way':
      return 'arrived';
    case 'in_progress':
      return 'pickedup';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'declined';
    default:
      return 'pending';
  }
}

// Helpers to sync data with Supabase (with fallback if not configured)

/**
 * Sync Driver Profile with Supabase table 'profiles'
 */
export async function getProfileFromSupabase(fallbackProfile: DriverProfile): Promise<DriverProfile> {
  if (!supabase) {
    console.log("Supabase not configured. Using local driver profile.");
    return fallbackProfile;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', 'driver_main')
      .single();

    if (error && error.code === 'PGRST116') {
      // Row doesn't exist, create it
      const newProfileRow = {
        id: 'driver_main',
        name: fallbackProfile.name,
        rating: fallbackProfile.rating,
        trips_count: fallbackProfile.tripsCount,
        seniority: fallbackProfile.seniority,
        vehicle_model: fallbackProfile.vehicleModel,
        vehicle_plate: fallbackProfile.vehiclePlate,
        avatar_initials: fallbackProfile.avatarInitials,
        wallet_balance_fcfa: fallbackProfile.walletBalanceFCFA,
        wave_number: fallbackProfile.withdrawMethods.wave,
        orange_money_number: fallbackProfile.withdrawMethods.orangeMoney,
        bank_iban: fallbackProfile.withdrawMethods.bank
      };

      await supabase.from('profiles').insert([newProfileRow]);
      return fallbackProfile;
    } else if (error) {
      throw error;
    }

    return {
      name: data.name,
      rating: Number(data.rating),
      tripsCount: Number(data.trips_count),
      seniority: data.seniority,
      vehicleModel: data.vehicle_model,
      vehiclePlate: data.vehicle_plate,
      avatarInitials: data.avatar_initials,
      walletBalanceFCFA: Number(data.wallet_balance_fcfa),
      withdrawMethods: {
        wave: data.wave_number || fallbackProfile.withdrawMethods.wave,
        orangeMoney: data.orange_money_number || fallbackProfile.withdrawMethods.orangeMoney,
        bank: data.bank_iban || fallbackProfile.withdrawMethods.bank
      }
    };
  } catch (err) {
    console.error("Error retrieving profile from Supabase: ", err);
    return fallbackProfile;
  }
}

/**
 * Save / Update profile on Supabase table 'profiles'
 */
export async function updateProfileOnSupabase(profile: DriverProfile): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: 'driver_main',
        name: profile.name,
        rating: profile.rating,
        trips_count: profile.tripsCount,
        seniority: profile.seniority,
        vehicle_model: profile.vehicleModel,
        vehicle_plate: profile.vehiclePlate,
        avatar_initials: profile.avatarInitials,
        wallet_balance_fcfa: profile.walletBalanceFCFA,
        wave_number: profile.withdrawMethods.wave,
        orange_money_number: profile.withdrawMethods.orangeMoney,
        bank_iban: profile.withdrawMethods.bank
      });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to update profile on Supabase: ", err);
    return false;
  }
}

/**
 * Sync Real-Time Status in the 'drivers' table
 */
export async function syncDriverStatusOnSupabase(
  isOnline: boolean,
  hasActiveRide: boolean,
  profile: DriverProfile,
  currentZone: string = 'Dakar Centro',
  lat: number = 14.7167,
  lng: number = -17.4479
): Promise<boolean> {
  if (!supabase) return false;

  try {
    let computedStatus: 'available' | 'on_trip' | 'offline' = 'offline';
    if (isOnline) {
      computedStatus = hasActiveRide ? 'on_trip' : 'available';
    }

    const { error } = await supabase
      .from('drivers')
      .upsert({
        id: 'driver_main',
        profile_id: 'driver_main',
        name: profile.name,
        phone: profile.withdrawMethods.wave || '+221 77 123 45 67',
        avatar_initials: profile.avatarInitials,
        vehicle_model: profile.vehicleModel,
        vehicle_plate: profile.vehiclePlate,
        status: computedStatus,
        current_zone: currentZone,
        current_coords_lat: lat,
        current_coords_lng: lng,
        last_seen_at: new Date().toISOString()
      });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to sync status in table 'drivers':", err);
    return false;
  }
}

/**
 * Logs changes to 'ride_history' table
 */
export async function insertRideHistoryLog(
  rideId: string,
  oldStatus: string,
  newStatus: string,
  note: string = 'Mise à jour par l\'application chauffeur'
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('ride_history')
      .insert({
        ride_id: rideId,
        driver_id: 'driver_main',
        old_status: mapLocalStatusToSupabase(oldStatus),
        new_status: mapLocalStatusToSupabase(newStatus),
        changed_by: 'driver',
        note: note
      });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to insert ride history log: ", err);
    return false;
  }
}

/**
 * Sync Scheduled items (stored locally or fallback)
 */
export async function getSchedulesFromSupabase(fallbackSchedules: DriverSchedule[]): Promise<DriverSchedule[]> {
  if (!supabase) return fallbackSchedules;

  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('day', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      // Seed with initial schedules
      const seedRows = fallbackSchedules.map(sch => ({
        id: sch.id,
        day: sch.day,
        time: sch.time,
        route: sch.route,
        is_active: sch.isActive
      }));
      await supabase.from('schedules').insert(seedRows);
      return fallbackSchedules;
    }

    return data.map(row => ({
      id: row.id,
      day: row.day,
      time: row.time,
      route: row.route,
      isActive: row.is_active
    }));
  } catch (err) {
    console.error("Failed to get schedules from Supabase: ", err);
    return fallbackSchedules;
  }
}

/**
 * Save schedule item
 */
export async function saveScheduleOnSupabase(schedule: DriverSchedule): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('schedules')
      .upsert({
        id: schedule.id,
        day: schedule.day,
        time: schedule.time,
        route: schedule.route,
        is_active: schedule.isActive
      });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to save schedule on Supabase: ", err);
    return false;
  }
}

/**
 * Delete schedule item
 */
export async function deleteScheduleOnSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to delete schedule on Supabase: ", err);
    return false;
  }
}

/**
 * Sync Rides with Supabase Table 'rides'
 */
export async function getRidesFromSupabase(fallbackRides: Ride[]): Promise<Ride[]> {
  if (!supabase) return fallbackRides;

  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      // Seed table 'rides' with existing local ride instances
      const seedRows = fallbackRides.map(ride => ({
        id: ride.id,
        client_name: ride.clientName,
        client_phone: ride.clientPhone,
        client_avatar: ride.clientAvatar,
        client_rating: ride.clientRating,
        pickup_location: ride.pickupLocation,
        pickup_coords_lat: yToLat(ride.pickupCoords.y),
        pickup_coords_lng: xToLng(ride.pickupCoords.x),
        dropoff_location: ride.dropoffLocation,
        dropoff_coords_lat: yToLat(ride.dropoffCoords.y),
        dropoff_coords_lng: xToLng(ride.dropoffCoords.x),
        price_fcfa: ride.priceFCFA,
        distance_km: ride.distanceKM,
        duration_minutes: ride.durationMinutes,
        status: mapLocalStatusToSupabase(ride.status),
        driver_id: 'driver_main',
        is_scheduled: ride.isScheduled,
        scheduled_time: ride.scheduledTime || null,
        payment_method: ride.paymentMethod,
        traffic_intensity: ride.trafficIntensity,
        created_time: ride.createdTime,
        ticket_number: ride.ticket_number || null
      }));
      await supabase.from('rides').insert(seedRows);
      return fallbackRides;
    }

    return data.map(row => {
      // Transform table latitude/longitude float values back into local x/y percent coords
      const px = row.pickup_coords_lng ? lngToX(Number(row.pickup_coords_lng)) : 50;
      const py = row.pickup_coords_lat ? latToY(Number(row.pickup_coords_lat)) : 55;
      const dx = row.dropoff_coords_lng ? lngToX(Number(row.dropoff_coords_lng)) : 60;
      const dy = row.dropoff_coords_lat ? latToY(Number(row.dropoff_coords_lat)) : 45;

      return {
        id: row.id,
        clientName: row.client_name,
        clientPhone: row.client_phone || '',
        clientAvatar: row.client_avatar || 'CL',
        clientRating: Number(row.client_rating) || 4.5,
        pickupLocation: row.pickup_location,
        pickupCoords: { x: px, y: py },
        dropoffLocation: row.dropoff_location,
        dropoffCoords: { x: dx, y: dy },
        priceFCFA: Number(row.price_fcfa) || 3000,
        distanceKM: Number(row.distance_km) || 5.0,
        durationMinutes: Number(row.duration_minutes) || 12,
        status: mapSupabaseStatusToLocal(row.status),
        isScheduled: row.is_scheduled || false,
        scheduledTime: row.scheduled_time || undefined,
        paymentMethod: row.payment_method || 'Espèces',
        trafficIntensity: row.traffic_intensity || 'Modéré',
        createdTime: row.created_time || 'Aujourd\'hui',
        messages: [], // Loaded transiently inside standard view
        ticket_number: row.ticket_number || undefined
      };
    });
  } catch (err) {
    console.error("Failed to get rides from Supabase: ", err);
    return fallbackRides;
  }
}

/**
 * Save new or update current ride inside Supabase table 'rides'
 */
export async function saveRideOnSupabase(ride: Ride): Promise<boolean> {
  if (!supabase) return false;

  try {
    const lat_p = yToLat(ride.pickupCoords.y);
    const lng_p = xToLng(ride.pickupCoords.x);
    const lat_d = yToLat(ride.dropoffCoords.y);
    const lng_d = xToLng(ride.dropoffCoords.x);

    const { error } = await supabase
      .from('rides')
      .upsert({
        id: ride.id,
        client_name: ride.clientName,
        client_phone: ride.clientPhone,
        client_avatar: ride.clientAvatar,
        client_rating: ride.clientRating,
        pickup_location: ride.pickupLocation,
        pickup_coords_lat: lat_p,
        pickup_coords_lng: lng_p,
        dropoff_location: ride.dropoffLocation,
        dropoff_coords_lat: lat_d,
        dropoff_coords_lng: lng_d,
        price_fcfa: ride.priceFCFA,
        distance_km: ride.distanceKM,
        duration_minutes: ride.durationMinutes,
        status: mapLocalStatusToSupabase(ride.status),
        is_scheduled: ride.isScheduled,
        scheduled_time: ride.scheduledTime || null,
        payment_method: ride.paymentMethod,
        traffic_intensity: ride.trafficIntensity,
        created_time: ride.createdTime,
        driver_id: (ride.status === 'pending' || ride.status === 'declined') ? null : 'driver_main',
        ticket_number: ride.ticket_number || null
      });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to update ride on Supabase: ", err);
    return false;
  }
}

// SQL helper query instructions text targeting the ready-made table schema
export const SUPABASE_SQL_INSTRUCTIONS = `-- SCRIPT DE CONFIGURATION DES RELATIONS DANS VOTRE SUPABASE SQL EDITOR :

-- S'assurer que les tables sont bien créées et configurées avec leurs structures :
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY DEFAULT 'driver_main',
  name TEXT NOT NULL,
  rating NUMERIC DEFAULT 4.9,
  trips_count INT DEFAULT 0,
  seniority TEXT,
  vehicle_model TEXT,
  vehicle_plate TEXT,
  avatar_initials TEXT,
  wallet_balance_fcfa INT DEFAULT 0,
  wave_number TEXT,
  orange_money_number TEXT,
  bank_iban TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY DEFAULT 'driver_main',
  profile_id TEXT REFERENCES profiles(id),
  name TEXT NOT NULL,
  phone TEXT,
  avatar_initials TEXT,
  vehicle_model TEXT,
  vehicle_plate TEXT,
  status TEXT DEFAULT 'offline', -- 'available' | 'on_trip' | 'offline'
  current_zone TEXT DEFAULT 'Dakar',
  current_coords_lat NUMERIC DEFAULT 14.7167,
  current_coords_lng NUMERIC DEFAULT -17.4479,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS rides (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_avatar TEXT,
  client_rating NUMERIC,
  pickup_location TEXT NOT NULL,
  pickup_coords_lat NUMERIC,
  pickup_coords_lng NUMERIC,
  dropoff_location TEXT NOT NULL,
  dropoff_coords_lat NUMERIC,
  dropoff_coords_lng NUMERIC,
  price_fcfa INT,
  distance_km NUMERIC,
  duration_minutes INT,
  status TEXT NOT NULL, -- 'pending' | 'confirmed' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled'
  driver_id TEXT REFERENCES drivers(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  dispatcher_note TEXT,
  is_scheduled BOOLEAN DEFAULT false,
  scheduled_time TEXT,
  payment_method TEXT,
  traffic_intensity TEXT,
  created_time TEXT,
  ticket_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS ride_history (
  id BIGSERIAL PRIMARY KEY,
  ride_id TEXT REFERENCES rides(id) ON DELETE CASCADE,
  driver_id TEXT REFERENCES drivers(id),
  old_status TEXT,
  new_status TEXT,
  changed_by TEXT, -- 'driver' | 'dispatcher' | 'client'
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  driver_id TEXT REFERENCES drivers(id) ON DELETE CASCADE,
  ride_id TEXT REFERENCES rides(id) ON DELETE CASCADE,
  type TEXT, -- 'ride_assigned' | 'ride_cancelled' | 'new_message' | 'system'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Activez l'écoute en Temps Réel (Realtime) sur les tables 'rides' et 'notifications' !
-- Pour cela, allez dans l'onglet Database -> Replication -> supabase_realtime et activez :
-- - la table 'rides'
-- - la table 'notifications'
`;

