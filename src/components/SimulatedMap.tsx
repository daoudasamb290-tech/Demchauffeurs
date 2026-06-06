/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Ride } from '../types';
import { playChime } from '../data';
import { Navigation, Compass, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SimulatedMapProps {
  activeRide: Ride | null;
  onUpdateRideStatus: (status: Ride['status']) => void;
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

export default function SimulatedMap({ activeRide, onUpdateRideStatus }: SimulatedMapProps) {
  const [progress, setProgress] = useState(0); // 0 to 100% of current segment
  const [isDriving, setIsDriving] = useState(false);
  const [trafficAlert, setTrafficAlert] = useState<string | null>(null);
  
  const intervalRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerDriverRef = useRef<L.Marker | null>(null);
  const markerDestinationRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Derived state for ETA and Distance Left to avoid state synchronization issues
  let eta = 0;
  let distanceLeft = 0;
  if (activeRide) {
    const ratio = (100 - progress) / 100;
    if (activeRide.status === 'accepted') {
      const totalPickupDuration = Math.round(activeRide.durationMinutes * 0.3) || 5;
      const totalPickupDist = parseFloat((activeRide.distanceKM * 0.3).toFixed(1)) || 1.5;
      eta = Math.max(1, Math.round(totalPickupDuration * ratio));
      distanceLeft = parseFloat(Math.max(0.1, totalPickupDist * ratio).toFixed(1));
    } else if (activeRide.status === 'pickedup' || activeRide.status === 'arrived') {
      eta = Math.max(1, Math.round(activeRide.durationMinutes * ratio));
      distanceLeft = parseFloat(Math.max(0.1, activeRide.distanceKM * ratio).toFixed(1));
    }
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

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update simulator settings on activeRide change
  useEffect(() => {
    if (!activeRide) {
      setIsDriving(false);
      setProgress(0);
      return;
    }

    setProgress(0);
    if (activeRide.status === 'accepted') {
      setIsDriving(true);
    } else if (activeRide.status === 'pickedup') {
      setIsDriving(true);
    } else {
      setIsDriving(false);
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

  // Handle simulation progression loop
  useEffect(() => {
    if (!isDriving || !activeRide) return;

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const step = activeRide.status === 'accepted' ? 4 : 2; // Speed up driving simulation
        const next = prev + step;

        if (next >= 100) {
          clearInterval(intervalRef.current);
          return 100;
        }

        return next;
      });
    }, 1200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isDriving, activeRide?.id, activeRide?.status]);

  // Handle completion / arrival when progress reaches 100
  useEffect(() => {
    if (progress >= 100 && isDriving && activeRide) {
      setIsDriving(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      if (activeRide.status === 'accepted') {
        onUpdateRideStatus('arrived');
        playChime('arrive-horn');
      } else if (activeRide.status === 'pickedup') {
        // Ne pas terminer la course automatiquement. Le chauffeur doit cliquer sur "Terminer la Course" manuellement pour valider.
        playChime('success');
      }
    }
  }, [progress, isDriving, activeRide?.id, activeRide?.status, onUpdateRideStatus]);

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

    if (activeRide) {
      const pickup = getGeoCoords(activeRide.pickupLocation, activeRide.pickupCoords);
      const dropoff = getGeoCoords(activeRide.dropoffLocation, activeRide.dropoffCoords);

      let currentDriverLat = 14.7167;
      let currentDriverLon = -17.4479;
      let currentDestLat = 14.7167;
      let currentDestLon = -17.4479;
      const startLat = 14.7167;
      const startLon = -17.4479;

      if (activeRide.status === 'accepted') {
        currentDriverLat = startLat + (pickup[0] - startLat) * (progress / 100);
        currentDriverLon = startLon + (pickup[1] - startLon) * (progress / 100);
        currentDestLat = pickup[0];
        currentDestLon = pickup[1];
      } else {
        currentDriverLat = pickup[0] + (dropoff[0] - pickup[0]) * (progress / 100);
        currentDriverLon = pickup[1] + (dropoff[1] - pickup[1]) * (progress / 100);
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
      if (activeRide.status === 'accepted') {
        pathCoords.push([startLat, startLon]);
        pathCoords.push([pickup[0], pickup[1]]);
      } else if (activeRide.status === 'pickedup' || activeRide.status === 'arrived') {
        pathCoords.push([pickup[0], pickup[1]]);
        pathCoords.push([dropoff[0], dropoff[1]]);
      }

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

      // Fit map boundary
      if (pathCoords.length > 0) {
        const bounds = L.latLngBounds(pathCoords);
        bounds.extend([currentDriverLat, currentDriverLon]);
        map.fitBounds(bounds, { padding: [35, 35] });
      } else {
        map.setView([currentDriverLat, currentDriverLon], 13);
      }

    } else {
      // Clean up when idling
      if (markerDriverRef.current) {
        markerDriverRef.current.remove();
        markerDriverRef.current = null;
      }
      if (markerDestinationRef.current) {
        markerDestinationRef.current.remove();
        markerDestinationRef.current = null;
      }
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
      map.setView([14.7167, -17.4479], 12);
    }
  }, [activeRide, progress]);

  return (
    <div className="flex-1 min-h-[300px] relative overflow-hidden bg-slate-100 flex flex-col" id="real-leaflet-map-wrapper">
      
      {/* Real Map element */}
      <div ref={mapContainerRef} className="absolute inset-0 z-10" id="osm-map-panel" style={{ height: '100%', width: '100%' }}></div>

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
                <h4 className="text-xs font-bold text-slate-800 truncate max-w-[170px]">
                  {activeRide.status === 'accepted' ? activeRide.pickupLocation : activeRide.dropoffLocation}
                </h4>
              </div>
            </div>
            
            <div className="text-right flex flex-col items-end shrink-0">
              <span className="text-emerald-700 text-[10px] font-bold bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> {activeRide.trafficIntensity}
              </span>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-3 rounded-xl shadow-md border border-white/60 bg-white/90 backdrop-blur-md flex items-center justify-between" id="navigation-hud-idle">
            <span className="text-xs text-slate-500 flex items-center gap-2">
              <Compass className="h-4 w-4 text-slate-400 animate-spin-slow" /> En veille · En attente de course...
            </span>
            <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">Dakar, SN</span>
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
      {activeRide ? (
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
                onClick={() => onUpdateRideStatus('arrived')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                id="btn-arrive-manually"
              >
                Signaler mon Arrivée (Sur Place)
              </button>
            )}

            {activeRide.status === 'arrived' && (
              <button
                onClick={() => onUpdateRideStatus('pickedup')}
                className="flex-1 bg-[#085041] hover:bg-slate-900 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                id="btn-pickup-client"
              >
                Client à Bord 🚗 (Démarrer)
              </button>
            )}

            {activeRide.status === 'pickedup' && (
              <button
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
      )}
    </div>
  );
}
