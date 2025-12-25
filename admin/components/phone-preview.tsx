'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Signal, Wifi, Battery, ChevronLeft, MoreVertical, Paperclip, Mic } from 'lucide-react';

interface PhonePreviewProps {
    message?: string;
    buttonText?: string;
    title?: string;
}

export function PhonePreview({ message, buttonText, title = "BingoBot" }: PhonePreviewProps) {
    // Basic HTML parser for preview (bold, italic, code)
    const renderMessage = (text: string) => {
        if (!text) return <span className="text-gray-400 italic">Type a message...</span>;

        let html = text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/g, '<strong>$1</strong>')
            .replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/g, '<em>$1</em>')
            .replace(/&lt;code&gt;(.*?)&lt;\/code&gt;/g, '<code class="bg-red-100 text-red-600 rounded px-1 text-xs font-mono">$1</code>');

        // Handle Newlines
        html = html.replace(/\n/g, '<br/>');

        return <div dangerouslySetInnerHTML={{ __html: html }} className="whitespace-pre-wrap break-words" />;
    };

    return (
        <div className="relative mx-auto w-[320px] h-[640px] bg-black rounded-[40px] border-[8px] border-gray-900 shadow-2xl overflow-hidden ring-1 ring-gray-800">
            {/* Dynamic Island / Notch */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-28 h-7 bg-black rounded-b-xl z-20 flex justify-center items-center">
                <div className="w-16 h-4 bg-gray-800/50 rounded-full" />
            </div>

            {/* Screen Content */}
            <div className="w-full h-full bg-[#0e1621] text-white flex flex-col font-sans">
                {/* Status Bar */}
                <div className="h-10 flex justify-between items-center px-6 text-[10px] font-bold tracking-widest pt-2">
                    <span>9:41</span>
                    <div className="flex gap-1.5">
                        <Signal className="w-3 h-3" />
                        <Wifi className="w-3 h-3" />
                        <Battery className="w-3 h-3" />
                    </div>
                </div>

                {/* App Header (Telegram Style) */}
                <div className="bg-[#17212b] p-3 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <ChevronLeft className="w-6 h-6 text-gray-400" />
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-400 to-cyan-500 flex items-center justify-center text-sm font-bold">
                                B
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm leading-tight">{title}</h3>
                                <p className="text-xs text-blue-400">bot</p>
                            </div>
                        </div>
                    </div>
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                </div>

                {/* Chat Area */}
                <div className="flex-1 bg-[#0e1621] p-4 overflow-y-auto bg-opacity-95"
                    style={{
                        backgroundImage: 'radial-gradient(#1f2936 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-end gap-2 max-w-[85%] self-start">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-cyan-500 flex-shrink-0 flex items-center justify-center text-xs font-bold">
                                B
                            </div>
                            <motion.div
                                layout
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="bg-[#182533] p-3 rounded-2xl rounded-tl-none shadow-sm text-sm"
                            >
                                <div className="text-[#aeb5bc] text-xs mb-1 font-medium">{title}</div>
                                {renderMessage(message || "")}
                                <div className="text-[10px] text-gray-500 text-right mt-1">
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </motion.div>
                        </div>

                        {buttonText && (
                            <motion.div
                                initial={{ y: 5, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="self-start ml-10 mt-1"
                            >
                                <button className="bg-[#2b5278] hover:bg-[#34628f] text-white text-xs font-semibold py-2 px-4 rounded-lg shadow-sm w-full transition-colors duration-200">
                                    {buttonText}
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Footer Input Area */}
                <div className="bg-[#17212b] p-3 flex items-center gap-3 border-t border-gray-800">
                    <Paperclip className="w-6 h-6 text-gray-500 transform rotate-45" />
                    <div className="flex-1 bg-[#0e1621] h-9 rounded-full px-4 flex items-center text-gray-500 text-sm">
                        Message...
                    </div>
                    <Mic className="w-6 h-6 text-gray-500" />
                </div>

                {/* Home Indicator */}
                <div className="h-5 flex justify-center items-end pb-1">
                    <div className="w-32 h-1 bg-gray-600 rounded-full" />
                </div>
            </div>
        </div>
    );
}
