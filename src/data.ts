/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ride, DriverProfile, DriverSchedule } from './types';

// Initial registered chauffeur schedules set in advance
export const INITIAL_DRIVER_SCHEDULES: DriverSchedule[] = [
  { id: "ds-1", day: "Tous les jours", time: "07h30", route: "Dakar (Plateau) ➔ Aéroport AIBD", isActive: true },
  { id: "ds-2", day: "Lun, Mer, Ven", time: "14h00", route: "Dakar (VDN) ➔ Saly Portudal", isActive: true },
  { id: "ds-3", day: "Vendredi", time: "18h15", route: "Aéroport AIBD ➔ Dakar Plateau", isActive: true }
];

// Standard driver profile details
export const INITIAL_DRIVER_PROFILE: DriverProfile = {
  name: "Mamadou Kouyaté",
  rating: 4.92,
  tripsCount: 1482,
  seniority: "2 ans et 4 mois",
  vehicleModel: "Toyota Corolla (Premium Noir)",
  vehiclePlate: "DK-4521-A",
  avatarInitials: "MK",
  walletBalanceFCFA: 68400,
  withdrawMethods: {
    wave: "77 564 89 21",
    orangeMoney: "78 123 45 67",
    bank: "SN012 04512 0001485236 41"
  }
};

// Initial list of trips (simulating pre-existing history)
export const INITIAL_RIDES_HISTORY: Ride[] = [
  {
    id: "hist-1",
    clientName: "Awa Diop",
    clientPhone: "+221 77 451 28 99",
    clientAvatar: "AD",
    clientRating: 4.8,
    pickupLocation: "Sea Plaza, Mermoz",
    pickupCoords: { x: 30, y: 55 },
    dropoffLocation: "Les Almadies, Dakar",
    dropoffCoords: { x: 22, y: 15 },
    priceFCFA: 3200,
    distanceKM: 6.8,
    durationMinutes: 14,
    status: 'completed',
    isScheduled: false,
    paymentMethod: 'Espèces',
    trafficIntensity: 'Modéré',
    createdTime: "Aujourd'hui · 09:12",
    messages: []
  },
  {
    id: "hist-2",
    clientName: "Ousmane Diallo",
    clientPhone: "+221 76 987 65 43",
    clientAvatar: "OD",
    clientRating: 4.7,
    pickupLocation: "Gare de Dakar (TER)",
    pickupCoords: { x: 75, y: 70 },
    dropoffLocation: "Marché Kermel, Plateau",
    dropoffCoords: { x: 80, y: 82 },
    priceFCFA: 1800,
    distanceKM: 2.1,
    durationMinutes: 8,
    status: 'completed',
    isScheduled: false,
    paymentMethod: 'Espèces',
    trafficIntensity: 'Fluide',
    createdTime: "Hier · 17:45",
    messages: []
  },
  {
    id: "hist-3",
    clientName: "Serigne Saliou Ba",
    clientPhone: "+221 70 145 78 88",
    clientAvatar: "SB",
    clientRating: 5.0,
    pickupLocation: "Hôtel Terrou-Bi, Fann",
    pickupCoords: { x: 42, y: 62 },
    dropoffLocation: "Diamniadio Sphères Ministérielles",
    dropoffCoords: { x: 95, y: 35 },
    priceFCFA: 12500,
    distanceKM: 32.4,
    durationMinutes: 38,
    status: 'completed',
    isScheduled: false,
    paymentMethod: 'Espèces',
    trafficIntensity: 'Fluide',
    createdTime: "Hier · 14:20",
    messages: []
  }
];

// Scheduled reservation templates (representing upcoming pre-booked rides)
export const UPCOMING_SCHEDULED_RIDES: Ride[] = [
  {
    id: "sched-1",
    clientName: "Fatou Cissé Diome",
    clientPhone: "+221 77 651 88 44",
    clientAvatar: "FC",
    clientRating: 4.9,
    pickupLocation: "Fann Résidence, Dakar",
    pickupCoords: { x: 38, y: 50 },
    dropoffLocation: "Aéroport AIBD (Départs)",
    dropoffCoords: { x: 90, y: 10 },
    priceFCFA: 18000,
    distanceKM: 48.2,
    durationMinutes: 44,
    status: 'accepted', // Pre-accepted by chauffeur
    isScheduled: true,
    scheduledTime: "Demain · 08h30",
    paymentMethod: 'Espèces',
    trafficIntensity: 'Fluide',
    createdTime: "Aujourd'hui · 11:30",
    messages: []
  },
  {
    id: "sched-2",
    clientName: "Moustapha Ndiaye",
    clientPhone: "+221 78 445 12 12",
    clientAvatar: "MN",
    clientRating: 4.6,
    pickupLocation: "Saly Portudal (Hôtel Club Horizon)",
    pickupCoords: { x: 85, y: 90 },
    dropoffLocation: "Dakar Plateau (Boulevard de la République)",
    dropoffCoords: { x: 78, y: 78 },
    priceFCFA: 25000,
    distanceKM: 74.0,
    durationMinutes: 65,
    status: 'accepted',
    isScheduled: true,
    scheduledTime: "Lundi · 10h15",
    paymentMethod: 'Espèces',
    trafficIntensity: 'Modéré',
    createdTime: "Aujourd'hui · 08:45",
    messages: []
  }
];

// Rich, immersive list of Senegal ride templates used by the simulations.
// Represents a real-time stream of client requests.
export const RIDE_SIMULATION_TEMPLATES = [
  {
    clientName: "Aminata Fall",
    clientPhone: "+221 77 123 45 67",
    clientAvatar: "AF",
    clientRating: 4.9,
    pickupLocation: "Marché Sandaga, Dakar Centre",
    pickupCoords: { x: 74, y: 84 },
    dropoffLocation: "Aéroport International Blaise Diagne (AIBD)",
    dropoffCoords: { x: 92, y: 20 },
    priceFCFA: 16500,
    distanceKM: 52.4,
    durationMinutes: 48,
    paymentMethod: "Espèces",
    trafficIntensity: "Modéré"
  },
  {
    clientName: "Ibrahima Sarr",
    clientPhone: "+221 76 554 12 34",
    clientAvatar: "IS",
    clientRating: 4.8,
    pickupLocation: "Les Almadies (Rond-point Express)",
    pickupCoords: { x: 15, y: 15 },
    dropoffLocation: "Dakar Plateau (Place de l'Indépendance)",
    dropoffCoords: { x: 80, y: 80 },
    priceFCFA: 5500,
    distanceKM: 17.2,
    durationMinutes: 28,
    paymentMethod: "Espèces",
    trafficIntensity: "Saturé"
  },
  {
    clientName: "Khady Sy",
    clientPhone: "+221 70 852 36 90",
    clientAvatar: "KS",
    clientRating: 5.0,
    pickupLocation: "Sacré-Cœur 3 (VDN)",
    pickupCoords: { x: 45, y: 40 },
    dropoffLocation: "Sea Plaza, Fann Résidence",
    dropoffCoords: { x: 30, y: 55 },
    priceFCFA: 2500,
    distanceKM: 5.1,
    durationMinutes: 12,
    paymentMethod: "Espèces",
    trafficIntensity: "Fluide"
  },
  {
    clientName: "Modou Ndiaye",
    clientPhone: "+221 77 987 11 22",
    clientAvatar: "MN",
    clientRating: 4.5,
    pickupLocation: "Diamniadio (Pôle Urbain)",
    pickupCoords: { x: 95, y: 45 },
    dropoffLocation: "Guédiawaye (Hamo 4)",
    dropoffCoords: { x: 55, y: 20 },
    priceFCFA: 9000,
    distanceKM: 31.8,
    durationMinutes: 35,
    paymentMethod: "Espèces",
    trafficIntensity: "Modéré"
  },
  {
    clientName: "Mariama Sow",
    clientPhone: "+221 78 111 22 33",
    clientAvatar: "MS",
    clientRating: 4.7,
    pickupLocation: "Parcelles Assainies (Unité 15)",
    pickupCoords: { x: 50, y: 25 },
    dropoffLocation: "Centenaire, Dakar",
    dropoffCoords: { x: 70, y: 65 },
    priceFCFA: 3800,
    distanceKM: 11.5,
    durationMinutes: 20,
    paymentMethod: "Espèces",
    trafficIntensity: "Saturé"
  },
  {
    clientName: "Papa Aly Diack",
    clientPhone: "+221 76 600 55 99",
    clientAvatar: "PD",
    clientRating: 4.92,
    pickupLocation: "Mbour (Gare Routière)",
    pickupCoords: { x: 90, y: 88 },
    dropoffLocation: "Saly Portudal (Sénégal)",
    dropoffCoords: { x: 86, y: 92 },
    priceFCFA: 3000,
    distanceKM: 7.9,
    durationMinutes: 15,
    paymentMethod: "Espèces",
    trafficIntensity: "Fluide"
  }
];

// Quick conversation simulation messages tailored dynamically if driver chats with client
export const PRESET_CLIENT_TEXTS = [
  "Je suis déjà sur le trottoir, devant la banque.",
  "S'il vous plaît, j'ai une grosse valise pour l'aéroport.",
  "D'accord chef, je vous attends. Vous êtes dans quel véhicule ?",
  "Est-ce que vous avez de la monnaie sur 5 000 FCFA ?",
  "Yéksina (je suis arrivé), je suis en boubou bleu.",
  "C'est noté, j'arrive dans 2 minutes !"
];

export const PRESET_DRIVER_REPLIES = [
  "Bonjour, je suis en route. Je devrais arriver dans quelques minutes.",
  "C'est noté, je serai là bientôt. J'active mes feux de détresse.",
  "Oui, j'accepte uniquement les espèces. Prévoyez l'appoint si possible.",
  "Je suis garé juste devant l'entrée principale.",
  "Parfait, à tout de suite !"
];

// Audio synthesizer singleton to avoid browser blocking and run rings locally
let audioCtx: AudioContext | null = null;
let soundTimeout: number | any = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Programmatically play a notification sounds or taxi ringtone
 * Uses standard OscillatorNode to guarantee sound works without network fetches.
 */
export function playChime(style: 'ride-alert' | 'success' | 'click' | 'decline' | 'arrive-horn') {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    if (style === 'ride-alert') {
      // Periodic ringtone: double pitch beep (e.g. 523Hz (C5) and 659Hz (E5))
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(392.00, now); // G4
      osc2.frequency.exponentialRampToValueAtTime(587.33, now + 0.2); // D5

      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } 
    else if (style === 'success') {
      // Joyful high scale: C5 -> E5 -> G5 -> C6
      const steps = [523.25, 659.25, 783.99, 1046.50];
      const duration = 0.08;
      
      steps.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * duration);
        
        gain.gain.setValueAtTime(0.06, now + i * duration);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * duration + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + i * duration);
        osc.stop(now + i * duration + 0.2);
      });
    }
    else if (style === 'click') {
      // Subtly high key click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    }
    else if (style === 'decline') {
      // Deep low buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.25);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    }
    else if (style === 'arrive-horn') {
      // Playful scooter/car double honk 
      const honk = (timeOffset: number) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(440, now + timeOffset); // A4
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(445, now + timeOffset); // Beats
        
        gain.gain.setValueAtTime(0.08, now + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.12);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start(now + timeOffset);
        osc2.start(now + timeOffset);
        osc1.stop(now + timeOffset + 0.15);
        osc2.stop(now + timeOffset + 0.15);
      };

      honk(0);
      honk(0.18);
    }
  } catch (error) {
    console.warn("Sound blocked/not supported: ", error);
  }
}

/**
 * Loop the VTC alert sound continuously while a condition remains true.
 */
let alertInterval: any = null;
export function startRingtoneLoop() {
  if (alertInterval) return;
  playChime('ride-alert');
  alertInterval = setInterval(() => {
    playChime('ride-alert');
  }, 1000);
}

export function stopRingtoneLoop() {
  if (alertInterval) {
    clearInterval(alertInterval);
    alertInterval = null;
  }
}

/**
 * Text-to-speech speaker to make the notification feel truly alive.
 * Friendly Wolof-French mix voice alerts like: "Fatou Diome, Marché Sandaga vers Aéroport"
 */
export function speakNotification(ride: { clientName: string; pickupLocation: string; dropoffLocation: string; priceFCFA: number }) {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Clears any ongoing speech
      const text = `Nouvelle course de ${ride.clientName}. Pickup : ${ride.pickupLocation.split('(')[0]}. Destination : ${ride.dropoffLocation.split('(')[0]}. Prix d'or : ${ride.priceFCFA} Franc Séfa !`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.05;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.warn("Web Speech API failed: ", e);
  }
}
