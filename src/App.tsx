/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Ride, 
  DriverProfile, 
  ChatMessage,
  DriverSchedule
} from './types';
import { 
  INITIAL_DRIVER_PROFILE, 
  INITIAL_RIDES_HISTORY, 
  UPCOMING_SCHEDULED_RIDES,
  INITIAL_DRIVER_SCHEDULES,
  playChime, 
  startRingtoneLoop, 
  stopRingtoneLoop,
  speakNotification
} from './data';
import BookingSimulator from './components/BookingSimulator';
import SimulatedMap from './components/SimulatedMap';
import WithdrawModal from './components/WithdrawModal';
import {
  isSupabaseConfigured,
  supabase,
  getProfileFromSupabase,
  updateProfileOnSupabase,
  syncDriverStatusOnSupabase,
  insertRideHistoryLog,
  getSchedulesFromSupabase,
  saveScheduleOnSupabase,
  deleteScheduleOnSupabase,
  getRidesFromSupabase,
  saveRideOnSupabase,
  mapSupabaseStatusToLocal,
  SUPABASE_SQL_INSTRUCTIONS
} from './supabaseClient';
import ActiveChat from './components/ActiveChat';

// Modern Lucide-React icons
import { 
  Bell, 
  DollarSign, 
  Star, 
  Car, 
  MapPin, 
  Navigation, 
  User, 
  Smartphone, 
  PhoneCall, 
  TrendingUp, 
  CreditCard,
  Settings, 
  LogOut, 
  CheckCircle, 
  Compass, 
  MessageSquare,
  AlertTriangle,
  Play,
  X,
  Volume2,
  VolumeX,
  Languages,
  ShieldAlert,
  Calendar,
  Plus,
  Trash2,
  Clock,
  Database,
  Ticket
} from 'lucide-react';

export default function App() {
  // Application Data States
  const [profile, setProfile] = useState<DriverProfile>(INITIAL_DRIVER_PROFILE);
  const [rideHistory, setRideHistory] = useState<Ride[]>(INITIAL_RIDES_HISTORY);

  // Dynamic sum of all completed non-payout rides for today
  const todayEarnings = rideHistory
    .filter(r => r.status === 'completed' && !r.id.startsWith('payout-') && !r.createdTime.includes("Hier"))
    .reduce((sum, r) => sum + r.priceFCFA, 0);
  const [scheduledRides, setScheduledRides] = useState<Ride[]>(UPCOMING_SCHEDULED_RIDES);
  const [pendingRides, setPendingRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [activeRides, setActiveRides] = useState<Ride[]>([]);
  const [driverSchedules, setDriverSchedules] = useState<DriverSchedule[]>(INITIAL_DRIVER_SCHEDULES);

  // Form states for creating a new departure schedule
  const [newSchedDay, setNewSchedDay] = useState('Demain');
  const [newSchedTime, setNewSchedTime] = useState('08h00');
  const [newSchedRoute, setNewSchedRoute] = useState('Dakar (Plateau) ➔ Aéroport AIBD');

  // UI Navigation states
  const [activeTab, setActiveTab] = useState<'rides' | 'map' | 'revenues' | 'profil'>('rides');
  const [rideFilter, setRideFilter] = useState<'incoming' | 'scheduled' | 'history'>('incoming');
  const [isDriverOnline, setIsDriverOnline] = useState<boolean>(true);
  const [shownRideAlert, setShownRideAlert] = useState<Ride | null>(null);
  
  // Custom Audio Controls
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [chattingRide, setChattingRide] = useState<Ride | null>(null);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState<boolean>(false);

  // Senegal localization alerts list
  const [notificationLog, setNotificationLog] = useState<{id: string; title: string; desc: string; time: string}[]>([
    { id: '1', title: 'Bonus Vendredi Actif', desc: 'Complétez 5 courses à Dakar de 17h à 21h pour gagner +3 000 FCFA.', time: 'Il y a 2h' },
    { id: '2', title: 'Nouvelle Régulation', desc: 'Frais de péage Dakar-AIBD entièrement remboursés par la plateforme.', time: 'Hier' }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

// SUPABASE LOADING AND Continuous SYNCHRONIZATION
  const [isSupabaseLoading, setIsSupabaseLoading] = useState<boolean>(isSupabaseConfigured);
  const [showSqlInstructions, setShowSqlInstructions] = useState<boolean>(false);

  useEffect(() => {
    async function loadSupabaseData() {
      if (!isSupabaseConfigured) return;
      setIsSupabaseLoading(true);
      try {
        const dbProfile = await getProfileFromSupabase(INITIAL_DRIVER_PROFILE);
        setProfile(dbProfile);

        const dbSchedules = await getSchedulesFromSupabase(INITIAL_DRIVER_SCHEDULES);
        setDriverSchedules(dbSchedules);

        const dbRides = await getRidesFromSupabase(INITIAL_RIDES_HISTORY);
        setRideHistory(dbRides);
      } catch (err) {
        console.error("Error loading mock data from Supabase:", err);
      } finally {
        setIsSupabaseLoading(false);
      }
    }
    loadSupabaseData();
  }, []);

  // SUPABASE REALTIME LISTENERS & STATE SYNCHRONIZATION
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    console.log("Subscribing to Realtime changes on 'rides' and 'notifications' tables...");

    // 1. Subscribe to 'rides' changes
    const rChannel = supabase
      .channel('rides-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides' },
        (payload) => {
          console.log('Realtime change received on rides:', payload);
          const newRow = payload.new as any;
          if (!newRow) return;

          // If the ride is assigned to this driver 'driver_main'
          const isAssignedToUs = newRow.driver_id === 'driver_main';
          
          if (isAssignedToUs) {
            // Restore percent coords back from latitude / longitude
            const px = newRow.pickup_coords_lng ? Math.max(0, Math.min(100, (((Number(newRow.pickup_coords_lng) + 17.53) / 0.55) * 100))) : 50;
            const py = newRow.pickup_coords_lat ? Math.max(0, Math.min(100, (((14.77 - Number(newRow.pickup_coords_lat)) / 0.35) * 100))) : 55;
            const dx = newRow.dropoff_coords_lng ? Math.max(0, Math.min(100, (((Number(newRow.dropoff_coords_lng) + 17.53) / 0.55) * 100))) : 60;
            const dy = newRow.dropoff_coords_lat ? Math.max(0, Math.min(100, (((14.77 - Number(newRow.dropoff_coords_lat)) / 0.35) * 100))) : 45;

            const mappedRide: Ride = {
              id: newRow.id,
              clientName: newRow.client_name,
              clientPhone: newRow.client_phone || '',
              clientAvatar: newRow.client_avatar || 'CL',
              clientRating: Number(newRow.client_rating) || 4.7,
              pickupLocation: newRow.pickup_location,
              pickupCoords: { x: px, y: py },
              dropoffLocation: newRow.dropoff_location,
              dropoffCoords: { x: dx, y: dy },
              priceFCFA: Number(newRow.price_fcfa) || 3000,
              distanceKM: Number(newRow.distance_km) || 5.0,
              durationMinutes: Number(newRow.duration_minutes) || 12,
              status: mapSupabaseStatusToLocal(newRow.status),
              isScheduled: newRow.is_scheduled || false,
              scheduledTime: newRow.scheduled_time || undefined,
              paymentMethod: newRow.payment_method || 'Espèces',
              trafficIntensity: newRow.traffic_intensity || 'Modéré',
              createdTime: newRow.created_time || 'À l\'instant',
              messages: [],
              ticket_number: newRow.ticket_number || undefined
            };

            if (newRow.status === 'confirmed') {
              // Assigned by dispatcher! Add to activeRides list if not exists
              setActiveRides(prev => {
                const exists = prev.some(r => r.id === mappedRide.id);
                if (exists) return prev;

                playChime('success');
                speakNotification(mappedRide);

                return [mappedRide, ...prev];
              });

              setActiveRide(mappedRide);
              setActiveTab('map');

              setNotificationLog(nPrev => [
                {
                  id: Date.now().toString(),
                  title: 'Course Assignée d\'Office 🚖',
                  desc: `Course de ${mappedRide.clientName} assignée par le dispatcher : ${mappedRide.pickupLocation} ➔ ${mappedRide.dropoffLocation}`,
                  time: "À l'instant"
                },
                ...nPrev
              ]);
            } else if (newRow.status === 'cancelled') {
              setActiveRides(prev => prev.filter(r => r.id !== mappedRide.id));
              setPendingRides(prev => prev.filter(r => r.id !== mappedRide.id));
              if (activeRide?.id === mappedRide.id) {
                setActiveRide(null);
                setActiveTab('rides');
              }
              playChime('decline');
              alert(`🚨 Course annulée par le dispatcher : ${mappedRide.clientName}`);
            } else if (newRow.status === 'on_the_way') {
              setActiveRides(prev => prev.map(r => r.id === mappedRide.id ? { ...r, status: 'accepted' as const } : r));
            } else if (newRow.status === 'in_progress') {
              setActiveRides(prev => prev.map(r => r.id === mappedRide.id ? { ...r, status: 'pickedup' as const } : r));
            } else if (newRow.status === 'completed') {
              setActiveRides(prev => prev.filter(r => r.id !== mappedRide.id));
              if (activeRide?.id === mappedRide.id) {
                setActiveRide(null);
                setActiveTab('revenues');
              }
            }
          }
        }
      )
      .subscribe();

    // 2. Subscribe to 'notifications' changes
    const nChannel = supabase
      .channel('notifications-realtime-inserter')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('Realtime new notification received:', payload);
          const notif = payload.new as any;
          if (!notif || notif.driver_id !== 'driver_main') return;

          setNotificationLog(prev => [
            {
              id: notif.id ? notif.id.toString() : Date.now().toString(),
              title: notif.title || 'Notification',
              desc: notif.body || '',
              time: "À l'instant"
            },
            ...prev
          ]);

          playChime('success');
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(rChannel);
        supabase.removeChannel(nChannel);
      }
    };
  }, [activeRide?.id]);

  // Synchronize dynamic status changes of Chauffeur with the 'drivers' table
  useEffect(() => {
    if (isSupabaseLoading) return;
    const hasActive = activeRides.length > 0;
    
    // Periodically update the driver online/trip availability status
    syncDriverStatusOnSupabase(isDriverOnline, hasActive, profile);
  }, [isDriverOnline, activeRides.length, profile, isSupabaseLoading]);

  // Synchronize profile changes to Supabase
  useEffect(() => {
    if (isSupabaseLoading) return;
    updateProfileOnSupabase(profile);
  }, [profile, isSupabaseLoading]);

  // Synchronize schedules to Supabase
  useEffect(() => {
    if (isSupabaseLoading) return;
    driverSchedules.forEach(sched => {
      saveScheduleOnSupabase(sched);
    });
  }, [driverSchedules, isSupabaseLoading]);

  // Listen to new dynamic passenger requests from simulator
  const handleTriggerRide = (newRide: Ride) => {
    if (!isDriverOnline) {
      alert("⚠️ Vous êtes actuellement HORS LIGNE. Veuillez passer 'En ligne' sur l'application chauffeur pour recevoir des courses.");
      playChime('decline');
      return;
    }

    if (activeRides.length >= 4) {
      alert("⚠️ Vos 4 places de transport en commun sont déjà pleines ! Veuillez d'abord libérer une place en complétant un trajet.");
      playChime('decline');
      return;
    }

    // Add trip to driver pending queue
    setPendingRides(prev => [newRide, ...prev]);
    setShownRideAlert(newRide);

    // Audio indicators
    if (!isAudioMuted) {
      startRingtoneLoop();
      speakNotification(newRide);
    }
    
    // Automatically focus the incoming requests overview segment
    setActiveTab('rides');
    setRideFilter('incoming');
  };

  // Turn off the ringing
  const handleDeclineRide = (rideId: string) => {
    const origRide = pendingRides.find(r => r.id === rideId);
    setPendingRides(prev => prev.filter(r => r.id !== rideId));
    if (shownRideAlert?.id === rideId) {
      setShownRideAlert(null);
      stopRingtoneLoop();
    }
    playChime('decline');

    if (origRide) {
      const cancelledRide = { ...origRide, status: 'declined' as const };
      saveRideOnSupabase(cancelledRide);
      insertRideHistoryLog(rideId, origRide.status, 'declined', "Course déclinée par le chauffeur.");
    }
  };

  // Turn off ringtone, accept as a pre-booked scheduled ride in their list
  const handleAcceptRide = (ride: Ride) => {
    stopRingtoneLoop();
    setShownRideAlert(null);
    
    // Set this ride as confirmed pre-booked scheduled ride
    const acceptedRide: Ride = {
      ...ride,
      status: 'accepted',
      messages: [
        { id: 'sys-start', sender: 'system', text: `Réservation planifiée acceptée pour le ${ride.scheduledTime || 'départ prévu'}.`, time: "À l'instant" }
      ]
    };

    setScheduledRides(prev => [acceptedRide, ...prev]);
    setPendingRides(prev => prev.filter(r => r.id !== ride.id));
    
    // Sync with Supabase
    saveRideOnSupabase(acceptedRide);
    insertRideHistoryLog(ride.id, ride.status, 'accepted', "Course acceptée en réservation planifiée.");

    // Redirect view to "Bientôt" (scheduled list) tab
    setActiveTab('rides');
    setRideFilter('scheduled');
    playChime('success');

    alert(`📅 Réservation de ${ride.clientName} acceptée avec succès !\nDépart prévu : ${ride.scheduledTime || 'à l\'avance'}.\nRetrouvez-la dans l'onglet "Bientôt".`);
  };

  // Launch navigation for a scheduled ride from "Bientôt" list
  const handleStartScheduledRide = (ride: Ride) => {
    if (activeRides.length >= 4) {
      alert("🚗 Toutes les 4 places de votre transport en commun sont occupées ! Veuillez d'abord terminer un trajet en cours.");
      playChime('decline');
      return;
    }

    // Set as active ride
    const startedRide: Ride = {
      ...ride,
      status: 'accepted',
      messages: [
        { id: 'sys-start-now', sender: 'system', text: "Course réservée démarrée. Récupérez le client.", time: "À l'instant" }
      ]
    };

    setActiveRides(prev => [...prev, startedRide]);
    setActiveRide(startedRide);
    setScheduledRides(prev => prev.filter(r => r.id !== ride.id));
    
    // Sync with Supabase
    saveRideOnSupabase(startedRide);
    insertRideHistoryLog(ride.id, 'pending', 'accepted', "Démarrage de la course planifiée.");

    setActiveTab('map');
    playChime('success');
  };

  // Chauffeur customized schedule slots helpers
  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const newSchedule: DriverSchedule = {
      id: "ds-" + Date.now().toString(),
      day: newSchedDay,
      time: newSchedTime,
      route: newSchedRoute,
      isActive: true
    };
    setDriverSchedules(prev => [newSchedule, ...prev]);
    playChime('success');
    alert(`📅 Votre disponibilité de départ sous forme planifiée a été enregistrée : ${newSchedDay} à ${newSchedTime}.`);
  };

  const handleToggleSchedule = (id: string) => {
    setDriverSchedules(prev => prev.map(sched => 
      sched.id === id ? { ...sched, isActive: !sched.isActive } : sched
    ));
    playChime('click');
  };

  const handleDeleteSchedule = (id: string) => {
    setDriverSchedules(prev => prev.filter(sched => sched.id !== id));
    deleteScheduleOnSupabase(id);
    playChime('decline');
  };

  // Handle active status sequence for individual clients in the public collective transit
  const handleUpdateIndividualRideStatus = (rideId: string, nextStatus: Ride['status']) => {
    const targetRide = activeRides.find(r => r.id === rideId);
    if (!targetRide) return;

    const oldStatus = targetRide.status;

    if (nextStatus === 'completed') {
      // Complete the trip, credit the wallet!
      const finalRide = { ...targetRide, status: 'completed' as const };
      
      setRideHistory(prev => [finalRide, ...prev]);
      
      // Credit wallet balance by FCFA price minus 15% platform commission
      const commission = Math.round(finalRide.priceFCFA * 0.15);
      const earned = finalRide.priceFCFA - commission;
      
      setProfile(prev => ({
        ...prev,
        walletBalanceFCFA: prev.walletBalanceFCFA + earned,
        tripsCount: prev.tripsCount + 1
      }));

      // Filter out this ride from activeRides list
      const updatedRides = activeRides.filter(r => r.id !== rideId);
      setActiveRides(updatedRides);

      // Save to Supabase
      saveRideOnSupabase(finalRide);
      insertRideHistoryLog(rideId, oldStatus, 'completed', "Course complétée à destination. Transaction validée.");

      // Manage activeRide focus mapping update
      if (activeRide?.id === rideId) {
        if (updatedRides.length > 0) {
          setActiveRide(updatedRides[0]);
        } else {
          setActiveRide(null);
          setChattingRide(null);
          // Redirect to revenues page so the driver can see their money
          setActiveTab('revenues');
        }
      }
      
      playChime('success');
      alert(`🎉 Arrivée à destination pour ${finalRide.clientName} ! Place libérée. Revenu net crédité : +${earned} FCFA.`);
    } else {
      // Just step update (arrived, pickedup, etc.)
      const textMap = {
        'arrived': "Vous êtes arrivés au point de rendez-vous. Le client a été notifié.",
        'pickedup': "Client à bord. En route vers la destination !"
      };

      const systemMsg: ChatMessage = {
        id: "sys-" + Date.now().toString(),
        sender: 'system',
        text: textMap[nextStatus as 'arrived' | 'pickedup'] || "Statut mis à jour",
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };

      const updatedRides = activeRides.map(r => {
        if (r.id === rideId) {
          const updated = {
            ...r,
            status: nextStatus,
            messages: [...r.messages, systemMsg]
          };
          if (activeRide?.id === rideId) {
            setActiveRide(updated);
          }

          // Save updated status to Supabase and log historical updates
          saveRideOnSupabase(updated);
          insertRideHistoryLog(rideId, oldStatus, nextStatus, `Statut de la course mis à jour vers: ${nextStatus}.`);

          return updated;
        }
        return r;
      });

      setActiveRides(updatedRides);
      playChime('click');
    }
  };

  // Wrapper for map components or standard callbacks
  const handleUpdateRideStatus = (nextStatus: Ride['status']) => {
    if (!activeRide) return;
    handleUpdateIndividualRideStatus(activeRide.id, nextStatus);
  };

  // Simulate in-app chat messaging
  const handleSendChatMessage = (msg: ChatMessage) => {
    if (!activeRide) return;
    
    const updatedRide = {
      ...activeRide,
      messages: [...activeRide.messages, msg]
    };

    setActiveRide(updatedRide);
    setActiveRides(prev => prev.map(r => r.id === activeRide.id ? updatedRide : r));
  };

  const activeIncomingAlert = pendingRides.length > 0 ? pendingRides[0] : null;

  // Track state changes to trigger ringtone loops cleanly
  useEffect(() => {
    if (pendingRides.length === 0) {
      stopRingtoneLoop();
      setShownRideAlert(null);
    }
  }, [pendingRides]);

  // Audio muting / unmuting switcher
  const toggleMute = () => {
    const isNowMuted = !isAudioMuted;
    setIsAudioMuted(isNowMuted);
    if (isNowMuted) {
      stopRingtoneLoop();
    } else if (pendingRides.length > 0) {
      startRingtoneLoop();
    }
    playChime('click');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex items-center justify-center p-0 md:p-6" id="galsen-vtc-root">
      
      {/* Main dual portal window layout */}
      <main className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-6" id="vtc-dashboard-mesh">
        
        {/* LEFT COLUMN: THE SIMULATED PHONE DEVICE */}
        <section className="flex flex-col items-center w-full max-w-[390px]">
          
          {/* Main phone body: border-0 on mobile for real PWA feel, bordered on desktop */}
          <div className="w-full max-w-[390px] min-h-[100dvh] md:min-h-[740px] md:max-h-[844px] bg-slate-950 md:rounded-[48px] border-0 md:border-[10px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col text-slate-900" id="driver-phone-device">
            
            {/* Phone notch & dynamic island indicator (only visible on desktop wrapper) */}
            <div className="absolute top-0 inset-x-0 h-4 bg-slate-950 hidden md:flex justify-center z-50">
              <div className="w-28 h-4 bg-slate-950 rounded-b-xl relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 bg-slate-900 rounded-full border border-slate-800 absolute right-8"></span>
                <span className="w-1.5 h-1.5 bg-sky-950 rounded-full border border-sky-400 absolute right-3"></span>
              </div>
            </div>



            {/* Custom Interactive applet notification panel */}
            {showNotifications && (
              <div className="absolute top-10 inset-x-0 bg-white shadow-lg border-b border-slate-100 z-50 p-4 animate-in slide-in-from-top duration-300">
                <div className="flex items-center justify-between border-b pb-2 mb-2">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-emerald-600" /> Notifications Recrutement
                  </h4>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 text-xs font-bold">Fermer</button>
                </div>
                <div className="space-y-3">
                  {notificationLog.map(notif => (
                    <div key={notif.id} className="text-xs bg-slate-50 p-2.5 rounded-xl">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-slate-800">{notif.title}</span>
                        <span className="text-[9px] text-slate-400">{notif.time}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{notif.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Application Main Top Header inside the App wrapper */}
            <div className="bg-indigo-900 text-white px-5 pb-5 pt-3 flex flex-col space-y-4 shadow" id="driver-app-topbar">
              <div className="flex items-center justify-between">
                
                {/* Profile card with online indicator */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E2B13C]/20 border-2 border-[#E2B13C]/80 flex items-center justify-center font-black text-[#E2B13C] text-sm tracking-wider">
                    {profile.avatarInitials}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-100 leading-tight">{profile.name}</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`h-2 w-2 rounded-full inline-block ${isDriverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`}></span>
                      <span className="text-[10px] font-semibold text-indigo-200">
                        {isDriverOnline ? "Disponible (En ligne)" : "Hors ligne (Indisponible)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notifications & Sound bells */}
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => { setShowNotifications(!showNotifications); playChime('click'); }}
                    className="p-2 bg-indigo-950/40 hover:bg-slate-800/40 rounded-full border border-indigo-700/50 text-indigo-100 cursor-pointer relative"
                    aria-label="Alerts log"
                  >
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500"></span>
                  </button>
                </div>
              </div>

              {/* Status control box and mini balance counter */}
              <div className="bg-indigo-950 p-2.5 rounded-2xl flex items-center justify-between border border-indigo-800/40">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold block">SOLDE COMPTE</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">{profile.walletBalanceFCFA.toLocaleString('fr-FR')} FCFA</span>
                </div>

                {/* Online driver Toggle switcher */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-300">Statut</span>
                  <button
                    onClick={() => {
                      setIsDriverOnline(!isDriverOnline);
                      playChime('click');
                      if (isDriverOnline) {
                        stopRingtoneLoop();
                        setPendingRides([]);
                      }
                    }}
                    className={`w-11 h-6 rounded-full relative transition-colors duration-305 flex items-center p-0.5 cursor-pointer ${
                      isDriverOnline ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    id="driver-online-switch"
                  >
                    <span className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                      isDriverOnline ? 'translate-x-5' : 'translate-x-0'
                    }`}></span>
                  </button>
                </div>
              </div>
            </div>

            {/* SCREEN PORTAL VIEW BODY CELL */}
            <div className="flex-1 bg-slate-50 overflow-y-auto flex flex-col" id="device-screen-core">
              
              {/* Conditional Screen tabs renderer */}

              {/* TAB 1: NEW INCOMING RESERVATIONS */}
              {activeTab === 'rides' && (
                <div className="p-4 space-y-4 flex-1 animate-in fade-in duration-200" id="screen-rides-tab">
                  
                  {/* Internal subtab headers (demandes du Sénégal, planifiées, historique) */}
                  <div className="flex bg-slate-200/60 p-1 rounded-xl gap-1">
                    <button
                      onClick={() => { setRideFilter('incoming'); playChime('click'); }}
                      className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        rideFilter === 'incoming' ? 'bg-indigo-900 text-white shadow' : 'text-slate-600'
                      }`}
                      id="subtab-incoming-rides"
                    >
                      Alertes ({pendingRides.length})
                    </button>
                    <button
                      onClick={() => { setRideFilter('scheduled'); playChime('click'); }}
                      className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        rideFilter === 'scheduled' ? 'bg-indigo-900 text-white shadow' : 'text-slate-600'
                      }`}
                      id="subtab-planned-rides"
                    >
                      Bientôt ({scheduledRides.length})
                    </button>
                    <button
                      onClick={() => { setRideFilter('history'); playChime('click'); }}
                      className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        rideFilter === 'history' ? 'bg-indigo-900 text-white shadow' : 'text-slate-600'
                      }`}
                      id="subtab-history-rides"
                    >
                      Livrées ({rideHistory.length})
                    </button>
                  </div>

                  {/* SUBTAB 1.1: LIVING INCOMING ALERTS */}
                  {rideFilter === 'incoming' && (
                    <div className="space-y-3 flex flex-col">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Demandes en attente d'acceptation</h3>
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">Activité intense</span>
                      </div>

                      {pendingRides.length === 0 ? (
                        <div className="bg-white border rounded-3xl p-8 text-center space-y-3 shadow-sm border-slate-100">
                          <Compass className="h-10 w-10 text-slate-300 mx-auto animate-spin-slow" />
                          <h4 className="text-xs font-bold text-slate-800">Aucune nouvelle demande</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Les réservations de Dakar apparaitront ici en temps réel dès que l'un des clients placera une commande.
                          </p>
                          <div className="bg-indigo-50/50 p-2.5 rounded-2xl border border-indigo-100 text-[10px] text-indigo-700 font-medium">
                            💡 Utilisez le <strong>Simulateur Client</strong> à droite pour lancer une réservation de test !
                          </div>
                        </div>
                      ) : (
                        pendingRides.map((ride) => {
                          const initials = ride.clientName
                            ? ride.clientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                            : 'AF';
                          return (
                            <div 
                              key={ride.id} 
                              className="bg-white border border-slate-200 border-l-3 border-l-[#E24B4A] rounded-r-2xl rounded-l-none p-4 mb-3 shadow-xs flex flex-col relative animate-in fade-in slide-in-from-bottom-2 duration-300"
                              id={`alert-card-${ride.id}`}
                            >
                              {/* Top row with client and price */}
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-[34px] h-[34px] rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    {initials}
                                  </div>
                                  <div className="text-left">
                                    <div className="font-semibold text-slate-800 text-sm leading-tight">{ride.clientName}</div>
                                    <div className="text-xs text-slate-400 font-medium">{ride.clientPhone}</div>
                                  </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                  <div className="text-base font-semibold text-[#1A2B4A]">
                                    {ride.priceFCFA.toLocaleString('fr-FR')} FCFA
                                  </div>
                                  {ride.ticket_number && (
                                    <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded px-1.5 py-0.5 text-[9px] font-bold font-mono mt-1">
                                      <Ticket className="h-3 w-3 text-emerald-700" />
                                      TKT-{ride.ticket_number}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Route stops visually matching the model */}
                              <div className="flex flex-col gap-1 mb-3">
                                <div className="flex items-center gap-2 text-[13px]">
                                  <div className="w-2 h-2 rounded-full bg-[#1D9E75] shrink-0"></div>
                                  <span className="text-slate-800 text-left truncate">{ride.pickupLocation}</span>
                                </div>
                                <div style={{ display: 'flex' }}>
                                  <div className="w-2 flex justify-center">
                                    <div className="w-[1px] h-3 bg-slate-200"></div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-[13px]">
                                  <div className="w-2 h-2 rounded-full bg-[#E24B4A] shrink-0"></div>
                                  <span className="text-slate-500 text-left truncate">{ride.dropoffLocation}</span>
                                </div>
                              </div>

                              {/* Card action footer containing three distinct possibilities */}
                              <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 gap-2">
                                <a 
                                  href={`tel:${ride.clientPhone}`}
                                  onClick={() => playChime('click')}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border border-[#1D9E75] bg-[#E1F5EE] text-[#085041] hover:bg-[#d2f0e5] transition-all cursor-pointer whitespace-nowrap"
                                >
                                  <PhoneCall className="h-3.5 w-3.5 shrink-0" />
                                  <span>Appeler</span>
                                </a>
                                
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleDeclineRide(ride.id)}
                                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-transparent text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                                    id={`btn-decline-ride-${ride.id}`}
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    onClick={() => handleAcceptRide(ride)}
                                    className="px-4 py-1.5 rounded-lg text-xs font-bold border-none bg-[#1A2B4A] hover:bg-[#121f35] text-white transition-colors cursor-pointer"
                                    id={`btn-accept-ride-${ride.id}`}
                                  >
                                    Accepter
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* SUBTAB 1.2: UPCOMING CHAUFFEUR PLANIFICATION BOOKINGS */}
                  {rideFilter === 'scheduled' && (
                    <div className="space-y-4 flex flex-col">
                      
                      {/* Interactive schedule slot register widget */}
                      <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 border border-indigo-800 text-white rounded-3xl p-4.5 shadow-md space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-indigo-300">
                            <Clock className="h-4 w-4 text-amber-400" />
                            Mes Horaires de Départ Prévus
                          </h4>
                          <span className="text-[10px] bg-emerald-500/80 text-white font-bold px-2.5 py-0.5 rounded-full font-mono text-[9px]">
                            {driverSchedules.filter(s => s.isActive).length} ACTIFS
                          </span>
                        </div>
                        
                        <p className="text-[11px] text-indigo-200/90 leading-relaxed">
                          Déclarez vos horaires de départ à l'avance pour permettre aux clients de réserver vos trajets réguliers.
                        </p>

                        {/* Quick form */}
                        <form onSubmit={handleAddSchedule} className="bg-indigo-900/40 p-3 rounded-2xl border border-indigo-700/60 space-y-2.5 text-slate-800">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="block text-[9px] font-extrabold text-indigo-200 uppercase mb-1">Jour</label>
                              <select
                                value={newSchedDay}
                                onChange={(e) => setNewSchedDay(e.target.value)}
                                className="w-full text-xs p-1.5 rounded-lg bg-indigo-950 border border-indigo-700 font-semibold focus:outline-amber-500 text-indigo-100"
                              >
                                <option value="Tous les jours">Tous les jours 📅</option>
                                <option value="Demain">Demain 🌅</option>
                                <option value="Lundi prochain">Lundi prochain 📅</option>
                                <option value="Mardi prochain">Mardi prochain 📅</option>
                                <option value="Mercredi prochain">Mercredi prochain 📅</option>
                                <option value="Jeudi prochain">Jeudi prochain 📅</option>
                                <option value="Vendredi spécial">Vendredi spécial 🕌</option>
                                <option value="Week-end">Week-end 🌴</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-[9px] font-extrabold text-indigo-200 uppercase mb-1">Heure de départ</label>
                              <input
                                type="text"
                                value={newSchedTime}
                                onChange={(e) => setNewSchedTime(e.target.value)}
                                placeholder="08h30"
                                className="w-full text-xs p-1.5 rounded-lg bg-indigo-950 border border-indigo-700 font-bold focus:outline-amber-500 text-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-extrabold text-indigo-200 uppercase mb-1">Trajet Planifié</label>
                            <select
                              value={newSchedRoute}
                              onChange={(e) => setNewSchedRoute(e.target.value)}
                              className="w-full text-xs p-1.5 rounded-lg bg-indigo-950 border border-indigo-700 font-semibold focus:outline-amber-500 text-indigo-100"
                            >
                              <option value="Dakar (Plateau) ➔ Aéroport AIBD">Dakar (Plateau) ➔ Aéroport AIBD ✈️</option>
                              <option value="Dakar (VDN) ➔ Saly Portudal">Dakar (VDN) ➔ Saly Portudal 🌴</option>
                              <option value="Aéroport AIBD ➔ Dakar Plateau">Aéroport AIBD ➔ Dakar Plateau 🏙️</option>
                              <option value="Saly Portudal ➔ Dakar Centre">Saly Portudal ➔ Dakar Centre 🛍️</option>
                              <option value="Dakar ➔ Touba Mbacké">Dakar ➔ Touba Mbacké 🕌</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Programmer mon Horaire de Départ
                          </button>
                        </form>

                        {/* List of custom driver schedules */}
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {driverSchedules.map(sched => (
                            <div key={sched.id} className="bg-indigo-950/50 p-2.5 rounded-xl border border-indigo-800/80 flex items-center justify-between text-xs">
                              <div className="text-left">
                                <p className="font-bold text-amber-400 text-xs">
                                  {sched.day} · {sched.time}
                                </p>
                                <p className="text-[10px] text-indigo-200 mt-0.5 truncate max-w-[200px]">
                                  {sched.route}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSchedule(sched.id)}
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                                    sched.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-500/20 text-slate-400'
                                  }`}
                                >
                                  {sched.isActive ? 'Actif' : 'Off'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSchedule(sched.id)}
                                  className="text-indigo-400 hover:text-rose-400 p-1 rounded-lg transition-colors cursor-pointer"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Confirmed reservations section */}
                      <div className="flex items-center justify-between pt-1">
                        <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Réservations planifiées confirmées</h3>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Prêtes à l'avance</span>
                      </div>

                      {scheduledRides.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-6">Aucune réservation planifiée sur votre calendrier.</p>
                      ) : (
                        scheduledRides.map(ride => (
                          <div 
                            key={ride.id} 
                            className="bg-white border border-slate-200 border-l-4 border-l-[#1D9E75] rounded-r-2xl rounded-l-none p-4 mb-2.5 shadow-sm flex flex-col relative animate-in fade-in duration-300"
                            id={`scheduled-card-${ride.id}`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-[34px] h-[34px] rounded-full bg-[#FAEEDA] text-[#633806] flex items-center justify-center font-bold text-xs shrink-0 border border-[#f5dfb8]">
                                  {ride.clientAvatar}
                                </div>
                                <div className="text-left">
                                  <div className="font-semibold text-slate-800 text-sm leading-tight">{ride.clientName}</div>
                                  <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                                    <Clock className="h-3 w-3" /> {ride.scheduledTime || 'Réservation anticipée'}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end">
                                <div className="text-sm font-bold text-[#1A2B4A] font-sans">
                                  {ride.priceFCFA.toLocaleString('fr-FR')} FCFA
                                </div>
                                {ride.ticket_number ? (
                                  <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded px-1.5 py-0.5 text-[9px] font-bold font-mono mt-1">
                                    <Ticket className="h-3 w-3 text-emerald-700" />
                                    TKT-{ride.ticket_number}
                                  </span>
                                ) : (
                                  <span className="inline-block py-0.5 px-2.5 rounded-full text-[9px] font-bold bg-[#E1F5EE] text-[#085041] mt-0.5">
                                    Confirmée
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-1 mb-3.5">
                              <div className="flex items-center gap-2 text-xs">
                                <div className="w-2 h-2 rounded-full bg-[#1D9E75] shrink-0"></div>
                                <span className="text-slate-800 font-medium truncate text-left">De : {ride.pickupLocation}</span>
                              </div>
                              <div className="flex pl-[3.5px]">
                                <div className="w-[1px] h-3 bg-slate-200"></div>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <div className="w-2 h-2 rounded-full bg-[#E24B4A] shrink-0"></div>
                                <span className="text-slate-500 font-medium truncate text-left">À : {ride.dropoffLocation}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 gap-2">
                              <a 
                                href={`tel:${ride.clientPhone}`}
                                onClick={() => playChime('click')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-[#1D9E75] bg-[#E1F5EE] text-[#085041] hover:bg-[#d2f0e5] transition-all cursor-pointer whitespace-nowrap"
                              >
                                <PhoneCall className="h-3.5 w-3.5 shrink-0" />
                                <span>Appeler</span>
                              </a>
                              
                              <button
                                onClick={() => handleStartScheduledRide(ride)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                              >
                                <Play className="h-3 w-3 fill-current" />
                                Démarrer la Course
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* SUBTAB 1.3: HISTORY READ */}
                  {rideFilter === 'history' && (
                    <div className="space-y-3 flex flex-col">
                      <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Courses terminées récemment</h3>
                      
                      {rideHistory.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-6">Historique vide.</p>
                      ) : (
                        rideHistory.map((ride, i) => (
                          <div 
                            key={ride.id || i}
                            className="bg-white border border-slate-200 border-l-3 border-l-slate-400 rounded-r-2xl rounded-l-none p-3.5 mb-2.5 shadow-sm flex flex-col"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-[34px] h-[34px] rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  {ride.clientAvatar}
                                </div>
                                <div className="text-left">
                                  <div className="font-semibold text-slate-800 text-sm leading-tight">{ride.clientName}</div>
                                  <div className="text-[10px] text-slate-400">{ride.createdTime}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-slate-700 font-mono">
                                  {ride.priceFCFA.toLocaleString('fr-FR')} FCFA
                                </div>
                                <span className="inline-block py-0.5 px-2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                  Payé
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1 bg-slate-50 p-2 rounded-xl text-xs border border-slate-100/50">
                              <div className="truncate text-slate-700 text-left">
                                <span className="font-bold text-[#1D9E75]">De :</span> {ride.pickupLocation || 'Guichet'}
                              </div>
                              <div className="truncate text-slate-500 text-left">
                                <span className="font-bold text-[#E24B4A]">À :</span> {ride.dropoffLocation}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SIMULATED CARTE WITH INTERACTIVE TRAVEL COMPONENT */}
              {activeTab === 'map' && (
                <div className="flex-1 flex flex-col animate-in fade-in duration-200" id="screen-map-tab">
                  
                  {/* Public transport banner indicator */}
                  <div className="bg-[#1D9E75]/10 border-b border-[#1D9E75]/20 p-2 px-3 text-xs flex justify-between items-center shrink-0">
                    <span className="font-bold text-[#085041] flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                      <Car className="h-4 w-4 text-[#1D9E75]" />
                      🚍 Transport Collectif Public (4 Places Max)
                    </span>
                    <span className="font-bold bg-indigo-900 text-white text-[9px] px-2 py-0.5 rounded-full font-mono animate-pulse">
                      {activeRides.length} / 4 SIÈGES
                    </span>
                  </div>

                  {/* Wrapper for the map with stable heights */}
                  <div className="h-[270px] shrink-0 relative border-b border-slate-200">
                    <SimulatedMap 
                      activeRide={activeRide}
                      onUpdateRideStatus={handleUpdateRideStatus}
                    />

                    {/* Chat widget floated on the map */}
                    {activeRide && (
                      <div className="absolute top-2 right-2 left-2 z-35" id="nested-chat-floating-deck">
                        {chattingRide ? (
                          <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                            <div className="flex justify-between items-center px-2 py-1 bg-slate-100 border-b text-[9px] font-bold text-slate-700">
                              <span>Messagerie : {activeRide.clientName}</span>
                              <button onClick={() => setChattingRide(null)} className="p-0.5 hover:bg-slate-200 rounded-full">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                            <ActiveChat 
                              activeRide={activeRide}
                              onSendMessage={handleSendChatMessage}
                              onClose={() => setChattingRide(null)}
                            />
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Interactive collective seats & passenger lists */}
                  <div className="flex-1 overflow-y-auto bg-slate-50 p-2.5 space-y-2.5 flex flex-col">
                    
                    {/* Visual 4-Seat occupancy representation */}
                    <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                      <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest text-left">
                        Configuration des Sièges (Maximum 4 places)
                      </p>
                      
                      <div className="grid grid-cols-4 gap-1.5">
                        {[0, 1, 2, 3].map(index => {
                          const seatOccupant = activeRides[index];
                          const isOccupied = !!seatOccupant;
                          const isFocused = isOccupied && activeRide?.id === seatOccupant.id;

                          return (
                            <button
                              key={index}
                              onClick={() => {
                                if (isOccupied) {
                                  setActiveRide(seatOccupant);
                                  playChime('click');
                                } else {
                                  alert(`💺 Place ${index + 1} est actuellement libre.\nVous pouvez démarrer une réservation planifiée depuis l'onglet "Courses" pour remplir cette place !`);
                                  playChime('decline');
                                }
                              }}
                              className={`p-2 rounded-xl flex flex-col items-center justify-center border transition-all text-center cursor-pointer ${
                                isOccupied 
                                  ? isFocused 
                                    ? 'bg-[#1D9E75]/10 border-[#1D9E75] text-[#085041] ring-2 ring-[#1D9E75]/30'
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100/50'
                                  : 'border-dashed border-slate-300 hover:border-slate-400 text-slate-400 bg-slate-50'
                              }`}
                            >
                              <span className="text-[14px] leading-none mb-1">
                                {isOccupied ? '🧑‍💼' : '💺'}
                              </span>
                              <span className="text-[8px] font-bold truncate w-full">
                                {isOccupied ? seatOccupant.clientName.split(' ')[0] : `Libre ${index + 1}`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active passengers control lists */}
                    <div className="space-y-2 flex-1 flex flex-col">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest text-left">
                          Gestion Des Passagers En Route
                        </h4>
                        <span className="text-[8px] text-slate-500 font-bold">Cliquez sur un passager pour focus</span>
                      </div>

                      {activeRides.length === 0 ? (
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs text-center flex-1 flex flex-col items-center justify-center space-y-2">
                          <span className="text-xl">🚍</span>
                          <h5 className="text-xs font-bold text-slate-800">Aucun passager à bord</h5>
                          <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
                            Allez dans l'onglet <strong>Courses</strong> ➔ <strong>Bientôt</strong> et cliquez sur <strong>Démarrer la course</strong> pour planifier et embarquer vos clients.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activeRides.map(ride => {
                            const isFocused = activeRide?.id === ride.id;
                            
                            return (
                              <div 
                                key={ride.id}
                                className={`p-2.5 rounded-2xl border transition-all ${
                                  isFocused 
                                    ? 'bg-white border-[#1D9E75] shadow-md' 
                                    : 'bg-[#F8FAFC] border-slate-200 opacity-90'
                                }`}
                              >
                                {ride.ticket_number && (
                                  <div className="flex justify-between items-center mb-1.5 px-0.5">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                      Passager
                                    </span>
                                    <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded px-1.5 py-0.5 text-[9px] font-bold font-mono">
                                      <Ticket className="h-3 w-3 text-emerald-700" />
                                      TKT-{ride.ticket_number}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center mb-1.5">
                                  {/* Client highlevel details */}
                                  <div 
                                    className="flex items-center gap-2 cursor-pointer text-left flex-1 min-w-0"
                                    onClick={() => { setActiveRide(ride); playChime('click'); }}
                                  >
                                    <div className="w-8 h-8 rounded-full bg-amber-105 border border-amber-200 flex items-center justify-center text-xs font-bold shrink-0">
                                      {ride.clientAvatar}
                                    </div>
                                    <div className="truncate">
                                      <p className="font-bold text-slate-800 text-xs leading-none flex items-center gap-1">
                                        {ride.clientName}
                                        {isFocused && <span className="bg-[#1D9E75] text-[7px] text-white px-1 rounded font-normal shrink-0">Focus GPS</span>}
                                      </p>
                                      <p className="text-[9px] text-slate-400 truncate font-medium mt-0.5">
                                        À dépose : {ride.dropoffLocation}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Dynamic Actions */}
                                  <div className="flex items-center gap-1">
                                    <a 
                                      href={`tel:${ride.clientPhone}`}
                                      onClick={() => playChime('click')}
                                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shrink-0"
                                      title="Appeler"
                                    >
                                      <PhoneCall className="h-3 w-3" />
                                    </a>
                                    <button
                                      onClick={() => { setActiveRide(ride); setChattingRide(ride); playChime('click'); }}
                                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shrink-0 relative"
                                      title="Messagerie"
                                    >
                                      <MessageSquare className="h-3 w-3" />
                                      {ride.messages.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[7px] w-3 h-3 rounded-full flex items-center justify-center font-bold">
                                          {ride.messages.length}
                                        </span>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Multi-segment progress indicator states with direct interactive buttons */}
                                <div className="flex items-center justify-between border-t border-slate-100/50 pt-2 text-xs">
                                  <div className="flex items-center gap-1 text-[10px] text-[#1A2B4A] font-bold">
                                    <span className="text-emerald-600 font-semibold">{ride.priceFCFA} FCFA</span>
                                  </div>

                                  {/* Collective multi-stage control flow */}
                                  <div className="flex items-center gap-1.5">
                                    {ride.status === 'accepted' && (
                                      <button
                                        onClick={() => handleUpdateIndividualRideStatus(ride.id, 'arrived')}
                                        className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold px-2.5 py-1 rounded-lg text-[9px] cursor-pointer shadow-xs whitespace-nowrap"
                                      >
                                        📍 Signaler Arrivée
                                      </button>
                                    )}

                                    {ride.status === 'arrived' && (
                                      <button
                                        onClick={() => handleUpdateIndividualRideStatus(ride.id, 'pickedup')}
                                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold px-2.5 py-1 rounded-lg text-[9px] cursor-pointer shadow-xs whitespace-nowrap animate-pulse"
                                      >
                                        🚗 Monter à Bord
                                      </button>
                                    )}

                                    {ride.status === 'pickedup' && (
                                      <button
                                        onClick={() => handleUpdateIndividualRideStatus(ride.id, 'completed')}
                                        className="bg-indigo-950 hover:bg-black active:scale-95 text-white font-extrabold px-2.5 py-1 rounded-lg text-[9px] cursor-pointer shadow-xs border border-emerald-400 whitespace-nowrap"
                                      >
                                        🏁 Arrivé & Terminer
                                      </button>
                                    )}
                                  </div>
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 3: EARNING REPORTS AND WITHDRAW PAYOUT MECHANISMS */}
              {activeTab === 'revenues' && (
                <div className="p-4 space-y-4 flex-1 overflow-y-auto animate-in fade-in duration-200" id="screen-revenues-tab">
                  
                  {/* Ledger summary banner */}
                  <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
                    {/* Golden coin background */}
                    <span className="absolute -bottom-6 -right-6 text-7xl opacity-10">🪙</span>
                    
                    <p className="text-[10px] text-zinc-300 font-extrabold tracking-widest uppercase">Total Encaissé en Espèces</p>
                    <h3 className="text-2xl font-black text-emerald-400 font-mono tracking-tight my-1">{profile.walletBalanceFCFA.toLocaleString('fr-FR')} FCFA</h3>
                    <p className="text-[10px] text-slate-400">Toutes les courses sont payées directement en cash</p>

                    <div className="mt-4 pt-4 border-t border-indigo-800/60 flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-[10px] text-emerald-400 font-extrabold tracking-widest uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          SOLDE ENCAISSÉ DU JOUR
                        </p>
                        <p className="text-[9px] text-slate-300 mt-0.5">Somme globale des courses de ce jour</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                          {todayEarnings.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Chart mock drawing using styled grid bar components */}
                  <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">REVENUS CETTE SEMAINE</h4>
                      <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" /> +14% hausse
                      </span>
                    </div>

                    {/* Styled HTML chart representing 7 days */}
                    <div className="h-28 flex items-end gap-3 px-2 border-b border-dashed border-slate-100 pb-1" id="custom-analytics-chart">
                      {[
                        { day: 'Lun', val: '40', amount: '12 000 FCFA' },
                        { day: 'Mar', val: '65', amount: '18 500 FCFA' },
                        { day: 'Mer', val: '50', amount: '14 000 FCFA' },
                        { day: 'Jeu', val: '75', amount: '22 000 FCFA' },
                        { day: 'Ven', val: '95', amount: '35 000 FCFA', highlight: true },
                        { day: 'Sam', val: '80', amount: '29 000 FCFA' },
                        { day: 'Dim', val: '30', amount: '9 000 FCFA' }
                      ].map((bar, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer">
                          {/* Tooltip trigger */}
                          <span className="absolute -top-7 scale-0 group-hover:scale-100 transition-transform bg-slate-900 text-white text-[8px] p-1 rounded font-bold whitespace-nowrap z-40">
                            {bar.amount}
                          </span>
                          <div 
                            className={`w-full rounded-t-md transition-all duration-500 ${
                              bar.highlight ? 'bg-indigo-900' : 'bg-slate-300 group-hover:bg-indigo-400'
                            }`}
                            style={{ height: `${bar.val}px` }}
                          ></div>
                          <span className="text-[10px] font-semibold text-slate-500 mt-1">{bar.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transaction record details */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">JOURNAL DES RETRAITS ET COMPTABILITÉ</h4>
                    
                    <div className="bg-white rounded-3xl border border-slate-105 p-3.5 space-y-3 shadow-xs">
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-700">Commission Gaïndé VTC (15%)</p>
                          <p className="text-[9px] text-slate-400">Automatique à chaque course complétée</p>
                        </div>
                        <span className="text-slate-500 font-mono">-15%</span>
                      </div>
                      
                      <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-700">Assistance technique gratuite</p>
                          <p className="text-[9px] text-slate-400">Assuré par notre centre technique à Dakar</p>
                        </div>
                        <span className="text-emerald-600 font-bold">Gratuit</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: PROFILE SETTING & SENEGAL TAXI DOCUMENTS VIEW */}
              {activeTab === 'profil' && (
                <div className="p-4 space-y-4 flex-1 overflow-y-auto animate-in fade-in duration-200" id="screen-profile-tab">
                  
                  {/* Detailed registration profile */}
                  <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-3">
                    <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Informations du Véhicule</h3>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b pb-1.5">
                        <span className="text-slate-500">Marque & Modèle :</span>
                        <span className="font-bold text-slate-800">{profile.vehicleModel}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5">
                        <span className="text-slate-500">Plaque d'Immatriculation :</span>
                        <span className="font-mono font-black text-indigo-900 bg-indigo-50 px-2 rounded">{profile.vehiclePlate}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5">
                        <span className="text-slate-500">Ancienneté Profil :</span>
                        <span className="font-bold text-slate-800">{profile.seniority}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Prestations Assurées :</span>
                        <span className="text-emerald-600 font-bold">Standard, Aéroport, Saly</span>
                      </div>
                    </div>
                  </div>

                  {/* Senegal administration drivers credentials status checker */}
                  <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-3">
                    <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-emerald-600" /> Documents de transport Sénégal
                    </h3>
                    
                    <div className="space-y-2.5">
                      {[
                        { title: 'Permis de Conduire national', desc: 'Validité : Décembre 2028', status: 'SÉCURISÉ ✅' },
                        { title: 'Certificat d\'Aptitude professionnelle', desc: 'Agréé par le Ministère des Transports', status: 'SÉCURISÉ ✅' },
                        { title: 'Carte d\'identité CEDEAO', desc: 'Numéro d\'enregistrement vérifié', status: 'VÉRIFIÉ ✅' },
                        { title: 'Assistance Tiers & Assurance auto', desc: 'AXA Sénégal • Expire dans 8 mois', status: 'VALIDE ✅' }
                      ].map((doc, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                          <div>
                            <p className="font-bold text-slate-800">{doc.title}</p>
                            <p className="text-[9px] text-slate-400">{doc.desc}</p>
                          </div>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            {doc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                   {/* Cash audit and office configurations */}
                  <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-3">
                    <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-left">COMPTABILITÉ ET ESPÈCES</h3>
                    
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1 text-left">Code ID Chauffeur Unique</label>
                        <input 
                          type="text" 
                          disabled
                          value="MK-1482" 
                          className="w-full p-2 bg-slate-50 border rounded-lg font-bold text-slate-600"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1 text-left">Guichet de Retrait Favori</label>
                        <input 
                          type="text" 
                          disabled
                          value="Dakar Plateau (Siège)" 
                          className="w-full p-2 bg-slate-50 border rounded-lg font-bold text-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Supabase Connection Status Card */}
                  <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-3" id="supabase-console-card">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Database className="h-4 w-4 text-indigo-600" /> Intégration Supabase
                      </h3>
                      {isSupabaseConfigured ? (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> ACTIF
                        </span>
                      ) : (
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                          LOCAL / DECO
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-2.5">
                      {isSupabaseConfigured ? (
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-left text-[11px] text-slate-600">
                          <p>✅ **Connecté à votre projet Supabase** !</p>
                          <p>Vos profils, lignes d'horaires et historique de courses de transport sont synchronisés en temps réel dans votre base de données relationnelle.</p>
                        </div>
                      ) : (
                        <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100/60 space-y-2 text-left text-[11px] text-slate-600">
                          <p className="font-semibold text-amber-800">⚠️ Mode Démo Local actif !</p>
                          <p>Pour lier l'application à votre propre instance Supabase, ajoutez les variables suivantes dans vos clés secrètes (**Secrets Panel**) dans AI Studio ou votre fichier d'environnement :</p>
                          <div className="bg-slate-900 text-amber-300 font-mono text-[9px] p-2 rounded-lg space-y-1 select-all">
                            <div>VITE_SUPABASE_URL=votre_url</div>
                            <div>VITE_SUPABASE_ANON_KEY=votre_cle_anon</div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setShowSqlInstructions(!showSqlInstructions);
                          playChime('click');
                        }}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-[10px] flex items-center justify-center gap-1 cursor-pointer border border-slate-200"
                      >
                        {showSqlInstructions ? "Masquer le schéma SQL Supabase" : "Afficher le schéma SQL d'importation"}
                      </button>

                      {showSqlInstructions && (
                        <div className="text-left space-y-1 mt-2">
                          <p className="text-[10px] text-slate-500">Exécutez ce code SQL dans votre **SQL Editor Supabase** pour créer automatiquement les tables requises avec politiques de sécurité :</p>
                          <textarea
                            readOnly
                            value={SUPABASE_SQL_INSTRUCTIONS}
                            className="w-full h-[180px] font-mono text-[9px] bg-slate-950 text-emerald-400 p-2.5 rounded-xl border border-slate-800 focus:outline-none"
                            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                          />
                          <p className="text-[8px] text-slate-400 font-medium">💡 Astuce : Cliquez à l'intérieur de la zone de texte pour tout sélectionner d'un coup.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Out trigger */}
                  <button 
                    onClick={() => {
                      setIsDriverOnline(false);
                      setActiveTab('rides');
                      playChime('decline');
                      alert("Déconnexion réussie. Vous êtes hors ligne et ne recevrez plus de demandes.");
                    }}
                    className="w-full bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 pt-2 cursor-pointer border border-rose-200"
                  >
                    <LogOut className="h-4 w-4" /> SE DÉCONNECTER DE L'APPLICATION
                  </button>

                </div>
              )}

            </div>

            {/* APP NAVIGATION FOOTER ON SMARTPHONE SCREEN FRAME */}
            <nav className="h-[68px] bg-white border-t border-slate-200 flex items-center justify-around pb-2 shadow-inner z-45" id="galsen-app-navbar">
              <button
                onClick={() => { setActiveTab('rides'); playChime('click'); }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'rides' ? 'text-indigo-900' : 'text-slate-400 hover:text-slate-600'
                }`}
                id="navbar-tab-rides"
              >
                <div className="relative">
                  <Compass className="h-5 w-5" />
                  {pendingRides.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-bounce">
                      {pendingRides.length}
                    </span>
                  )}
                </div>
                <span>Courses</span>
              </button>

              <button
                onClick={() => { setActiveTab('map'); playChime('click'); }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'map' ? 'text-indigo-900' : 'text-slate-400 hover:text-slate-600'
                }`}
                id="navbar-tab-map"
              >
                <div className="relative">
                  <Navigation className={`h-5 w-5 ${activeRide ? 'text-emerald-600 animate-pulse' : ''}`} />
                  {activeRide && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                  )}
                </div>
                <span>Carte</span>
              </button>

              <button
                onClick={() => { setActiveTab('revenues'); playChime('click'); }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'revenues' ? 'text-indigo-900' : 'text-slate-400 hover:text-slate-600'
                }`}
                id="navbar-tab-revenues"
              >
                <TrendingUp className="h-5 w-5" />
                <span>Revenus</span>
              </button>

              <button
                onClick={() => { setActiveTab('profil'); playChime('click'); }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'profil' ? 'text-indigo-900' : 'text-slate-400 hover:text-slate-600'
                }`}
                id="navbar-tab-profil"
              >
                <User className="h-5 w-5" />
                <span>Profil</span>
              </button>
            </nav>

            {/* FLOATING INCOMING NOTIFICATION MODAL ALERTS */}
            {shownRideAlert && (
              <div className="absolute inset-0 z-50 bg-slate-900/70 p-4 flex flex-col justify-end animate-in fade-in duration-200">
                <div className="bg-slate-50 rounded-3xl p-4.5 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-5 duration-300 space-y-3.5">
                  
                  {/* Glowing notification status header */}
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 px-1.5 bg-rose-100 text-rose-600 rounded-lg text-xs font-black animate-pulse">
                        LIVE
                      </span>
                      <h4 className="text-[10px] font-black text-slate-500 tracking-widest uppercase">
                        Nouvelle Demande de Course
                      </h4>
                    </div>
                    
                    {/* Ringing waves indicator */}
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  </div>

                  {/* Visual card in the format requested */}
                  <div className="bg-white border border-slate-200 border-l-3 border-l-[#E24B4A] rounded-r-2xl rounded-l-none p-4 shadow-sm flex flex-col text-slate-800">
                    
                    {/* Top row with client and price */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-[34px] h-[34px] rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {shownRideAlert.clientName
                            ? shownRideAlert.clientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                            : 'AF'}
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-slate-800 text-sm leading-tight">
                            {shownRideAlert.clientName}
                          </div>
                          <div className="text-xs text-slate-400 font-medium">
                            {shownRideAlert.clientPhone}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="text-base font-semibold text-[#1A2B4A] tracking-tight">
                          {shownRideAlert.priceFCFA.toLocaleString('fr-FR')} FCFA
                        </div>
                        {shownRideAlert.ticket_number && (
                          <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded px-1.5 py-0.5 text-[9px] font-bold font-mono mt-1">
                            <Ticket className="h-3 w-3 text-emerald-700" />
                            TKT-{shownRideAlert.ticket_number}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Route stops visually matching the model */}
                    <div className="flex flex-col gap-1 mb-3">
                      <div className="flex items-center gap-2 text-[13px]">
                        <div className="w-2 h-2 rounded-full bg-[#1D9E75] shrink-0"></div>
                        <span className="text-slate-800 text-left truncate">{shownRideAlert.pickupLocation}</span>
                      </div>
                      <div style={{ display: 'flex' }}>
                        <div className="w-2 flex justify-center">
                          <div className="w-[1px] h-3 bg-slate-200"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[13px]">
                        <div className="w-2 h-2 rounded-full bg-[#E24B4A] shrink-0"></div>
                        <span className="text-slate-500 text-left truncate">{shownRideAlert.dropoffLocation}</span>
                      </div>
                    </div>

                    {/* Card action footer containing three distinct possibilities */}
                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 gap-2">
                      <a 
                        href={`tel:${shownRideAlert.clientPhone}`}
                        onClick={() => playChime('click')}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border border-[#1D9E75] bg-[#E1F5EE] text-[#085041] hover:bg-[#d2f0e5] transition-all cursor-pointer whitespace-nowrap"
                      >
                        <PhoneCall className="h-3.5 w-3.5 shrink-0" />
                        <span>Appeler</span>
                      </a>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeclineRide(shownRideAlert.id)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-transparent text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                          id="alert-decline-btn"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => handleAcceptRide(shownRideAlert)}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold border-none bg-[#1A2B4A] hover:bg-[#121f35] text-white transition-colors cursor-pointer"
                          id="alert-accept-btn"
                        >
                          Accepter
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

          </div>

        </section>

        {/* RIGHT COLUMN: BOOKING CONTROLLER FOR DESKTOP TESTS */}
        <section className="hidden lg:block w-full max-w-[390px] space-y-6">
          
          {/* Booking Simulator Component */}
          <BookingSimulator 
            onTriggerRide={handleTriggerRide}
            activeRideCount={pendingRides.length + activeRides.length}
          />

        </section>

      </main>

      {/* WITHDRAW MODERATOR MODAL POPUPS */}
      {isWithdrawOpen && (
        <WithdrawModal 
          currentBalanceFCFA={profile.walletBalanceFCFA}
          onWithdrawSuccess={(amt) => {
            setProfile(prev => ({
              ...prev,
              walletBalanceFCFA: Math.max(0, prev.walletBalanceFCFA - amt)
            }));
            // Add a withdraw record to history
            const payoutInvoice: Ride = {
              id: "payout-" + Date.now().toString(),
              clientName: `Retrait Espèces Guichet`,
              clientPhone: "Galsen-finance",
              clientAvatar: "💸",
              clientRating: 5.0,
              pickupLocation: "Mon Solde",
              pickupCoords: { x: 0, y: 0 },
              dropoffLocation: "Guichet Physique",
              dropoffCoords: { x: 0, y: 0 },
              priceFCFA: amt,
              distanceKM: 0,
              durationMinutes: 0,
              status: 'completed',
              isScheduled: false,
              paymentMethod: 'Espèces',
              trafficIntensity: 'Fluide',
              createdTime: "Aujourd'hui · Retrait",
              messages: []
            };
            setRideHistory(prev => [payoutInvoice, ...prev]);
          }}
          onClose={() => setIsWithdrawOpen(false)}
        />
      )}

    </div>
  );
}
