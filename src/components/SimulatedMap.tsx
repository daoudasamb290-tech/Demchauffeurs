/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Ride } from '../types';
import { playChime } from '../data';
import { 
  Navigation, 
  Compass, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  Maximize2, 
  Minimize2,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  CheckCircle2,
  MapPin,
  Milestone,
  Route,
  Info,
  ChevronDown,
  ChevronUp,
  Waypoints
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SimulatedMapProps {
  activeRide: Ride | null;
  onUpdateRideStatus: (status: Ride['status']) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// Convert simulated percentages to real coordinates in and around Dakar
function getGeoCoords(locationName: string, coords: { x: number; y: number }): [number, number] {
  const name = locationName.toLowerCase();
  
  if (name.includes("almadies")) return [14.7466, -17.5140];
  if (
    name.includes("kermel") || 
    name.includes("plateau") || 
    name.includes("sandaga") || 
    name.includes("gare de dakar") || 
    name.includes("centenaire") || 
    name.includes("république") || 
    name.includes("indépendance")
  ) {
    return [14.6644, -17.4312];
  }
  if (name.includes("mermoz") || name.includes("sea plaza") || name.includes("terrou-bi") || name.includes("fann")) {
    return [14.6853, -17.4735];
  }
  if (name.includes("saly")) return [14.4428, -16.9856];
  if (name.includes("mbour")) return [14.4167, -16.9667];
  if (name.includes("aibd") || name.includes("aéroport")) return [14.6702, -17.0733];
  if (name.includes("diamniadio")) return [14.7111, -17.2285];
  if (name.includes("sacré-cœur") || name.includes("vdn")) return [14.7175, -17.4690];
  if (name.includes("guédiawaye")) return [14.7785, -17.3912];
  if (name.includes("parcelles assainies")) return [14.7570, -17.4338];
  
  // Linear projection fallback as backup
  const lon = -17.53 + (coords.x / 100) * 0.55;
  const lat = 14.77 - (coords.y / 100) * 0.35;
  return [lat, lon];
}

// Haversine formula to compute actual distance in KM between two Earth coordinates
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's Radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface RouteStep {
  iconType: 'straight' | 'left' | 'right' | 'dest' | 'highway';
  instruction: string;
  distance: string;
}

function generateRouteGuidance(ride: Ride): RouteStep[] {
  const pickup = ride.pickupLocation || 'Point A';
  const dropoff = ride.dropoffLocation || 'Point B';
  const isEnRouteToPickup = ride.status === 'accepted';
  
  if (isEnRouteToPickup) {
    return [
      {
        iconType: 'straight',
        instruction: "Démarrer sur la route principale de votre secteur actuel",
        distance: "300 m",
      },
      {
        iconType: 'right',
        instruction: "Tourner à droite vers la Voie de Dégagement Rapide (VDN) ou l'axe principal",
        distance: "1.2 km",
      },
      {
        iconType: 'highway',
        instruction: `Rejoindre l'axe menant vers le point de prise en charge : ${pickup}`,
        distance: "2.4 km",
      },
      {
        iconType: 'left',
        instruction: `Tourner à gauche dans la rue d'accès au point de rendez-vous`,
        distance: "400 m",
      },
      {
        iconType: 'dest',
        instruction: `Arrivée à destination du client (${pickup}) - Stationner sur une zone sécurisée`,
        distance: "Arrivé",
      },
    ];
  } else {
    // Heading to destination Dropoff
    const isInterCity = dropoff.includes("Thiès") || dropoff.includes("Touba") || dropoff.includes("Tivaouane") || dropoff.includes("Saint-Louis") || dropoff.includes("Mbour") || dropoff.includes("Saly");
    
    if (isInterCity) {
      return [
        {
          iconType: 'straight',
          instruction: `Quitter le point de prise en charge à ${pickup}`,
          distance: "500 m",
        },
        {
          iconType: 'right',
          instruction: "S'engager sur la rampe de l'Autoroute de l'Avenir (A1) direction Diamniadio / Régions",
          distance: "2.8 km",
        },
        {
          iconType: 'highway',
          instruction: "Passer par le poste de péage et maintenir la vitesse autorisée sur la voie rapide",
          distance: "45 km",
        },
        {
          iconType: 'straight',
          instruction: `Poursuivre sur l'axe national N2 / N3 en direction de ${dropoff}`,
          distance: "18 km",
        },
        {
          iconType: 'left',
          instruction: `Prendre l'embranchement menant à l'entrée de la ville de ${dropoff}`,
          distance: "1.5 km",
        },
        {
          iconType: 'dest',
          instruction: `Arrivée à destination finale de dépose : ${dropoff}`,
          distance: "Arrivé",
        },
      ];
    } else {
      // Local/Urban route
      return [
        {
          iconType: 'straight',
          instruction: `Quitter le point de prise en charge à ${pickup}`,
          distance: "400 m",
        },
        {
          iconType: 'left',
          instruction: "Prendre à gauche sur l'Avenue Bourguiba / Boulevard de la République",
          distance: "1.8 km",
        },
        {
          iconType: 'right',
          instruction: "Prendre la bretelle d'accès vers la Corniche Ouest",
          distance: "3.2 km",
        },
        {
          iconType: 'straight',
          instruction: `Continuer tout droit vers l'adresse de dépose : ${dropoff}`,
          distance: "1.2 km",
        },
        {
          iconType: 'dest',
          instruction: `Arrivée au point de dépose finale à ${dropoff}`,
          distance: "Arrivé",
        },
      ];
    }
  }
}

export default function SimulatedMap({ activeRide, onUpdateRideStatus, isFullscreen, onToggleFullscreen }: SimulatedMapProps) {
  const [trafficAlert, setTrafficAlert] = useState<string | null>(null);

  // Device Geolocation state variables
  const [realCoords, setRealCoords] = useState<[number, number] | null>(null);
  const [useRealGPS, setUseRealGPS] = useState<boolean>(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  
  // Interactive Itinerary Guide states
  const [showItineraryDetail, setShowItineraryDetail] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerDriverRef = useRef<L.Marker | null>(null);
  const markerDestinationRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Track manual map interactions to allow zooming without auto-focus interrupting
  const [mapInteracted, setMapInteracted] = useState<boolean>(false);
  const hasInteractedRef = useRef<boolean>(false);

  // Reset map interaction status and completed steps when activeRide or GPS mode changes
  useEffect(() => {
    hasInteractedRef.current = false;
    setMapInteracted(false);
    setCompletedSteps({});
    // Automatically show details when a ride starts active
    if (activeRide) {
      setShowItineraryDetail(true);
    } else {
      setShowItineraryDetail(false);
    }
  }, [activeRide?.id, activeRide?.status, useRealGPS]);

  // Watch current device position to set real position
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Géolocalisation indisponible");
      return;
    }

    const handleSuccess = (pos: GeolocationPosition) => {
      setRealCoords([pos.coords.latitude, pos.coords.longitude]);
      setGpsError(null);
    };

    const handleError = (err: GeolocationPositionError) => {
      console.warn("Geolocation watch error:", err.message);
      setGpsError(err.code === err.PERMISSION_DENIED ? "Accès GPS refusé" : "Erreur GPS");
    };

    // Fast initial check
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 8000,
    });

    // Real-time track
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Helper to translate location names back to GPS markers dynamically based either on Dakar or Driver's real GPS neighborhood area
  const getRideCoords = (locationName: string, configCoords: { x: number; y: number }): [number, number] => {
    if (useRealGPS && realCoords) {
      // Create beautifully spread distinct custom destinations relative to the user's real street location!
      const name = locationName.toLowerCase();
      let seed = 0;
      for (let i = 0; i < name.length; i++) {
        seed += name.charCodeAt(i);
      }
      // Micro relative offsets (approx 1 to 2.5 km radius)
      const latOffset = 0.007 + ((seed % 17) / 1200);
      const lonOffset = 0.007 + ((seed % 27) / 1200);
      const latSign = (seed % 2 === 0) ? 1 : -1;
      const lonSign = (seed % 3 === 0) ? 1 : -1;
      return [
        realCoords[0] + (latOffset * latSign),
        realCoords[1] + (lonOffset * lonSign)
      ];
    }
    // Dakar default sim coordinates
    return getGeoCoords(locationName, configCoords);
  };

  // Trigger leaflet resize computation when fullscreen height changes
  useEffect(() => {
    if (mapRef.current) {
      // Immediate resize
      mapRef.current.invalidateSize();
      
      // Secondary resize at 100ms when layout transitions are starting
      const t1 = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);

      // Third resize at 350ms to ensure final height matches container perfectly
      const t2 = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 350);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isFullscreen]);

  // Derived state for ETA and Distance Left to avoid state synchronization issues
  const baseLat = (useRealGPS && realCoords) ? realCoords[0] : 14.7167;
  const baseLon = (useRealGPS && realCoords) ? realCoords[1] : -17.4479;

  let eta = 0;
  let distanceLeft = 0;
  if (activeRide) {
    const pickup = getRideCoords(activeRide.pickupLocation, activeRide.pickupCoords);
    const dropoff = getRideCoords(activeRide.dropoffLocation, activeRide.dropoffCoords);

    if (activeRide.status === 'accepted') {
      distanceLeft = getDistanceKm(baseLat, baseLon, pickup[0], pickup[1]);
    } else if (activeRide.status === 'pickedup' || activeRide.status === 'arrived') {
      distanceLeft = getDistanceKm(baseLat, baseLon, dropoff[0], dropoff[1]);
    }

    // Dynamic scale formatting
    distanceLeft = parseFloat(Math.max(0.1, distanceLeft).toFixed(1));
    eta = Math.max(1, Math.round(distanceLeft * 2.4)); // ~25 km/h urban average
  }

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [14.7167, -17.4479], // Dakar VDN/Plateau area center
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Track user drag and zoom to disable auto-centering
    map.on('dragstart', () => {
      hasInteractedRef.current = true;
      setMapInteracted(true);
    });
    map.on('zoomstart', () => {
      hasInteractedRef.current = true;
      setMapInteracted(true);
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Recenter map action
  const handleRecenterMap = () => {
    hasInteractedRef.current = false;
    setMapInteracted(false);
    playChime('click');

    const map = mapRef.current;
    if (!map) return;

    const currentDriverLat = (useRealGPS && realCoords) ? realCoords[0] : 14.7167;
    const currentDriverLon = (useRealGPS && realCoords) ? realCoords[1] : -17.4479;

    if (activeRide) {
      const pickup = getRideCoords(activeRide.pickupLocation, activeRide.pickupCoords);
      const dropoff = getRideCoords(activeRide.dropoffLocation, activeRide.dropoffCoords);

      let currentDestLat = currentDriverLat;
      let currentDestLon = currentDriverLon;

      if (activeRide.status === 'accepted') {
        currentDestLat = pickup[0];
        currentDestLon = pickup[1];
      } else {
        currentDestLat = dropoff[0];
        currentDestLon = dropoff[1];
      }

      const pathCoords: [number, number][] = [
        [currentDriverLat, currentDriverLon],
        [currentDestLat, currentDestLon]
      ];
      const bounds = L.latLngBounds(pathCoords);
      bounds.extend([currentDriverLat, currentDriverLon]);
      map.fitBounds(bounds, { padding: [35, 35] });
    } else {
      if (useRealGPS && realCoords) {
        map.setView([realCoords[0], realCoords[1]], 14);
      } else {
        map.setView([14.7167, -17.4479], 12);
      }
    }
  };

  // Update simulator settings on activeRide change
  useEffect(() => {
    if (!activeRide) {
      return;
    }

    const trafficMessages = [
      "Embouteillage signalé sur la VDN sous le pont de Liberté 6",
      "Ralentissement près du Rond-point Patte d'Oie",
      "Contrôle de police routière avant le péage de Diamniadio",
      "Trafic fluide sur la Corniche Ouest",
      "Ralentissement au niveau de l'autoroute à péage (Sortie Rufisque)"
    ];

    const randomAlert = Math.random() > 0.4 ? trafficMessages[Math.floor(Math.random() * trafficMessages.length)] : null;
    setTrafficAlert(randomAlert);

  }, [activeRide?.id, activeRide?.status]);

  // Sync Leaflet Layers with Simulated Driving State
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const driverIcon = L.divIcon({
      html: `<div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2" style="width: 32px; height: 32px;">
               <div class="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-pulse"></div>
               <div class="bg-[#085041] border-[1.5px] border-white rounded-full p-1.5 shadow-lg flex items-center justify-center text-white text-[14px]" style="width: 28px; height: 28px; line-height: 1;">
                 🚗
               </div>
             </div>`,
      className: 'custom-driver-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const destinationIcon = L.divIcon({
      html: `<div class="flex flex-col items-center -translate-x-1/2 -translate-y-full" style="width: 80px; height: 40px; text-align: center;">
               <div class="bg-rose-500 hover:scale-105 transition-transform text-white rounded-full p-1 shadow-md border border-white flex items-center justify-center" style="width: 22px; height: 22px;">
                 <span class="text-[11px] leading-none" style="display: block; margin-top: -1px;">📍</span>
               </div>
               <span class="bg-indigo-950 font-sans text-white text-[7px] font-bold px-1 py-0.5 rounded shadow-sm mt-0.5 truncate max-w-[76px] inline-block leading-none border border-indigo-900">
                 ${activeRide ? (activeRide.status === 'accepted' ? 'Client' : 'Dépose') : ''}
               </span>
             </div>`,
      className: 'custom-destination-icon',
      iconSize: [80, 40],
      iconAnchor: [40, 26],
    });

    const baseLat = (useRealGPS && realCoords) ? realCoords[0] : 14.7167;
    const baseLon = (useRealGPS && realCoords) ? realCoords[1] : -17.4479;

    if (activeRide) {
      const pickup = getRideCoords(activeRide.pickupLocation, activeRide.pickupCoords);
      const dropoff = getRideCoords(activeRide.dropoffLocation, activeRide.dropoffCoords);

      const currentDriverLat = baseLat;
      const currentDriverLon = baseLon;
      let currentDestLat = baseLat;
      let currentDestLon = baseLon;

      if (activeRide.status === 'accepted') {
        currentDestLat = pickup[0];
        currentDestLon = pickup[1];
      } else {
        currentDestLat = dropoff[0];
        currentDestLon = dropoff[1];
      }

      // Update/Add driver marker
      if (!markerDriverRef.current) {
        markerDriverRef.current = L.marker([currentDriverLat, currentDriverLon], { icon: driverIcon }).addTo(map);
      } else {
        markerDriverRef.current.setLatLng([currentDriverLat, currentDriverLon]);
      }

      // Update/Add destination marker if trip not completed yet
      if (activeRide.status !== 'completed') {
        if (!markerDestinationRef.current) {
          markerDestinationRef.current = L.marker([currentDestLat, currentDestLon], { icon: destinationIcon }).addTo(map);
        } else {
          markerDestinationRef.current.setLatLng([currentDestLat, currentDestLon]);
          markerDestinationRef.current.setIcon(destinationIcon);
        }
      } else {
        if (markerDestinationRef.current) {
          markerDestinationRef.current.remove();
          markerDestinationRef.current = null;
        }
      }

      // Update/Add polyline path
      const pathCoords: [number, number][] = [];
      pathCoords.push([baseLat, baseLon]);
      pathCoords.push([currentDestLat, currentDestLon]);

      if (pathCoords.length > 0) {
        if (!polylineRef.current) {
          polylineRef.current = L.polyline(pathCoords, {
            color: activeRide.status === 'accepted' ? '#10B981' : '#3B82F6',
            weight: 4,
            dashArray: activeRide.status === 'accepted' ? '6, 6' : undefined,
            lineCap: 'round',
          }).addTo(map);
        } else {
          polylineRef.current.setLatLngs(pathCoords);
          polylineRef.current.setStyle({
            color: activeRide.status === 'accepted' ? '#10B981' : '#3B82F6',
            dashArray: activeRide.status === 'accepted' ? '6, 6' : undefined,
          });
        }
      } else {
        if (polylineRef.current) {
          polylineRef.current.remove();
          polylineRef.current = null;
        }
      }

      // Fit map boundary - ONLY if user has not interacted
      if (!hasInteractedRef.current) {
        if (pathCoords.length > 0) {
          const bounds = L.latLngBounds(pathCoords);
          bounds.extend([currentDriverLat, currentDriverLon]);
          map.fitBounds(bounds, { padding: [35, 35] });
        } else {
          map.setView([currentDriverLat, currentDriverLon], 13);
        }
      }

    } else {
      // Clean up when idling - still show real driver location if authorized
      if (useRealGPS && realCoords) {
        if (!markerDriverRef.current) {
          markerDriverRef.current = L.marker([realCoords[0], realCoords[1]], { icon: driverIcon }).addTo(map);
        } else {
          markerDriverRef.current.setLatLng([realCoords[0], realCoords[1]]);
        }
        if (!hasInteractedRef.current) {
          map.setView([realCoords[0], realCoords[1]], 14);
        }
      } else {
        if (markerDriverRef.current) {
          markerDriverRef.current.remove();
          markerDriverRef.current = null;
        }
        if (!hasInteractedRef.current) {
          map.setView([14.7167, -17.4479], 12);
        }
      }

      if (markerDestinationRef.current) {
        markerDestinationRef.current.remove();
        markerDestinationRef.current = null;
      }
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
    }
  }, [activeRide, realCoords, useRealGPS]);

  return (
    <div className="flex-1 h-full w-full min-h-[300px] relative overflow-hidden bg-slate-100 flex flex-col" id="real-leaflet-map-wrapper">
      
      {/* Real Map element */}
      <div ref={mapContainerRef} className="absolute inset-0 z-10" id="osm-map-panel" style={{ height: '100%', width: '100%' }}></div>

      {/* Recenter button when user has panned or zoomed */}
      {mapInteracted && (
        <button
          type="button"
          onClick={handleRecenterMap}
          className="absolute right-3 z-[1000] bg-indigo-950 hover:bg-slate-900 border border-indigo-700 text-white font-bold p-2.5 rounded-full shadow-lg flex items-center gap-1.5 text-[11px] transition-all active:scale-95 cursor-pointer hover:scale-105"
          style={{ bottom: isFullscreen ? '24px' : (activeRide ? '180px' : '150px') }}
          title="Recibler la carte sur l'itinéraire"
          id="btn-recenter-map"
        >
          <Compass className="h-4 w-4 text-emerald-400 rotate-45" />
          <span>Recentrer</span>
        </button>
      )}

      {/* Dynamic Itinerary Guide floating toggle button */}
      {activeRide && (
        <button
          type="button"
          onClick={() => {
            setShowItineraryDetail(!showItineraryDetail);
            playChime('click');
          }}
          className="absolute right-3 z-[1000] bg-slate-900/95 hover:bg-black border border-indigo-500/50 text-white font-bold p-2.5 rounded-full shadow-xl flex items-center gap-1.5 text-[11px] transition-all active:scale-95 cursor-pointer hover:scale-105"
          style={{ bottom: isFullscreen ? (mapInteracted ? '74px' : '24px') : (activeRide ? (mapInteracted ? '228px' : '180px') : '150px') }}
          title="Afficher/masquer le guide d'itinéraire détaillé avec conseils de conduite"
          id="btn-toggle-itinerary-guide-map"
        >
          <Route className="h-4 w-4 text-emerald-400" />
          <span>{showItineraryDetail ? "Masquer Trajet" : "Guide Trajet"}</span>
        </button>
      )}

      {/* Sliding turn-by-turn itinerary guidance panel */}
      {activeRide && showItineraryDetail && (
        <div 
          className="absolute left-3 right-3 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-2xl rounded-2xl p-3 z-[1000] transition-all overflow-hidden flex flex-col space-y-2 animate-in slide-in-from-bottom duration-300"
          style={{ 
            bottom: isFullscreen ? '124px' : '255px',
            maxHeight: isFullscreen ? 'calc(100% - 240px)' : '210px'
          }}
          id="itinerary-guide-overlay"
        >
          <div className="flex items-center justify-between border-b pb-1.5 border-slate-100">
            <div className="flex items-center gap-1.5">
              <Milestone className="h-4 w-4 text-emerald-600" />
              <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-widest">
                Itinéraire & Guide Étape par Étape
              </h4>
            </div>
            <span className="text-[9px] font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded-full border border-emerald-100">
              {generateRouteGuidance(activeRide).length} ÉTAPES
            </span>
          </div>

          {/* Steps List */}
          <div className="overflow-y-auto space-y-1.5 pr-1 max-h-[145px] scrollbar-thin text-left">
            {generateRouteGuidance(activeRide).map((step, idx) => {
              const isCompleted = !!completedSteps[step.instruction];
              const stepsList = generateRouteGuidance(activeRide);
              const firstIncompleteIdx = stepsList.findIndex(s => !completedSteps[s.instruction]);
              const isNextStep = idx === (firstIncompleteIdx === -1 ? stepsList.length - 1 : firstIncompleteIdx);

              return (
                <div 
                  key={idx}
                  onClick={() => {
                    setCompletedSteps(prev => ({
                      ...prev,
                      [step.instruction]: !prev[step.instruction]
                    }));
                    playChime('click');
                  }}
                  className={`p-2 rounded-xl border transition-all flex items-start gap-2 cursor-pointer active:scale-98 ${
                    isCompleted 
                      ? 'bg-slate-50 border-slate-100 text-slate-400' 
                      : isNextStep
                        ? 'bg-emerald-50/70 border-emerald-200 text-slate-800 font-medium scale-[1.01] shadow-xs'
                        : 'bg-white border-slate-150 text-slate-700 hover:bg-slate-50/50'
                  }`}
                >
                  <button 
                    type="button"
                    className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isCompleted 
                        ? 'bg-[#1D9E75] border-[#1D9E75] text-white' 
                        : isNextStep
                          ? 'border-emerald-500 bg-emerald-100 text-emerald-800 animate-pulse'
                          : 'border-slate-300 bg-slate-50 text-slate-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <span className="text-[9px] font-extrabold">{idx + 1}</span>
                    )}
                  </button>

                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className="shrink-0 scale-90">
                      {step.iconType === 'left' && <CornerUpLeft className="h-3.5 w-3.5 text-indigo-600" />}
                      {step.iconType === 'right' && <CornerUpRight className="h-3.5 w-3.5 text-indigo-600" />}
                      {step.iconType === 'highway' && <Waypoints className="h-3.5 w-3.5 text-emerald-600" />}
                      {step.iconType === 'dest' && <MapPin className="h-3.5 w-3.5 text-rose-500" />}
                      {step.iconType === 'straight' && <ArrowUp className="h-3.5 w-3.5 text-slate-500" />}
                    </span>
                    <p className={`text-[10px] leading-tight ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {step.instruction}
                    </p>
                  </div>

                  <span className={`text-[8.5px] font-mono tracking-wider px-1.5 py-0.5 rounded font-bold shrink-0 self-start ${
                    isCompleted 
                      ? 'bg-slate-100 text-slate-400'
                      : isNextStep
                        ? 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                        : 'bg-slate-100 text-slate-600'
                  }`}>
                    {step.distance}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 justify-between">
            <p className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
              <Info className="h-3 w-3 text-emerald-500 shrink-0" />
              <span>Cochez les étapes franchies pour simuler votre trajet</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setCompletedSteps({});
                playChime('click');
              }}
              className="text-[9px] font-extrabold text-indigo-700 hover:text-indigo-950 underline px-1 cursor-pointer"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* Floating HUD over Leaflet (utilizes z-[1000] to sit perfectly above Leaflet layers) */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-1.5" id="map-top-overlays">
        {activeRide ? (
          <div className="glass-panel p-3 rounded-2xl shadow-md border border-white/60 bg-white/90 backdrop-blur-md flex items-center justify-between" id="navigation-hud">
            <div className="flex items-center gap-3">
              <div className="bg-[#085041] p-2 rounded-xl text-white animate-pulse">
                <Navigation className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">
                  {activeRide.status === 'accepted' ? 'Vers Client' : 'Vers Destination'}
                </p>
                <h4 className="text-xs font-bold text-slate-800 truncate max-w-[150px]">
                  {activeRide.status === 'accepted' ? activeRide.pickupLocation : activeRide.dropoffLocation}
                </h4>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {/* Interactive GPS Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  setUseRealGPS(!useRealGPS);
                  playChime('click');
                }}
                className={`p-1.5 px-2 text-[9px] font-extrabold rounded-xl border transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                  useRealGPS && realCoords
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                }`}
                title={useRealGPS && realCoords ? "Cliquez de nouveau pour simuler la zone Dakar" : "Cliquez pour utiliser vos vraies coordonnées GPS"}
                id="btn-toggle-gps-active"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${useRealGPS && realCoords ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500'}`}></span>
                {useRealGPS && realCoords ? "GPS Réel" : "Dakar"}
              </button>

              <span className="text-emerald-700 text-[10px] font-bold bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> {activeRide.trafficIntensity}
              </span>
              {onToggleFullscreen && (
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 p-1.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center active:scale-95"
                  title={isFullscreen ? "Réduire l'écran" : "Plein écran"}
                  id="btn-toggle-fullscreen-navigating"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="glass-panel p-3 rounded-xl shadow-md border border-white/60 bg-white/90 backdrop-blur-md flex items-center justify-between" id="navigation-hud-idle">
            <button
              type="button"
              onClick={() => {
                setUseRealGPS(!useRealGPS);
                playChime('click');
              }}
              className="text-xs text-slate-700 hover:text-slate-900 flex items-center gap-2 font-bold cursor-pointer transition-colors"
              title="Permet de basculer la carte sur vos vraies coordonnées GPS"
              id="btn-toggle-gps-idle"
            >
              <Compass className={`h-4 w-4 ${useRealGPS && realCoords ? 'text-emerald-500' : 'text-slate-400 animate-spin-slow'}`} />
              <span className="truncate max-w-[170px] text-left">
                {useRealGPS && realCoords ? "📍 GPS Réel Actif" : "En veille · Attente de course..."}
              </span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                {useRealGPS && realCoords ? "Ma Position" : "Dakar, SN"}
              </span>
              {onToggleFullscreen && (
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 p-1.5 rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center active:scale-95"
                  title={isFullscreen ? "Réduire l'écran" : "Plein écran"}
                  id="btn-toggle-fullscreen-idle"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Traffic alerts banner */}
        {activeRide && trafficAlert && (
          <div className="bg-amber-500/90 backdrop-blur-xs text-white text-[10px] font-semibold py-1.5 px-3 rounded-xl shadow-md flex items-center gap-2 animate-bounce">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-left">{trafficAlert}</span>
          </div>
        )}
      </div>

      {/* Map controller bottom drawer (utilizes z-[1000] to sit perfectly above Leaflet layers) */}
      {!isFullscreen && (activeRide ? (
        <div className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-md z-[1000] p-4 border-t border-slate-100 rounded-t-3xl shadow-2xl space-y-4 text-center" id="map-bottom-drawer">
          <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-2xl border border-slate-100" id="eta-stats-row">
            <div className="text-center flex-1 border-r border-slate-200/60 last:border-0">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ARRIVÉE ESTIMÉE</p>
              <p className="text-xl font-extrabold text-slate-800 font-mono tracking-tight">{eta} <span className="text-xs font-semibold">min</span></p>
            </div>
            <div className="text-center flex-1 border-r border-slate-200/60 last:border-0">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">DISTANCE RESTANTE</p>
              <p className="text-xl font-extrabold text-slate-800 font-mono tracking-tight">{distanceLeft} <span className="text-xs font-semibold">km</span></p>
            </div>
            <div className="text-center flex-1 last:border-0">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">MONTANT DU TRAJET</p>
              <p className="text-md font-bold text-emerald-600 font-mono">{activeRide.priceFCFA} FCFA</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeRide.status === 'accepted' && (
              <button
                type="button"
                onClick={() => onUpdateRideStatus('arrived')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                id="btn-arrive-manually"
              >
                Signaler mon Arrivée (Sur Place)
              </button>
            )}

            {activeRide.status === 'arrived' && (
              <button
                type="button"
                onClick={() => onUpdateRideStatus('pickedup')}
                className="flex-1 bg-[#085041] hover:bg-slate-900 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                id="btn-pickup-client"
              >
                Client à Bord 🚗 (Démarrer)
              </button>
            )}

            {activeRide.status === 'pickedup' && (
              <button
                type="button"
                onClick={() => onUpdateRideStatus('completed')}
                className="flex-1 bg-slate-900 hover:bg-black text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer border border-emerald-400"
                id="btn-complete-ride-manually"
              >
                Terminer la Course & Encaisser
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-md z-[1000] p-5 border-t border-slate-100 rounded-t-3xl shadow-2xl flex flex-col justify-center items-center gap-2" id="idle-map-drawer">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-1">
            <Layers className="h-5 w-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">Aucune navigation active</h4>
          <p className="text-[10px] text-slate-500 text-center max-w-[240px] leading-relaxed">
            Pour lancer et tester l'itinéraire GPS, simulez puis acceptez une course reçue en temps réel.
          </p>
        </div>
      ))}
    </div>
  );
}
