/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Ride, ChatMessage } from '../types';
import { PRESET_DRIVER_REPLIES, PRESET_CLIENT_TEXTS, playChime } from '../data';
import { Send, Phone, MessageSquare, CornerDownLeft, Sparkles, Smile } from 'lucide-react';

interface ActiveChatProps {
  activeRide: Ride;
  onSendMessage: (message: ChatMessage) => void;
  onClose: () => void;
}

export default function ActiveChat({ activeRide, onSendMessage, onClose }: ActiveChatProps) {
  const [typedMessage, setTypedMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeRide.messages.length]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const newMsg: ChatMessage = {
      id: "msg-" + Date.now().toString(),
      sender: 'driver',
      text: text.trim(),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    onSendMessage(newMsg);
    setTypedMessage('');
    playChime('click');

    // Simulate Passenger Response after 1.5s
    setTimeout(() => {
      const passengerReplies = PRESET_CLIENT_TEXTS;
      const luckyReply = passengerReplies[Math.floor(Math.random() * passengerReplies.length)];
      
      const replyMsg: ChatMessage = {
        id: "msg-reply-" + Date.now().toString(),
        sender: 'client',
        text: luckyReply,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      
      onSendMessage(replyMsg);
      playChime('ride-alert'); // Ringer chime for incoming passenger text
    }, 1500);
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(typedMessage);
  };

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden shadow-lg h-full flex flex-col" id="active-chat-container">
      
      {/* Header */}
      <div className="p-3 bg-indigo-950 text-white flex items-center justify-between" id="chat-header">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100/25 flex items-center justify-center font-bold text-indigo-300 text-xs">
            {activeRide.clientAvatar}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 truncate max-w-[120px]">{activeRide.clientName}</h4>
            <p className="text-[9px] text-slate-300 font-medium">Passager • En ligne</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <a 
            href={`tel:${activeRide.clientPhone}`}
            className="w-8 h-8 rounded-full bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            id="chat-phone-direct"
          >
            <Phone className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Messages Live Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[180px] min-h-[140px] bg-[#E5DDD5]/40" id="chat-scroller">
        {activeRide.messages.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-[10px] space-y-1">
            <MessageSquare className="h-5 w-5 mx-auto opacity-40" />
            <p className="font-semibold">Chat sécurisé crypté</p>
            <p>Envoyez un message rapide ci-dessous</p>
          </div>
        ) : (
          activeRide.messages.map((msg) => {
            const isDriver = msg.sender === 'driver';
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[85%] ${isDriver ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                id={`chat-bubble-${msg.id}`}
              >
                <div className={`p-2.5 rounded-2xl text-xs ${
                  isDriver 
                    ? 'bg-emerald-600 text-white rounded-tr-none shadow-sm' 
                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-sm'
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
                <span className="text-[8px] text-slate-400 mt-0.5 px-1">{msg.time}</span>
              </div>
            );
          })
        )}
        <div ref={chatEndRef}></div>
      </div>

      {/* Driver Quick replies palette */}
      <div className="p-2 border-t border-slate-100/80 bg-white" id="quick-replies-rack">
        <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 px-1 flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5 text-indigo-500" /> Réponses rapides du chauffeur
        </p>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none" id="quick-replies-scroll">
          {PRESET_DRIVER_REPLIES.map((rep, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(rep)}
              className="px-2.5 py-1 text-[10px] font-medium bg-slate-50 border border-slate-200/60 rounded-full hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 transition-all flex-shrink-0 cursor-pointer"
              id={`reply-bullet-${i}`}
            >
              {rep}
            </button>
          ))}
        </div>
      </div>

      {/* Input row */}
      <form onSubmit={submitForm} className="p-2 border-t border-slate-100 bg-white flex gap-1.5 items-center" id="reply-custom-form">
        <div className="relative flex-1">
          <input
            type="text"
            required
            value={typedMessage}
            onChange={(e) => setTypedMessage(e.target.value)}
            placeholder="Écrivez un message ou wolof..."
            className="w-full text-xs pl-2.5 pr-8 py-2 bg-slate-100/80 rounded-xl focus:outline-none focus:bg-slate-50 border border-transparent focus:border-slate-300 font-medium text-slate-800"
          />
          <button type="button" className="absolute right-2 top-2 text-slate-400 hover:text-slate-600">
            <Smile className="h-4 w-4" />
          </button>
        </div>
        <button
          type="submit"
          disabled={!typedMessage.trim()}
          className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 flex-shrink-0"
          id="btn-submit-text-chat"
        >
          <Send className="h-3.5 w-3.5 fill-current" />
        </button>
      </form>
    </div>
  );
}
