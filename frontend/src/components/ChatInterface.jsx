import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Send, Loader2, Mic, MicOff, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';

const WELCOME = {
    en: "Namaste! I am NPS Bondhu. I can help you understand your pension benefits, tax savings, or guide you through the exit process. What's on your mind today?",
    hi: 'नमस्ते! मैं NPS बंधु हूं। मैं आपकी पेंशन लाभ, कर बचत, या बाहर निकलने की प्रक्रिया के बारे में मदद कर सकता हूं। आज आप क्या जानना चाहते हैं?',
    as: "নমস্কাৰ! মই NPS বন্ধু। মই আপোনাৰ পেঞ্চন সুবিধা, কৰ সঞ্চয়, বা প্ৰস্থান প্ৰক্ৰিয়াৰ বিষয়ে সহায় কৰিব পাৰোঁ। আজি আপোনাৰ মনত কি আছে?",
};

const PLACEHOLDERS = {
    en: 'Ask about tax, withdrawal, or PRAN...',
    hi: 'कर, निकासी, या PRAN के बारे में पूछें...',
    as: 'কৰ, উলিওৱা, বা PRAN ৰ বিষয়ে সোধক...',
};

const CHIPS = {
    en: ['Exit Rules', 'Tier II Account', 'Annuity Rates', 'Tax Benefits', 'PRAN Status'],
    hi: ['निकासी नियम', 'टियर II खाता', 'वार्षिकी दरें', 'कर लाभ', 'PRAN स्थिति'],
    as: ['প্ৰস্থান নিয়ম', 'টায়াৰ II একাউণ্ট', 'বাৰ্ষিক হাৰ', 'কৰ সুবিধা', 'PRAN স্থিতি'],
};

// BCP-47 language tags for Web Speech API
const SPEECH_LANG = {
    en: 'en-IN',
    hi: 'hi-IN',
    as: 'as-IN',
};

const ChatInterface = ({ language }) => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: WELCOME[language] || WELCOME['en'],
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const recognitionRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        if (messages.length === 1 && messages[0].role === 'assistant') {
            setMessages([
                {
                    role: 'assistant',
                    content: WELCOME[language] || WELCOME['en'],
                    timestamp: new Date(),
                },
            ]);
        }
    }, [language]);

    // Clean up speech recognition on unmount or language change
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
                recognitionRef.current = null;
            }
        };
    }, [language]);

    // ---------- Voice Input Logic ----------
    const toggleVoiceInput = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert('Your browser does not support voice input. Please use Chrome or Edge.');
            return;
        }

        // If already listening, stop
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = SPEECH_LANG[language] || 'en-IN';
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;

        recognitionRef.current = recognition;

        // Preserve any text already in the input
        const existingText = input;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            let interim = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interim += transcript;
                }
            }
            // Append to any existing text in the input
            const prefix = existingText ? existingText + ' ' : '';
            setInput(prefix + finalTranscript + interim);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            recognitionRef.current = null;
        };

        recognition.onend = () => {
            setIsListening(false);
            recognitionRef.current = null;
            // Focus input so user can edit / send
            inputRef.current?.focus();
        };

        recognition.start();
    }, [isListening, language, input]);

    const sendMessage = async (text) => {
        if (!text.trim() || isLoading) return;

        // Stop listening if active
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
        }

        const userMessage = { role: 'user', content: text.trim(), timestamp: new Date() };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
            if (!apiBaseUrl) {
                throw new Error('VITE_API_BASE_URL is not configured. Add it to your Vercel environment variables.');
            }
            const response = await axios.post(`${apiBaseUrl}/chat`, {
                message: userMessage.content,
                language: language,
            });

            const botMessage = {
                role: 'assistant',
                content: response.data.answer,
                sources: response.data.sources,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error('Error:', error);
            // Check if it's a timeout / network error (Render free tier cold start)
            const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.message?.includes('Network Error');
            const errMsgs = isTimeout
                ? {
                    en: 'The server is waking up — this can take 30–60 seconds on the first request. Please try again in a moment!',
                    hi: 'सर्वर जाग रहा है — पहले अनुरोध में 30-60 सेकंड लग सकते हैं। कृपया थोड़ी देर में पुनः प्रयास करें!',
                    as: 'চাৰ্ভাৰটো জাগি উঠিছে — প্ৰথম অনুৰোধত ৩০–৬০ ছেকেণ্ড লাগিব পাৰে। অনুগ্ৰহ কৰি অলপ পিছত পুনৰাই চেষ্টা কৰক!',
                }
                : {
                    en: 'Sorry, I encountered an error. Please try again.',
                    hi: 'क्षमा करें, एक त्रुटि हुई। कृपया पुनः प्रयास करें।',
                    as: 'দুঃখিত, এটা ত্ৰুটি হৈছে। অনুগ্ৰহ কৰি পুনৰাই চেষ্টা কৰক।',
                };
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: errMsgs[language] || errMsgs['en'], isError: true, timestamp: new Date() },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(input);
    };

    const showWelcome = messages.length <= 1;

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-blue-50/40 via-slate-50 to-slate-50 relative overflow-hidden">
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-4 md:pt-6 pb-44">
                <div className="max-w-2xl mx-auto w-full">

                    {/* ── Elegant Welcome Banner ── */}
                    {showWelcome && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="text-center pt-8 pb-8 mb-4"
                        >
                            <motion.div
                                initial={{ scale: 0.85, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.15 }}
                                className="inline-flex items-center justify-center w-24 h-24 mb-4"
                            >
                                <img
                                    src="/nps-logo.svg"
                                    alt="NPS Bondhu Logo"
                                    className="w-full h-full object-contain drop-shadow-sm"
                                />
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.3 }}
                                className="text-2xl md:text-[28px] font-bold text-slate-800 tracking-tight mb-2"
                            >
                                Welcome to NPS Bondhu
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.45 }}
                                className="text-sm md:text-[15px] text-slate-500 leading-relaxed mb-1.5"
                            >
                                Your AI-Powered Guide to the National Pension System
                            </motion.p>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.6 }}
                                className="text-xs text-blue-400/60 font-medium tracking-wide"
                            >
                                Powered by Official NPS Documents
                            </motion.p>
                        </motion.div>
                    )}

                    {/* Messages */}
                    <AnimatePresence initial={false}>
                        {messages.map((msg, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: index === 0 ? 0.15 : 0 }}
                            >
                                <MessageBubble message={msg} />
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Typing indicator */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-2.5 mb-4"
                        >
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center mt-1 shadow-sm">
                                <Loader2 size={14} className="text-white animate-spin" />
                            </div>
                            <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-md px-5 py-3.5 shadow-sm">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-slate-400 typing-dot" />
                                    <div className="w-2 h-2 rounded-full bg-slate-300 typing-dot" />
                                    <div className="w-2 h-2 rounded-full bg-slate-200 typing-dot" />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Bottom Bar: Chips + Input */}
            <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
                {/* Quick Chips — scrollable row */}
                <div className="overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2 px-4 md:px-6 pt-3 pb-2 max-w-2xl mx-auto">
                        {(CHIPS[language] || CHIPS['en']).map((chip, i) => (
                            <button
                                key={i}
                                onClick={() => sendMessage(chip)}
                                disabled={isLoading}
                                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-medium
                  bg-white/80 border border-blue-100/60 text-slate-500
                  hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/60
                  hover:-translate-y-0.5 hover:shadow-sm hover:shadow-blue-100/40
                  active:scale-95 transition-all duration-200
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            >
                                {chip}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input */}
                <div className="px-4 md:px-6 pb-4">
                    <div className="max-w-2xl mx-auto">
                        <form onSubmit={handleSubmit} className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={PLACEHOLDERS[language] || PLACEHOLDERS['en']}
                                    className="w-full pl-4 pr-10 py-3 bg-blue-50/40 border border-blue-100/50 rounded-full
                    focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100
                    hover:border-blue-200/70 transition-all duration-200 text-sm text-slate-700 placeholder:text-slate-400"
                                    disabled={isLoading}
                                />
                                {/* Voice Input Button */}
                                <button
                                    type="button"
                                    onClick={toggleVoiceInput}
                                    disabled={isLoading}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-200 ${isListening
                                        ? 'text-red-500 hover:text-red-600'
                                        : 'text-slate-400 hover:text-slate-600'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    title={isListening ? 'Stop listening' : 'Voice input'}
                                >
                                    {/* Pulse ring when listening */}
                                    {isListening && (
                                        <span className="absolute inset-0 -m-1.5 rounded-full border-2 border-red-400 animate-ping opacity-50" />
                                    )}
                                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${input.trim() && !isLoading
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 hover:-translate-y-0.5 active:scale-90'
                                    : 'bg-blue-50 text-blue-300 cursor-not-allowed'
                                    }`}
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <Send size={18} className={input.trim() ? 'translate-x-[1px]' : ''} />
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;
