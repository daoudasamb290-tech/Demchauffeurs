/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { playChime } from '../data';
import { X, CheckCircle, MapPin, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

interface WithdrawModalProps {
  currentBalanceFCFA: number;
  onWithdrawSuccess: (amount: number) => void;
  onClose: () => void;
}

export default function WithdrawModal({ currentBalanceFCFA, onWithdrawSuccess, onClose }: WithdrawModalProps) {
  const [method, setMethod] = useState<'plateau' | 'almadies'>('plateau');
  const [amount, setAmount] = useState<number>(15000);
  const [driverCode, setDriverCode] = useState('MK-1482');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError("Veuillez saisir un montant valide.");
      return;
    }

    if (amount > currentBalanceFCFA) {
      setError(`Solde insuffisant. Votre solde maximum est de ${currentBalanceFCFA} FCFA.`);
      return;
    }

    if (amount < 2000) {
      setError("Le montant minimum de retrait est de 2 000 FCFA.");
      return;
    }

    setLoading(true);
    playChime('click');

    // Simulate voucher generation network latency
    setTimeout(() => {
      setLoading(false);
      const referenceId = "WD-" + Math.floor(100000 + Math.random() * 900000);
      
      const receiptData = {
        id: referenceId,
        withdrawnAmount: amount,
        fee: 0, // No mobile money fees for cash agency desk
        method: method === 'plateau' ? "Agence Plateau (Siège)" : "Kiosque Almadies (VDN)",
        driverCode: driverCode,
        date: new Date().toLocaleDateString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      };

      setReceipt(receiptData);
      onWithdrawSuccess(amount);
      playChime('success');
    }, 1800);
  };

  const handleMethodChange = (m: 'plateau' | 'almadies') => {
    setMethod(m);
    playChime('click');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="withdraw-modal-overlay">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200" id="withdraw-modal-body">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest text-left">Bon de Retrait d'Espèces</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            id="btn-close-withdraw-modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!receipt ? (
          <form onSubmit={handleWithdraw} className="p-5 space-y-4 flex-1">
            
            {/* Balance state */}
            <div className="bg-teal-50 border border-teal-100 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider text-left">Solde Retirable</p>
                <p className="text-lg font-bold text-teal-900 font-mono tracking-tight">{currentBalanceFCFA.toLocaleString('fr-FR')} <span className="text-xs font-semibold">FCFA</span></p>
              </div>
              <span className="text-[10px] bg-teal-600 text-white font-bold py-1 px-2.2 rounded-lg">Cash Agence</span>
            </div>

            {/* Withdraw choices */}
            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider text-left">
                Guichet physique de retrait (Dakar)
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleMethodChange('plateau')}
                  className={`py-3 px-2 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                    method === 'plateau' 
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-800 shadow-sm' 
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                  id="choice-plateau-payout"
                >
                  <span className="text-sm">🏛️</span>
                  <span>Dakar Plateau</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodChange('almadies')}
                  className={`py-3 px-2 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                    method === 'almadies' 
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-800 shadow-sm' 
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                  id="choice-almadies-payout"
                >
                  <span className="text-sm">🛖</span>
                  <span>Les Almadies</span>
                </button>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 text-left">
                  Code Chauffeur Officiel
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">🔑</span>
                  <input
                    type="text"
                    required
                    value={driverCode}
                    onChange={(e) => setDriverCode(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 text-left">
                  Montant en espèces à retirer (FCFA)
                </label>
                <input
                  type="number"
                  required
                  min="2000"
                  step="500"
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-500 font-extrabold text-teal-800"
                />
              </div>
            </div>

            {error && (
              <p className="text-[10px] text-red-500 font-medium bg-red-50 p-2.5 rounded-xl border border-red-100 text-left">
                ⚠️ {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1A365D] hover:bg-indigo-950 text-white font-bold py-3 px-4 rounded-xl shadow-lg text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              id="btn-process-payout"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Génération du bon d'espèces...
                </>
              ) : (
                <>
                  Générer le Bon de Retrait <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Cash voucher style ticket */
          <div className="p-5 space-y-4 flex-1 flex flex-col items-center text-center animate-in fade-in duration-300">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-1">
              <CheckCircle className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">Bon de Retrait Émis !</h4>
              <p className="text-[11px] text-slate-400">Présentez ce reçu au guichet physique pour toucher vos espèces.</p>
            </div>

            {/* Receipt ticket */}
            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-2.5 text-left font-mono text-slate-600 relative">
              {/* Receipt teeth visual */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle,_transparent_10%,_#f8fafc_10%)] bg-repeat-x bg-[length:12px_12px] opacity-100"></div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-dashed border-slate-200 pb-1.5 pt-1">
                <span>RÉFÉRENCE DE RETRAIT</span>
                <span className="font-bold">{receipt.id}</span>
              </div>

              <div className="flex justify-between items-center">
                <span>Guichet de Retrait :</span>
                <span className="font-bold text-slate-800">{receipt.method}</span>
              </div>

              <div className="flex justify-between items-center">
                <span>Chauffeur :</span>
                <span className="font-bold text-slate-800">{receipt.driverCode}</span>
              </div>

              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-1.5">
                <span>Frais de Service :</span>
                <span className="text-emerald-600 font-bold">Sans frais (0 FCFA)</span>
              </div>

              <div className="flex justify-between items-center text-sm pt-1">
                <span className="font-bold text-slate-800 font-sans">Montant en Espèces :</span>
                <span className="font-extrabold text-emerald-600">{receipt.withdrawnAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>

              <div className="text-[9px] text-slate-400 text-center pt-2 border-t border-slate-200/50">
                Gaïndé VTC Officiel • {receipt.date}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
              id="btn-dismiss-receipt"
            >
              Fermer le reçu
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
