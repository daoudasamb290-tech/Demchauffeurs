import React, { useState } from 'react';
import { DriverProfile } from '../types';
import { 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Car, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  CheckCircle, 
  Loader2, 
  ArrowRight, 
  HelpCircle,
  Undo
} from 'lucide-react';
import { playChime } from '../data';
import { inscriptionLivreur } from '../services/authService';
import { isSupabaseConfigured } from '../supabaseClient';

interface InscriptionProps {
  onSignUpSuccess: (profileData: DriverProfile & { vehicleSeats: number; preferredRoute: string; hasLicense: boolean }) => void;
  onToggleView: () => void;
}

type RegStep = 'INPUT_INFO' | 'INPUT_VEHICLE' | 'SUCCESS_SCREEN';

export default function Inscription({ onSignUpSuccess, onToggleView }: InscriptionProps) {
  const [step, setStep] = useState<RegStep>('INPUT_INFO');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Info Fields
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');

  // Onboarding Fields (Matches DriverLoginForm to initialize profile properly)
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleSeats, setVehicleSeats] = useState<number>(4);
  const [preferredRoute, setPreferredRoute] = useState('Dakar ➔ Tivaouane');
  const [hasLicense, setHasLicense] = useState(false);

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

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nom.trim()) {
      setError('Veuillez saisir votre nom complet.');
      playChime('decline');
      return;
    }
    if (!telephone.trim()) {
      setError('Veuillez saisir votre numéro de téléphone.');
      playChime('decline');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      playChime('decline');
      return;
    }

    playChime('click');
    setStep('INPUT_VEHICLE');
  };

  const handleRegisterAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!vehicleModel.trim()) {
      setError('Veuillez indiquer le modèle de votre véhicule.');
      playChime('decline');
      return;
    }
    if (!vehiclePlate.trim()) {
      setError('Veuillez indiquer le numéro de plaque d’immatriculation.');
      playChime('decline');
      return;
    }
    if (!hasLicense) {
      setError('Vous devez certifier posséder un permis de conduire valide.');
      playChime('decline');
      return;
    }

    setIsLoading(true);

    try {
      // Calls sequence integration service
      const result = await inscriptionLivreur(telephone.trim(), password, nom.trim());

      if (result.error) {
        throw new Error(result.error.message);
      }

      playChime('success');
      setSuccessMsg('Votre compte de pilote-partenaire a été créé avec succès !');
      setStep('SUCCESS_SCREEN');
      
      // Auto-trigger completion
      setTimeout(() => {
        const initials = nom.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CH';
        const newProfile: DriverProfile & { vehicleSeats: number; preferredRoute: string; hasLicense: boolean } = {
          name: nom.trim(),
          rating: 5.0,
          tripsCount: 0,
          seniority: 'Nouveau Partenaire',
          vehicleModel: vehicleModel.trim(),
          vehiclePlate: vehiclePlate.trim(),
          avatarInitials: initials,
          walletBalanceFCFA: 0,
          withdrawMethods: {
            wave: telephone.trim(),
            orangeMoney: '',
            bank: ''
          },
          vehicleSeats,
          preferredRoute,
          hasLicense
        };

        onSignUpSuccess(newProfile);
      }, 2500);

    } catch (err: any) {
      console.error("SignUp error in form:", err);
      setError(err.message || "Impossible de finaliser l'inscription.");
      playChime('decline');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col justify-between min-h-[520px]" id="inscription-wizard">
      
      {/* HEADER SECTION */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 bg-[#085041]/10 px-2.5 py-1 rounded-full">
            <Sparkles className="h-3 w-3 text-[#0a6653]" />
            <span className="text-[10px] font-extrabold text-[#085041] uppercase tracking-wider">Devenir Partenaire</span>
          </div>
          <span className="text-[10px] font-black text-slate-400">DEM driver</span>
        </div>

        <h2 className="text-xl font-extrabold text-[#1A2B4A] tracking-tight leading-tight">
          {step === 'INPUT_INFO' && "Créez votre compte chauffeur"}
          {step === 'INPUT_VEHICLE' && "Enregistrez votre véhicule"}
          {step === 'SUCCESS_SCREEN' && "Bienvenue à bord !"}
        </h2>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          {step === 'INPUT_INFO' && "Remplissez vos informations pour commencer à recevoir des courses."}
          {step === 'INPUT_VEHICLE' && "Veuillez configurer les détails de votre voiture ou taxi."}
          {step === 'SUCCESS_SCREEN' && "Inscription validée, initialisation de votre tableau de bord..."}
        </p>

        {/* STEPPER PROGRESS INDICATOR */}
        {step !== 'SUCCESS_SCREEN' && (
          <div className="flex items-center gap-1.5 mb-6" id="inscription-stepper">
            <div className="flex items-center gap-1">
              <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center font-bold text-[9px] ${
                step === 'INPUT_INFO' ? 'bg-[#085041] text-white' : 'bg-emerald-600 text-white'
              }`}>1</span>
              <span className="text-[10px] font-bold text-slate-650">Profil</span>
            </div>
            <div className="flex-1 h-[2px] bg-slate-100 relative mx-1">
              <div className={`absolute inset-y-0 left-0 bg-[#085041] transition-all duration-300 ${step === 'INPUT_VEHICLE' ? 'w-full' : 'w-0'}`} />
            </div>
            <div className="flex items-center gap-1">
              <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center font-bold text-[9px] ${
                step === 'INPUT_VEHICLE' ? 'bg-[#085041] text-white animate-pulse' : 'bg-slate-200 text-slate-400'
              }`}>2</span>
              <span className="text-[10px] font-bold text-slate-400">Véhicule</span>
            </div>
          </div>
        )}

        {/* ALERTS */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-semibold" id="reg-error-box">
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-100 flex items-start gap-2" id="reg-success-box">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="font-bold leading-normal">{successMsg}</p>
          </div>
        )}

        {/* STEP 1 FORM: PERSONAL DETAILS */}
        {step === 'INPUT_INFO' && (
          <form onSubmit={handleNextStep} className="space-y-4" id="inscription-step1-form">
            <div>
              <label htmlFor="reg-nom" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" /> Nom complet
              </label>
              <input
                type="text"
                id="reg-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Mamadou Diallo"
                className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#085041] focus:outline-hidden transition-all font-medium"
                required
              />
            </div>

            <div>
              <label htmlFor="reg-tel" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-slate-400" /> Téléphone
              </label>
              <input
                type="tel"
                id="reg-tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Ex: +221 77 000 00 00"
                className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#085041] focus:outline-hidden transition-all font-medium"
                required
              />
            </div>

            <div>
              <label htmlFor="reg-pass" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-slate-400" /> Mot de passe (min 6 car.)
              </label>
              <input
                type="password"
                id="reg-pass"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#085041] focus:outline-hidden transition-all font-bold"
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full bg-[#085041] hover:bg-slate-900 text-[#E2B13C] font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
              id="btn-reg-step1-submit"
            >
              Étape suivante <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        )}

        {/* STEP 2 FORM: VEHICLE ONBOARDING */}
        {step === 'INPUT_VEHICLE' && (
          <form onSubmit={handleRegisterAndStart} className="space-y-4" id="inscription-step2-form">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="reg-car-model" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Car className="h-3 w-3 text-emerald-500" /> Modèle Voiture
                </label>
                <input
                  type="text"
                  id="reg-car-model"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="Ex: Peugeot 508"
                  className="w-full px-2.5 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#085041] focus:outline-hidden transition-all font-medium"
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-car-seats" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Places dispo.
                </label>
                <select
                  id="reg-car-seats"
                  value={vehicleSeats}
                  onChange={(e) => setVehicleSeats(Number(e.target.value))}
                  className="w-full px-2.5 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden transition-all font-bold"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={s}>{s} places</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="reg-car-plate" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-sky-500" /> Plaque d’immatriculation
              </label>
              <input
                type="text"
                id="reg-car-plate"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="Ex: DK-4982-A"
                className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#085041] focus:outline-hidden transition-all placeholder-slate-400 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label htmlFor="reg-dest-route" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-[#E2B13C]" /> Destination fréquente
              </label>
              <select
                id="reg-dest-route"
                value={preferredRoute}
                onChange={(e) => setPreferredRoute(e.target.value)}
                className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden transition-all font-semibold"
              >
                {routePresets.map(route => (
                  <option key={route} value={route}>{route}</option>
                ))}
              </select>
            </div>

            <div className="pt-1 select-none">
              <label className="relative flex items-start gap-2.5 cursor-pointer leading-tight" id="reg-license-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={hasLicense}
                  onChange={(e) => {
                    setHasLicense(e.target.checked);
                    playChime('click');
                  }}
                  className="sr-only peer"
                  id="chk-reg-license"
                />
                <div className="w-5 h-5 rounded-md border border-slate-300 bg-slate-50 flex items-center justify-center transition-all peer-checked:bg-emerald-600 peer-checked:border-emerald-600 shrink-0 mt-0.5">
                  {hasLicense && (
                    <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />
                  )}
                </div>
                <span className="text-[11px] text-slate-650 font-medium leading-relaxed">
                  Je certifie posséder un <strong className="text-slate-800">permis de conduire B</strong> valide au Sénégal.
                </span>
              </label>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  playChime('click');
                  setStep('INPUT_INFO');
                }}
                disabled={isLoading}
                className="flex items-center justify-center px-3.5 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition-all cursor-pointer"
                title="Retour"
                id="btn-reg-back"
              >
                <Undo className="h-4 w-4" />
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-[#085041] hover:bg-slate-900 text-[#E2B13C] font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                id="btn-reg-final-submit"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#E2B13C]" />
                ) : (
                  "S'inscrire et commencer"
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3 FORM: SUCCESS LOADING STATE */}
        {step === 'SUCCESS_SCREEN' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in zoom-in-95 duration-500" id="registration-success-pane">
            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-200">
              <Check className="h-8 w-8 text-emerald-600 stroke-[3px]" />
            </div>
            <p className="text-sm font-bold text-slate-800 text-center animate-pulse">
              Connexion sécurisée en cours...
            </p>
          </div>
        )}
      </div>

      {/* FOOTER VIEW TOGGLER */}
      {step !== 'SUCCESS_SCREEN' && (
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-450 font-medium">
            Déjà inscrit sur la plateforme ?{' '}
            <button
              onClick={() => {
                playChime('click');
                onToggleView();
              }}
              type="button"
              className="font-extrabold text-[#085041] hover:underline cursor-pointer"
              id="lnk-retro-login"
            >
              Se connecter
            </button>
          </p>
        </div>
      )}

    </div>
  );
}
