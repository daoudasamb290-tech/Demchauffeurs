/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RIDE_SIMULATION_TEMPLATES, playChime } from '../data';
import { Ride, PaymentType } from '../types';
import { Sparkles, Play, MapPin, DollarSign, Clock, Radio, Users, Check, Flame } from 'lucide-react';

interface BookingSimulatorProps {
  onTriggerRide: (ride: Ride) => void;
  activeRideCount: number;
}

export default function BookingSimulator({ onTriggerRide, activeRideCount }: BookingSimulatorProps) {
  const [clientName, setClientName] = useState('Abdoulaye Ndiaye');
  const [clientPhone, setClientPhone] = useState('+221 77 654 32 10');
  const [pickup, setPickup] = useState('Sacré-Cœur 3, Boulangerie Jaune');
  const [dropoff, setDropoff] = useState('Aéroport AIBD (Hall Départs)');
  const [price, setPrice] = useState('15000');
  const [distance, setDistance] = useState('48.5');
  const [duration, setDuration] = useState('42');
  const [paymentMethod, setPaymentMethod] = useState<PaymentType>('Espèces');
  const [traffic, setTraffic] = useState<'Fluide' | 'Modéré' | 'Saturé'>('Modéré');
  const [scheduledDay, setScheduledDay] = useState('Demain');
  const [scheduledHour, setScheduledHour] = useState('08h30');

  // Load a quick Senegal template
  const applyTemplate = (tpl: typeof RIDE_SIMULATION_TEMPLATES[0]) => {
    setClientName(tpl.clientName);
    setClientPhone(tpl.clientPhone);
    setPickup(tpl.pickupLocation);
    setDropoff(tpl.dropoffLocation);
    setPrice(tpl.priceFCFA.toString());
    setDistance(tpl.distanceKM.toString());
    setDuration(tpl.durationMinutes.toString());
    setPaymentMethod(tpl.paymentMethod as PaymentType);
    setTraffic(tpl.trafficIntensity as 'Fluide' | 'Modéré' | 'Saturé');

    // Automatically set a randomized advance scheduled time
    const days = ['Aujourd\'hui', 'Demain', 'Lundi prochain', 'Vendredi prochain'];
    const hours = ['06h15', '08h30', '13h10', '16h45', '19h20'];
    setScheduledDay(days[Math.floor(Math.random() * days.length)]);
    setScheduledHour(hours[Math.floor(Math.random() * hours.length)]);

    playChime('click');
  };

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create new Ride request
    const newRide: Ride = {
      id: "ride-" + Date.now().toString(),
      clientName,
      clientPhone,
      clientAvatar: clientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "CL",
      clientRating: parseFloat((4.4 + Math.random() * 0.6).toFixed(2)),
      pickupLocation: pickup,
      pickupCoords: { x: 30 + Math.random() * 40, y: 30 + Math.random() * 40 },
      dropoffLocation: dropoff,
      dropoffCoords: { x: 20 + Math.random() * 60, y: 15 + Math.random() * 60 },
      priceFCFA: parseInt(price) || 3000,
      distanceKM: parseFloat(distance) || 8.5,
      durationMinutes: parseInt(duration) || 15,
      status: 'pending', // Pending triggers driver chime alert
      isScheduled: true, // Always pre-scheduled
      scheduledTime: `${scheduledDay} · ${scheduledHour}`,
      paymentMethod,
      trafficIntensity: traffic,
      createdTime: `Réserve le ${scheduledDay} à ${scheduledHour}`,
      messages: []
    };

    onTriggerRide(newRide);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden h-full flex flex-col" id="simulator-container">
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-teal-800 to-indigo-900 text-white flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">Simulateur Client</span>
          </div>
          <h3 className="text-lg font-bold">Portail Réservation Externe</h3>
        </div>
        <Radio className="h-6 w-6 text-indigo-200 animate-pulse" />
      </div>

      <div className="p-5 overflow-y-auto flex-1 space-y-5">
        <p className="text-xs text-slate-500 leading-relaxed">
          Dans la réalité VTC au Sénégal, les clients réservent leurs courses via l'application passager. 
          Ce panneau vous permet d'<strong>injecter instantanément une course</strong> pour tester la sonnerie en temps réel et les notifications du chauffeur.
        </p>

        {/* Quick templates */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-500" /> Modèles Sénégalais Prédéfinis
          </label>
          <div className="grid grid-cols-2 gap-2" id="template-options-grid">
            {RIDE_SIMULATION_TEMPLATES.map((tpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="text-left text-xs p-2.5 border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all flex flex-col justify-between"
                id={`template-btn-${idx}`}
              >
                <div className="font-semibold text-slate-800 truncate mb-1">{tpl.clientName}</div>
                <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  {tpl.pickupLocation.split(',')[0]}
                </div>
                <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                  {tpl.dropoffLocation.split(',')[0]}
                </div>
                <div className="mt-1 flex justify-between items-center w-full border-t border-dashed border-slate-100 pt-1">
                  <span className="text-[10px] font-bold text-teal-700">{tpl.priceFCFA} FCFA</span>
                  <span className="text-[9px] bg-slate-100 px-1 py-0.5 rounded text-slate-600">{tpl.paymentMethod}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic form */}
        <form onSubmit={handleSimulate} className="space-y-3 pt-3 border-t border-slate-100" id="custom-simulation-form">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-indigo-600" /> Détails Personnalisés du Client
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Nom Client</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:outline-indigo-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Téléphone Galsen</label>
                <input
                  type="text"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:outline-indigo-500 text-slate-600"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-rose-500" /> Itinéraire de la Course
            </h4>

            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Lieu de prise en charge (Départ Sénégal)</label>
                <input
                  type="text"
                  required
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:outline-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Lieu de dépose (Destination)</label>
                <input
                  type="text"
                  required
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:outline-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-teal-600" /> Tarification & Conditions
            </h4>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Tarif (FCFA)</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:outline-indigo-500 font-bold text-teal-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Distance (km)</label>
                <input
                  type="text"
                  required
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:outline-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Durée (min)</label>
                <input
                  type="number"
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:outline-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Paiement</label>
                <div className="w-full text-xs p-[9px] rounded-lg bg-teal-50 border border-teal-100 font-extrabold text-teal-800 flex items-center gap-1.5 shadow-xs">
                  <span>💵</span>
                  <span>Espèces Uniquement</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Trafic Dakar</label>
                <select
                  value={traffic}
                  onChange={(e) => setTraffic(e.target.value as 'Fluide' | 'Modéré' | 'Saturé')}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:outline-indigo-500"
                >
                  <option value="Fluide">Fluide ✅</option>
                  <option value="Modéré">Modéré ⚠️</option>
                  <option value="Saturé">Saturé 🛑</option>
                </select>
              </div>
            </div>
          </div>

          {/* ADVANCE SCHEDULE PICKER */}
          <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 space-y-3 shadow-xs">
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              Planification à l'Avance (Passager)
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-emerald-700 mb-1">Jour de Départ</label>
                <select
                  value={scheduledDay}
                  onChange={(e) => setScheduledDay(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-emerald-200 focus:outline-emerald-500 font-medium text-emerald-900"
                >
                  <option value="Aujourd'hui">Aujourd'hui 📅</option>
                  <option value="Demain">Demain 🌅</option>
                  <option value="Lundi prochain">Lundi prochain 📅</option>
                  <option value="Mardi prochain">Mardi prochain 📅</option>
                  <option value="Mercredi prochain">Mercredi prochain 📅</option>
                  <option value="Vendredi prochain">Vendredi prochain 📅</option>
                  <option value="Saly week-end">Saly week-end 🌴</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-emerald-700 mb-1">Heure de Départ</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 08h30 ou 14h15"
                  value={scheduledHour}
                  onChange={(e) => setScheduledHour(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-emerald-200 focus:outline-emerald-500 font-bold text-emerald-900"
                />
              </div>
            </div>
            <p className="text-[10px] text-emerald-700 font-medium">
              💡 Le chauffeur ne recevra que des trajets planifiés.
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 text-xs flex items-center justify-center gap-2 cursor-pointer"
            id="btn-trigger-simulation"
          >
            <Play className="h-4 w-4 fill-current" />
            LANCER LA SIMULATION DE COURSE
          </button>
        </form>
      </div>

      <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5 font-medium text-slate-600">
          <Clock className="h-3.5 w-3.5" />
          Temps Réel Actif
        </span>
        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
          {activeRideCount} courses actives
        </span>
      </div>
    </div>
  );
}
