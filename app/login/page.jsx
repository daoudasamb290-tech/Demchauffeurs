// app/login/page.jsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Car, Eye, EyeOff, Mail, Lock, Loader2, PhoneCall, HelpCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  
  // State variables
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorEmail, setErrorEmail] = useState('')
  const [errorPassword, setErrorPassword] = useState('')
  const [errorGeneral, setErrorGeneral] = useState('')

  // Translation helper for Supabase errors
  const translateError = (errorMsg) => {
    if (!errorMsg) return ''
    const msg = errorMsg.toLowerCase()
    if (msg.includes('invalid login credentials') || msg.includes('login-failed')) {
      return 'Email ou mot de passe incorrect'
    }
    if (msg.includes('email not confirmed')) {
      return 'Veuillez vérifier votre email'
    }
    if (msg.includes('too many requests') || msg.includes('rate limit')) {
      return 'Trop de tentatives. Attendez quelques minutes.'
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Problème de connexion. Vérifiez votre internet.'
    }
    return errorMsg
  }

  const handleContinue = async () => {
    // Reset errors
    setErrorEmail('')
    setErrorPassword('')
    setErrorGeneral('')

    // Basic Validation
    let hasError = false
    if (!email) {
      setErrorEmail('L\'adresse email est obligatoire.')
      hasError = true
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setErrorEmail('Veuillez entrer une adresse email valide.')
      hasError = true
    }

    if (!password) {
      setErrorPassword('Le mot de passe est obligatoire.')
      hasError = true
    } else if (password.length < 6) {
      setErrorPassword('Le mot de passe doit faire au moins 6 caractères.')
      hasError = true
    }

    if (hasError) return

    setIsLoading(true)

    try {
      // Step A: Login with email & password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (authError) {
        // Distribute error below corresponding inputs if suitable, otherwise general
        const localizedMsg = translateError(authError.message)
        if (authError.message.toLowerCase().includes('password') || authError.message.toLowerCase().includes('credential')) {
          setErrorPassword(localizedMsg)
        } else if (authError.message.toLowerCase().includes('email')) {
          setErrorEmail(localizedMsg)
        } else {
          setErrorGeneral(localizedMsg)
        }
        setIsLoading(false)
        return
      }

      // Step B: If credentials succeed, dispatch OTP (Magic Link / Code)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false
        }
      })

      if (otpError) {
        setErrorGeneral(translateError(otpError.message))
        setIsLoading(false)
        return
      }

      // Redirect to OTP Verification page with email in parameters
      const params = new URLSearchParams()
      params.set('email', email.trim())
      router.push(`/login/verify?${params.toString()}`)

    } catch (err) {
      console.error('Unhandled Login Exception:', err)
      setErrorGeneral('Un problème de connexion est survenu. Veuillez réessayer.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1E35] to-[#1A2B4A] flex flex-col items-center justify-center p-4 selection:bg-[#1A2B4A] selection:text-white" id="login-container">
      
      {/* Centered White Card */}
      <div className="w-full max-w-[420px] bg-white rounded-[24px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col" id="login-card-viewport">
        
        {/* Card Header */}
        <div className="bg-[#1A2B4A] text-white p-6 rounded-t-[24px] text-center relative" id="login-card-header">
          <div className="absolute top-4 right-4 text-emerald-400 font-extrabold text-[10px] tracking-widest uppercase bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
            Sénégal 🇸🇳
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 mx-auto flex items-center justify-center shadow-inner mb-3" id="vtc-icon-wrapper">
            <span className="text-2xl" role="img" aria-label="car">🚗</span>
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider text-white">VTC Sénégal</h2>
          <p className="text-xs text-slate-300 font-medium tracking-wide mt-1">Espace Chauffeur Professionnel</p>
        </div>

        {/* Card Contents */}
        <div className="p-6 flex-1 flex flex-col gap-5" id="login-card-content">
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-1.5 py-1" id="login-progress-dots">
            {/* Step 1: Active point elongated navy blue */}
            <span className="w-6 h-2 rounded-full bg-[#1A2B4A] transition-all duration-300" title="Étape 1: Saisie des informations"></span>
            {/* Step 2: Inactive point */}
            <span className="w-2 h-2 rounded-full bg-slate-200 transition-all duration-300" title="Étape 2: Vérification OTP"></span>
            {/* Step 3: Inactive point */}
            <span className="w-2 h-2 rounded-full bg-slate-200 transition-all duration-300" title="Étape 3: Finalisation"></span>
          </div>

          <div className="space-y-1 text-center">
            <h3 className="text-base font-extrabold text-[#1A2B4A]">Connexion Chauffeur</h3>
            <p className="text-xs text-slate-400 font-medium">Authentifiez-vous sécurisé pour démarrer vos courses sur Dakar et régions</p>
          </div>

          {/* Form inputs strictly without default form actions to respect instruction */}
          <div className="space-y-4" id="login-main-form">
            
            {/* General App Error Banner */}
            {errorGeneral && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-750 text-xs rounded-xl font-semibold flex items-start gap-2 animate-pulse" id="login-error-general">
                <span className="font-extrabold text-[12px] mt-0.5 shrink-0">⚠️</span>
                <p className="leading-tight">{errorGeneral}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-[10px] font-black uppercase tracking-widest text-[#1A2B4A] flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> Adresse E-mail
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="login-email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errorEmail) setErrorEmail('')
                  }}
                  placeholder="nom.chauffeur@gmail.com"
                  className={`w-full text-xs font-semibold px-4 py-3 bg-slate-50 border rounded-xl outline-hidden transition-all placeholder:text-slate-400 ${
                    errorEmail 
                      ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-100' 
                      : 'border-slate-200 focus:border-[#1A2B4A] focus:ring-1 focus:ring-slate-100'
                  }`}
                  disabled={isLoading}
                />
              </div>
              {errorEmail && (
                <p className="text-[10px] text-red-600 font-semibold mt-1" id="error-email-msg">
                  ⚠️ {errorEmail}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="login-password" className="block text-[10px] font-black uppercase tracking-widest text-[#1A2B4A] flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" /> Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => router.push('/login/forgot-password')}
                  className="text-[10px] font-bold text-[#1A2B4A]/70 hover:text-[#1A2B4A] hover:underline"
                  id="btn-forgot-password"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errorPassword) setErrorPassword('')
                  }}
                  placeholder="••••••••"
                  className={`w-full text-xs font-semibold px-4 py-3 bg-slate-50 border rounded-xl pr-11 outline-hidden transition-all ${
                    errorPassword 
                      ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-100' 
                      : 'border-slate-200 focus:border-[#1A2B4A] focus:ring-1 focus:ring-slate-100'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-[#1A2B4A] transition-colors"
                  id="btn-toggle-password-view"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errorPassword && (
                <p className="text-[10px] text-red-600 font-semibold mt-1" id="error-password-msg">
                  ⚠️ {errorPassword}
                </p>
              )}
            </div>

            {/* Main Submit Button */}
            <button
              type="button"
              onClick={handleContinue}
              disabled={isLoading}
              className="w-full bg-[#1A2B4A] hover:bg-[#233b66] text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              id="btn-login-submit"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Connexion sécurisée...
                </>
              ) : (
                <>
                  Continuer <span className="text-[13px] font-bold">➔</span>
                </>
              )}
            </button>

          </div>

          {/* Assistance Button Section styled with: background #E1F5EE, green border, dark green text */}
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2" id="login-help-block">
            <p className="text-[10px] text-center text-slate-400 font-bold flex items-center justify-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-slate-400" /> Difficultés à vous connecter ?
            </p>
            <a
              href="tel:+221770000000"
              className="w-full bg-[#E1F5EE] border border-emerald-500 text-emerald-900 hover:bg-[#ceeade] font-black text-[11px] uppercase tracking-wider py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-center"
              id="btn-assistance-call"
            >
              <PhoneCall className="h-4 w-4 text-emerald-700" /> 
              Appeler l'Assistance Chauffeur
            </a>
          </div>

        </div>

      </div>

      {/* Dakar background credits watermark */}
      <span className="text-[10px] font-mono text-slate-500 mt-6 tracking-widest uppercase opacity-40">
        Plateforme Chauffeur VTC Sénégal
      </span>

    </div>
  )
}
