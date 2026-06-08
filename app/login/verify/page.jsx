// app/login/verify/page.jsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { Car, Loader2, ArrowLeft, RefreshCcw, Mail, Info, CheckCircle2, PhoneCall } from 'lucide-react'

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawEmail = searchParams.get('email') || 'chauffeur@vtcsenegal.com'

  // Verification code fields (6 separate characters)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [resendStatus, setResendStatus] = useState('')
  
  // Timer cooldown logic
  const [timerSeconds, setTimerSeconds] = useState(60)

  // Success animation step trigger
  const [isSuccessState, setIsSuccessState] = useState(false)

  // Input refs for automatic key navigation
  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ]

  // Track the countdown timer loop
  useEffect(() => {
    if (timerSeconds <= 0) return
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [timerSeconds])

  // Helper to mask the email (ex: cha***@gmail.com)
  const getMaskedEmail = (emailStr) => {
    if (!emailStr) return '***@***.com'
    const parts = emailStr.split('@')
    if (parts.length < 2) return emailStr
    const local = parts[0]
    const domain = parts[1]
    
    if (local.length <= 3) {
      return `${local}***@${domain}`
    }
    return `${local.substring(0, 3)}***@${domain}`
  }

  // Translation helper for Supabase errors
  const translateError = (errorMsg) => {
    if (!errorMsg) return 'Code de validation invalide.'
    const msg = errorMsg.toLowerCase()
    
    if (msg.includes('invalid') || msg.includes('expired') || msg.includes('token')) {
      return 'Code expiré ou incorrect. Demandez un nouveau code.'
    }
    if (msg.includes('too many requests') || msg.includes('rate limit')) {
      return 'Trop de tentatives. Attendez quelques minutes avant de réessayer.'
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Problème de connexion. Vérifiez votre internet.'
    }
    return errorMsg
  }

  // Handle onChange for individual OTP cells
  const handleInputChange = (value, index) => {
    // Only accept numeric inputs
    const cleanDigit = value.replace(/[^0-9]/g, '')
    if (cleanDigit.length === 0) {
      const updatedOtp = [...otp]
      updatedOtp[index] = ''
      setOtp(updatedOtp)
      return
    }

    const valueChar = cleanDigit[cleanDigit.length - 1] // Keep only latest single char
    const updatedOtp = [...otp]
    updatedOtp[index] = valueChar
    setOtp(updatedOtp)

    // Automatically shift to NEXT field
    if (index < 5 && valueChar) {
      inputRefs[index + 1].current?.focus()
    }
  }

  // Key event listeners: Backspace to go back
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Shift focus to backward empty cell and erase it
        const updatedOtp = [...otp]
        updatedOtp[index - 1] = ''
        setOtp(updatedOtp)
        inputRefs[index - 1].current?.focus()
      } else {
        const updatedOtp = [...otp]
        updatedOtp[index] = ''
        setOtp(updatedOtp)
      }
    }
  }

  // Intercept paste event for standard full 6 digits paste
  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim()
    const cleanedDigits = pastedData.replace(/[^0-9]/g, '').substring(0, 6)
    
    if (cleanedDigits.length > 0) {
      const updatedOtp = [...otp]
      for (let i = 0; i < 6; i++) {
        updatedOtp[i] = cleanedDigits[i] || ''
      }
      setOtp(updatedOtp)
      
      // Auto-focus on appropriate last cell
      const targetFocusIndex = Math.min(cleanedDigits.length, 5)
      inputRefs[targetFocusIndex].current?.focus()
    }
  }

  // Handler for verification action
  const handleVerify = async () => {
    const fullCode = otp.join('')
    if (fullCode.length < 6) return

    setIsLoading(true)
    setErrorText('')
    setResendStatus('')

    try {
      console.log(`Verifying OTP: ${fullCode} for ${rawEmail}`)
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: rawEmail,
        token: fullCode,
        type: 'email'
      })

      if (verifyError) {
        setErrorText(translateError(verifyError.message))
        setIsLoading(false)
        return
      }

      // Success Step 3 Event
      setIsSuccessState(true)

      // Automatically redirect to the secure dashboard route after 1.5 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)

    } catch (err) {
      console.error('OTP Verification Failure:', err)
      setErrorText('Problème de serveur durant la vérification. Réessayez.')
      setIsLoading(false)
    }
  }

  // Call Supabase OTP resend
  const handleResendCode = async () => {
    if (timerSeconds > 0) return

    setIsLoading(true)
    setErrorText('')
    setResendStatus('')

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: rawEmail,
        options: {
          shouldCreateUser: false
        }
      })

      if (otpError) {
        setErrorText(translateError(otpError.message))
        return
      }

      setResendStatus('Nouveau code envoyé avec succès !')
      setTimerSeconds(60) // Refill timer
    } catch (err) {
      console.error('OTP Resending Error:', err)
      setErrorText('Impossible de renvoyer le code.')
    } finally {
      setIsLoading(false)
    }
  }

  const isOtpComplete = otp.every((val) => val.trim().length === 1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1E35] to-[#1A2B4A] flex flex-col items-center justify-center p-4 selection:bg-[#1A2B4A] selection:text-white" id="verify-viewport">
      
      {/* Centered White Card */}
      <div className="w-full max-w-[420px] bg-white rounded-[24px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col" id="verify-card-box">
        
        {/* Card Header (Same Senegal VTC style) */}
        <div className="bg-[#1A2B4A] text-white p-6 rounded-t-[24px] text-center relative" id="verify-card-header">
          <div className="absolute top-4 right-4 text-emerald-400 font-extrabold text-[10px] tracking-widest uppercase bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
            Sénégal 🇸🇳
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 mx-auto flex items-center justify-center shadow-inner mb-3" id="vtc-icon-badge">
            <span className="text-2xl" role="img" aria-label="car">🚗</span>
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider text-white">VTC Sénégal</h2>
          <p className="text-xs text-slate-300 font-medium tracking-wide mt-1">Espace Chauffeur Professionnel</p>
        </div>

        {/* --- STEP 3 SUCCESS SCREEN CONTAINER --- */}
        {isSuccessState ? (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-4 py-16 animate-in zoom-in-95 duration-300" id="success-state-block">
            {/* Visual Progress indicating successfully completed task */}
            <div className="flex items-center justify-center gap-1.5 py-1 mb-2" id="success-progress-dots">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="w-6 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            {/* Pulsing Success Checkmark ring in emerald colors */}
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center border-4 border-emerald-500 animate-[bounce_1.5s_infinite_ease-in-out]" id="success-icon-badge">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 stroke-[2.5]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-emerald-900">Email vérifié !</h3>
              <p className="text-xs text-slate-500 font-bold tracking-wide uppercase">Bienvenue à bord de Gaïndé Chauffeur.</p>
              <p className="text-[11px] text-slate-400">Redirection automatique vers votre tableau de bord en cours...</p>
            </div>
            
            {/* Tiny loading dot spinner indicator */}
            <div className="flex gap-1 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce delay-0"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce delay-150"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce delay-300"></span>
            </div>
          </div>
        ) : (
          /* --- STEP 2 LOGIC PANEL --- */
          <div className="p-6 flex-1 flex flex-col gap-5" id="verify-card-content">
            
            {/* Progress indicators: Step 1 = Passed (green), Step 2 = Active elongated navy blue, Step 3 = gray */}
            <div className="flex items-center justify-center gap-1.5 py-1" id="verify-progress-dots">
              <span className="w-2 h-2 rounded-full bg-emerald-500 transition-all duration-300" title="Étape 1: Validée"></span>
              <span className="w-6 h-2 rounded-full bg-[#1A2B4A] transition-all duration-300" title="Étape 2: Active"></span>
              <span className="w-2 h-2 rounded-full bg-slate-200 transition-all duration-300" title="Étape 3: Finalisation"></span>
            </div>

            {/* Back to Login action */}
            <button
              onClick={() => router.push('/login')}
              className="self-start text-[11px] font-bold text-slate-500 hover:text-[#1A2B4A] flex items-center gap-1 transition-colors cursor-pointer"
              id="back-to-login-link"
            >
              <ArrowLeft className="h-3 w-3" /> Changer d'email
            </button>

            <div className="space-y-1 text-center">
              <h3 className="text-base font-extrabold text-[#1A2B4A]">Vérification du code</h3>
              <p className="text-xs text-slate-500">
                Saisissez le code de sécurité temporaire à 6 chiffres envoyé à <strong className="text-slate-800 font-semibold">{getMaskedEmail(rawEmail)}</strong>
              </p>
            </div>

            {/* Red Alert Error Banner */}
            {errorText && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-bold flex items-start gap-2" id="verify-error-msg">
                <span className="text-red-500 font-extrabold leading-none shrink-0 mt-0.5">⚠️</span>
                <p>{errorText}</p>
              </div>
            )}

            {/* Success Resend Banner */}
            {resendStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl font-bold flex items-start gap-2" id="verify-resend-success">
                <span className="text-emerald-500 font-extrabold leading-none shrink-0 mt-0.5">✓</span>
                <p>{resendStatus}</p>
              </div>
            )}

            {/* Green info box explaining where to search for email code precisely */}
            <div className="bg-[#E1F5EE] border border-emerald-200 text-[#0c4030] rounded-xl p-3 text-xs leading-relaxed flex items-start gap-2.5" id="green-info-box">
              <Info className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold block text-[11px] uppercase tracking-wide text-emerald-950 mb-0.5">Où trouver le code ?</strong>
                Utilisez le code secret temporaire reçu par e-mail. Si vous ne le trouvez pas, vérifiez votre dossier de <strong className="font-bold underline">Courriers indésirables / Spams</strong>.
              </div>
            </div>

            {/* 6 Grid Individual OTP Boxes */}
            <div className="flex justify-between items-center gap-1.5 py-1" id="otp-inputs-grid" onPaste={handlePaste}>
              {otp.map((value, i) => (
                <input
                  key={i}
                  ref={inputRefs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={2} // Allows overwrites smoothly
                  value={value}
                  onChange={(e) => handleInputChange(e.target.value, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  placeholder="-"
                  className="w-12 h-14 text-center text-lg font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-[12px] focus:bg-white focus:border-[#1A2B4A] focus:ring-1 focus:ring-slate-100 outline-hidden transition-all shadow-xs"
                  id={`otp-cell-${i}`}
                />
              ))}
            </div>

            {/* Verify Button (Disabled if OTP is incomplete) */}
            <button
              type="button"
              onClick={handleVerify}
              disabled={isLoading || !isOtpComplete}
              className={`w-full font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 ${
                isOtpComplete 
                  ? 'bg-[#1A2B4A] hover:bg-[#233b66] text-white cursor-pointer' 
                  : 'bg-slate-150 text-slate-400 cursor-not-allowed border border-slate-200/50'
              }`}
              id="btn-verify-submit"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  Vérification en cours...
                </>
              ) : (
                'Vérifier mon code'
              )}
            </button>

            {/* Resend and Timer cooldown controls */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100" id="verify-cooldown-actions">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading || timerSeconds > 0}
                className={`text-[11px] font-extrabold flex items-center gap-1.5 transition-colors ${
                  timerSeconds > 0 
                    ? 'text-slate-400 cursor-not-allowed pointer-events-none' 
                    : 'text-[#1A2B4A] hover:text-[#233b66] hover:underline cursor-pointer'
                }`}
                id="btn-resend-otp"
              >
                <RefreshCcw className={`h-3.5 w-3.5 ${timerSeconds > 0 ? '' : 'animate-spin-slow'}`} />
                {timerSeconds > 0 ? `Renvoyer le code (${timerSeconds}s)` : 'Renvoyer le code'}
              </button>

              <a
                href="tel:+221770000000"
                className="text-[11px] font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                id="verify-phone-help"
              >
                📞 Assistance
              </a>
            </div>

          </div>
        )}

      </div>

      {/* Watermark platform layout */}
      <span className="text-[10px] font-mono text-slate-500 mt-6 tracking-widest uppercase opacity-40">
        Authentification 100% Sécurisée par Supabase
      </span>

    </div>
  )
}
