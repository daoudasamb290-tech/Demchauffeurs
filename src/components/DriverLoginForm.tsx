import React, { useState } from 'react';
import { DriverProfile } from '../types';
import { Car, User, ShieldCheck, MapPin, Check, Sparkles, Mail, Lock, CheckCircle, RefreshCcw, ArrowRight, Loader2, Info, Compass, HelpCircle, Phone } from 'lucide-react';
import { playChime } from '../data';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { connexionLivreur, formatPhoneToEmail } from '../services/authService';

interface DriverLoginFormProps {
  onLoginSuccess: (profileData: DriverProfile & { vehicleSeats: number; preferredRoute: string; hasLicense: boolean }) => void;
  onToggleView?: () => void;
}

type StepType = 'PHONE_INPUT' | 'VEHICLE_ONBOARDING';

export default function DriverLoginForm({ onLoginSuccess, onToggleView }: DriverLoginFormProps) {
  const [step, setStep] = useState<StepType>('PHONE_INPUT');
  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  
  // Real or simulated fallback state tracking
  const [usingSimulation, setUsingSimulation] = useState(!isSupabaseConfigured);

  // Form onboarding fields
  const [name, setName] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleSeats, setVehicleSeats] = useState<number>(4);
  const [preferredRoute, setPreferredRoute] = useState('Dakar ➔ Tivaouane');
  const [hasLicense, setHasLicense] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const routePresets = [
    'Dakar ➔ Tivaouane',
    'Dakar ➔ Thiès',
    'Dakar ➔ Mbour',
    'Dakar ➔ Touba',
    'Dakar ➔ Saint-Louis',
    'Dakar ➔ AIBD (Aéroport)',
    'Thiès ➔ Dakar',
    'Tivaouane ➔ Dakar',
  ];

  const handleLoginDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    if (!telephone.trim()) {
      setError('Veuillez entrer un numéro de téléphone valide.');
      playChime('decline');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      playChime('decline');
      return;
    }

    setIsLoading(true);

    const cleanPhone = telephone.replace(/[^0-9]/g, '');
    const normalized = cleanPhone.length >= 9 ? cleanPhone.substring(cleanPhone.length - 9) : cleanPhone;
    const savedLocalStr = localStorage.getItem(`gainde_vtc_profile_phone_${normalized}`);

    try {
      if (isSupabaseConfigured && supabase && !usingSimulation) {
        console.log(`Connecting driver via Phone: ${telephone}`);
        const { data: authData, error: authError } = await connexionLivreur(telephone.trim(), password);

        if (authError) {
          throw authError;
        }

        const userId = authData.user?.id;
        
        // Vérification de l'existence d'un profil dans la table 'profiles'
        const { data: profileCheck, error: pCheckErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (pCheckErr) {
          console.warn("Erreur lors de la vérification du profil:", pCheckErr.message);
        }

        if (profileCheck) {
          playChime('success');
          setSuccessMessage('Connexion réussie ! Chargement de votre profil...');
          
          let loadedSeats = 4;
          let loadedRoute = 'Dakar ➔ Tivaouane';
          let loadedLicense = true;
          let loadedName = profileCheck.name || 'Chauffeur DEM';
          let loadedVehicleModel = profileCheck.vehicle_model || 'Non spécifié';
          let loadedVehiclePlate = profileCheck.vehicle_plate || 'Non spécifié';

          if (savedLocalStr) {
            try {
              const savedLocal = JSON.parse(savedLocalStr);
              loadedSeats = savedLocal.vehicleSeats || 4;
              loadedRoute = savedLocal.preferredRoute || 'Dakar ➔ Tivaouane';
              loadedLicense = savedLocal.hasLicense !== undefined ? savedLocal.hasLicense : true;
              if (loadedName === 'Chauffeur DEM' && savedLocal.name) {
                loadedName = savedLocal.name;
              }
              if (loadedVehicleModel === 'Non spécifié' && savedLocal.vehicleModel) {
                loadedVehicleModel = savedLocal.vehicleModel;
              }
              if (loadedVehiclePlate === 'Non spécifié' && savedLocal.vehiclePlate) {
                loadedVehiclePlate = savedLocal.vehiclePlate;
              }
            } catch (e) {}
          }

          const fullProfileData = {
            name: loadedName,
            rating: Number(profileCheck.rating) || 5.0,
            tripsCount: Number(profileCheck.trips_count) || 0,
            seniority: profileCheck.seniority || 'Partenaire',
            vehicleModel: loadedVehicleModel,
            vehiclePlate: loadedVehiclePlate,
            avatarInitials: profileCheck.avatar_initials || 'PI',
            walletBalanceFCFA: Number(profileCheck.wallet_balance_fcfa) || 0,
            withdrawMethods: {
              wave: profileCheck.wave_number || telephone.trim(),
              orangeMoney: profileCheck.orange_money_number || '',
              bank: profileCheck.bank_iban || ''
            },
            vehicleSeats: loadedSeats,
            preferredRoute: loadedRoute,
            hasLicense: loadedLicense
          };

          // Save copy of credentials & specs locally
          localStorage.setItem(`gainde_vtc_profile_phone_${normalized}`, JSON.stringify(fullProfileData));

          setTimeout(() => {
            onLoginSuccess(fullProfileData);
          }, 1500);
        } else {
          // Premier login mais détails véhicule non configurés - prefill with local memory if found
          if (savedLocalStr) {
            try {
              const savedLocal = JSON.parse(savedLocalStr);
              setName(savedLocal.name || '');
              setVehicleModel(savedLocal.vehicleModel || '');
              setVehiclePlate(savedLocal.vehiclePlate || '');
              setVehicleSeats(savedLocal.vehicleSeats || 4);
              setPreferredRoute(savedLocal.preferredRoute || 'Dakar ➔ Tivaouane');
              setHasLicense(savedLocal.hasLicense || false);
            } catch (e) {}
          }
          setStep('VEHICLE_ONBOARDING');
          setSuccessMessage('Première connexion réussie ! Complétez les infos de votre véhicule.');
          playChime('success');
        }
      } else {
        // Mode Simulation locale
        playChime('success');
        if (savedLocalStr) {
          setSuccessMessage('Connexion réussie ! Récupération de votre profil enregistré...');
          try {
            const savedLocal = JSON.parse(savedLocalStr);
            setTimeout(() => {
              onLoginSuccess(savedLocal);
            }, 1200);
          } catch (e) {
            setStep('VEHICLE_ONBOARDING');
          }
        } else {
          setSuccessMessage('[Simulation] Connexion réussie ! En route vers la configuration.');
          setTimeout(() => {
            setStep('VEHICLE_ONBOARDING');
          }, 1200);
        }
      }
    } catch (err: any) {
      console.error("Login verification failed:", err);
      setError(err.message || "Impossible de se connecter. Numéro ou mot de passe incorrect.");
      playChime('decline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Veuillez entrer votre nom complet.');
      return;
    }
    if (!vehicleModel.trim()) {
      setError('Veuillez spécifier le modèle de votre voiture.');
      return;
    }
    if (!vehiclePlate.trim()) {
      setError('Veuillez renseigner votre plaque d’immatriculation.');
      return;
    }
    if (!vehicleSeats || vehicleSeats < 1 || vehicleSeats > 8) {
      setError('Le nombre de places doit être compris entre 1 et 8.');
      return;
    }
    if (!hasLicense) {
      setError('Vous devez certifier détenir un permis de conduire valide.');
      return;
    }

    // Calcul des initiales pour l'avatar
    const parts = name.trim().split(' ');
    let avatarInitials = 'CH';
    if (parts.length >= 2) {
      avatarInitials = (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length > 1) {
      avatarInitials = parts[0].substring(0, 2).toUpperCase();
    }

    playChime('success');

    const cleanPhone = telephone.replace(/[^0-9]/g, '');
    const normalized = cleanPhone.length >= 9 ? cleanPhone.substring(cleanPhone.length - 9) : cleanPhone;

    const fullProfile = {
      name: name.trim(),
      rating: 4.95,
      tripsCount: 0,
      seniority: "Nouveau (Aujourd'hui)",
      vehicleModel: vehicleModel.trim(),
      vehiclePlate: vehiclePlate.trim().toUpperCase(),
      avatarInitials,
      walletBalanceFCFA: 0,
      withdrawMethods: {
        wave: telephone.trim() || "77 000 00 00",
        orangeMoney: "78 000 00 00",
        bank: "SN000 00000 0000000000 00"
      },
      vehicleSeats,
      preferredRoute,
      hasLicense
    };

    // Safe persistent cache for simulation
    localStorage.setItem(`gainde_vtc_profile_phone_${normalized}`, JSON.stringify(fullProfile));

    onLoginSuccess(fullProfile);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl border border-slate-150 shadow-xl overflow-hidden flex flex-col p-6 animate-in fade-in duration-300 relative" id="driver-login-viewport">
      
      {/* Brand Header */}
      <div className="text-center pb-3 mb-3 border-b border-slate-100" id="login-brand-header">
        <div className="w-12 h-12 rounded-2xl bg-[#085041] mx-auto flex items-center justify-center shadow-md mb-2" id="app-logo-box">
          <Car className="h-7 w-7 text-[#E2B13C]" />
        </div>
        <h1 className="text-base font-black text-slate-800 flex items-center justify-center gap-1.5 uppercase tracking-wider">
          DEM driver <span className="text-[9px] bg-[#E2B13C]/20 text-[#085041] border border-[#085041]/20 px-2 py-0.5 rounded-full font-extrabold">Sécurisé</span>
        </h1>
        <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
          Pour la sécurité de l'application, l'inscription pilote valide directement l'adresse e-mail par lien magique de connexion.
        </p>
      </div>

      {/* Supabase Connection Status Banner */}
      <div className="mb-4 text-center">
        {isSupabaseConfigured ? null : (
          <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-2.5 text-left">
            <p className="text-[10px] text-amber-850 font-bold flex items-center gap-1 leading-normal">
              <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              Configurez vos clés Supabase en mode réel. En attendant, utilisez le simulateur instantané intégré ci-dessous.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setUsingSimulation(true);
                  playChime('click');
                }}
                className={`text-[9px] px-2.5 py-1 rounded-md font-extrabold transition-all cursor-pointer ${
                  usingSimulation ? 'bg-amber-600 text-white shadow-sm' : 'bg-white border text-slate-600 hover:bg-slate-50'
                }`}
              >
                Mode Démo (Lien virtuel)
              </button>
              {isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={() => {
                    setUsingSimulation(false);
                    playChime('click');
                  }}
                  className={`text-[9px] px-2.5 py-1 rounded-md font-extrabold transition-all cursor-pointer ${
                    !usingSimulation ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Mode Réel (Email reçu)
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progress indicators */}
      <div className="flex items-center justify-between mb-4 px-2" id="verification-progress-dots">
        <div className="flex items-center gap-1.5">
          <span className={`h-4 w-4 rounded-full flex items-center justify-center font-bold text-[8px] ${
            step !== 'PHONE_INPUT' ? 'bg-emerald-600 text-white' : 'bg-[#085041] text-[#E2B13C] animate-pulse'
          }`}>1</span>
          <span className="text-[10px] font-semibold text-slate-500 font-sans">Connexion</span>
        </div>
        <div className="flex-1 h-[2px] bg-slate-100 mx-1.5 relative">
          <div className={`absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-300 ${
            step === 'PHONE_INPUT' ? 'w-0' : 'w-full'
          }`}></div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-4 w-4 rounded-full flex items-center justify-center font-bold text-[8px] ${
            step === 'VEHICLE_ONBOARDING' ? 'bg-[#085041] text-[#E2B13C] animate-pulse' : 'bg-slate-200 text-slate-400'
          }`}>2</span>
          <span className="text-[10px] font-semibold text-slate-500 font-sans">Véhicule</span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2 animate-bounce-short" id="login-error-alert">
          <span className="font-extrabold text-[13px] shrink-0 leading-none">⚠️</span>
          <p className="font-semibold leading-relaxed font-sans">{error}</p>
        </div>
      )}

      {successMessage && !error && (
        <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-100 flex items-start gap-2" id="login-success-alert">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="font-bold font-sans">{successMessage}</p>
        </div>
      )}

      {/* STEP 1: PHONE INPUT */}
      {step === 'PHONE_INPUT' && (
        <form onSubmit={handleLoginDirect} className="space-y-4" id="form-step-phone">
          <div>
            <label htmlFor="auth-phone-input" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-[#085041]" /> Numéro de téléphone du Chauffeur
            </label>
            <input
              type="tel"
              id="auth-phone-input"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Ex: 77 123 45 67"
              className="w-full px-4 py-3 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#085041] focus:outline-hidden transition-all placeholder-slate-400 font-medium"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="auth-pass-input" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-[#085041]" /> Mot de passe de sécurité
            </label>
            <input
              type="password"
              id="auth-pass-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#085041] focus:outline-hidden transition-all placeholder-slate-400 font-bold"
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#085041] hover:bg-slate-900 text-[#E2B13C] font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            id="btn-login-direct"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#E2B13C]" />
                Connexion en cours...
              </>
            ) : (
              <>
                Démarrer la session <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>

          {onToggleView && (
            <div className="pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-550 font-medium font-sans">
                Nouveau pilote-partenaire ?{' '}
                <button
                  type="button"
                  onClick={() => {
                    playChime('click');
                    onToggleView();
                  }}
                  className="font-extrabold text-[#085041] hover:underline cursor-pointer"
                  id="lnk-retro-register"
                >
                  S'inscrire et commencer
                </button>
              </p>
            </div>
          )}
        </form>
      )}

      {/* STEP 2: FULL ONBOARDING PROFILE */}
      {step === 'VEHICLE_ONBOARDING' && (
        <form onSubmit={handleOnboardingSubmit} className="space-y-3 animate-in slide-in-from-bottom-4 duration-300" id="login-main-form">
          
          {/* Confirmed Phone Tag */}
          <div className="bg-[#085041]/10 border border-[#085041]/20 p-2.5 rounded-xl flex items-center justify-between text-[11px] text-[#085041]" id="verified-banner-tag">
            <span className="flex items-center gap-1.5 font-bold animate-pulse">
              <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3px]" /> Compte Validé
            </span>
            <span className="font-mono bg-emerald-100/50 px-2 py-0.5 rounded-md font-extrabold max-w-[170px] truncate">{telephone}</span>
          </div>

          {/* Full Name Input */}
          <div>
            <label htmlFor="driver-fullname" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <User className="h-3 w-3 text-indigo-400" /> Nom complet du Chauffeur
            </label>
            <input
              type="text"
              id="driver-fullname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mamadou Diallo"
              className="w-full px-3 py-2 text-xs text-slate-850 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all font-medium"
              required
            />
          </div>

          {/* Vehicle Model & Seats */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="driver-car-model" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Car className="h-3 w-3 text-emerald-500" /> Modèle Voiture
              </label>
              <input
                type="text"
                id="driver-car-model"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="Ex: Peugeot 508 / Toyota"
                className="w-full px-2.5 py-2 text-xs text-slate-850 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all font-medium"
                required
              />
            </div>

            <div>
              <label htmlFor="driver-car-seats" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> Places disponibles
              </label>
              <select
                id="driver-car-seats"
                value={vehicleSeats}
                onChange={(e) => setVehicleSeats(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs text-slate-850 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-555 focus:outline-hidden transition-all font-bold"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>{s} {s > 1 ? 'places' : 'place'}</option>
                ))}
              </select>
            </div>
          </div>

          {/* License Plate */}
          <div>
            <label htmlFor="driver-car-plate" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-sky-500" /> Plaque d’immatriculation
            </label>
            <input
              type="text"
              id="driver-car-plate"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              placeholder="Ex: DK-4982-A"
              className="w-full px-3 py-2 text-xs text-slate-850 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all placeholder-slate-400 font-mono font-bold"
              required
            />
          </div>

          {/* Traveled / Preferred Route / Destination */}
          <div>
            <label htmlFor="driver-dest-route" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-[#E2B13C]" /> Destination parcourue fréquente
            </label>
            <div className="space-y-1.5">
              <select
                id="driver-dest-route"
                value={preferredRoute}
                onChange={(e) => setPreferredRoute(e.target.value)}
                className="w-full px-3 py-2 text-xs text-slate-850 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all font-semibold"
              >
                {routePresets.map(route => (
                  <option key={route} value={route}>{route}</option>
                ))}
                <option value="custom">Autre destination sur mesure...</option>
              </select>
              
              {preferredRoute === 'custom' && (
                <input
                  type="text"
                  placeholder="Ex: Dakar ➔ Touba via Mbackou"
                  onChange={(e) => setPreferredRoute(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-slate-850 bg-slate-50 border border-slate-250 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all font-semibold"
                  id="input-custom-route-onboard"
                />
              )}
            </div>
          </div>

          {/* Driving License Check */}
          <div className="pt-1.5">
            <label className="relative flex items-start gap-2.5 cursor-pointer select-none" id="checkbox-license-label">
              <input
                type="checkbox"
                checked={hasLicense}
                onChange={(e) => {
                  setHasLicense(e.target.checked);
                  playChime('click');
                }}
                className="sr-only peer"
                id="chk-driver-license"
              />
              <div className="w-5 h-5 rounded-md border border-slate-300 bg-slate-50 flex items-center justify-center transition-all peer-checked:bg-emerald-600 peer-checked:border-emerald-600 shrink-0 mt-0.5">
                {hasLicense && (
                  <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />
                )}
              </div>
              <span className="text-[11px] text-slate-600 font-medium leading-tight select-none">
                Je certifie posséder un <strong className="text-slate-800">permis de conduire de catégorie B</strong> (ou supérieur) valide au Sénégal.
              </span>
            </label>
          </div>

          {/* Connect Button */}
          <button
            type="submit"
            className="w-full bg-[#085041] hover:bg-slate-900 text-[#E2B13C] font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer mt-2 outline-none"
            id="btn-login-submit"
          >
            Démarrer ma session pilote
          </button>
        </form>
      )}

    </div>
  );
}
