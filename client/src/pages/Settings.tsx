import { useState } from 'react';
import { User, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { voiceCaller } from '../services/voiceCaller';

const Settings = () => {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(voiceCaller.isMuted());

    type SettingsItem = {
        icon: any;
        label: string;
        action: () => void;
        toggle?: boolean;
        value?: boolean;
    };


    const settingsSections: { title: string; items: SettingsItem[] }[] = [
        {
            title: 'Preferences',
            items: [
                {
                    icon: isMuted ? VolumeX : Volume2,
                    label: 'Caller Sound',
                    action: () => {
                        const newState = !isMuted;
                        setIsMuted(newState);
                        voiceCaller.setMuted(newState);
                    },
                    toggle: true,
                    value: !isMuted // "On" if not muted
                }
            ]
        },

    ];

    return (
        <div className="min-h-screen bg-[#0B1120] pb-20">
            {/* Profile Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 mb-6 shadow-2xl shadow-purple-500/20"
            >
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border-4 border-white/30">
                        <User size={40} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-black text-white">{user?.firstName || 'Player'}</h2>
                        <p className="text-white/80 text-sm">@{user?.username || 'user'}</p>
                        <div className="mt-2 bg-white/20 backdrop-blur-lg rounded-full px-3 py-1 inline-block">
                            <span className="text-white text-xs font-bold">Balance: {user?.balance || 1000} Birr</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Settings Sections */}
            <div className="space-y-6">
                {settingsSections.map((section, sectionIndex) => (
                    <motion.div
                        key={section.title}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: sectionIndex * 0.1 }}
                    >
                        <h3 className="text-slate-400 text-sm font-bold uppercase mb-3 px-2">{section.title}</h3>
                        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
                            {section.items.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={item.action}
                                    className={cn(
                                        "w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors",
                                        index !== section.items.length - 1 && "border-b border-slate-800"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                                            <item.icon size={20} className="text-indigo-400" />
                                        </div>
                                        <span className="text-white font-medium">{item.label}</span>
                                    </div>

                                    {item.toggle ? (
                                        <div className={cn(
                                            "w-12 h-6 rounded-full transition-colors relative",
                                            item.value ? "bg-indigo-600" : "bg-slate-700"
                                        )}>
                                            <div className={cn(
                                                "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                                                item.value ? "left-6" : "left-0.5"
                                            )} />
                                        </div>
                                    ) : (
                                        <ChevronRight size={20} className="text-slate-500" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                ))}

                {/* HOW TO PLAY SECTION (Accordion) */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <details className="group bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
                        <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-slate-800/50 transition-colors">
                            <h3 className="text-slate-400 text-sm font-bold uppercase">HOW TO PLAY</h3>
                            <ChevronRight size={20} className="text-slate-500 transition-transform group-open:rotate-90" />
                        </summary>

                        <div className="p-6 pt-0 text-slate-300 space-y-4 border-t border-slate-800/50">
                            <section>
                                <h4 className="text-white font-bold mb-2">🃏 መጫወቻ ካርድ</h4>
                                <ul className="list-disc pl-4 space-y-2 text-sm">
                                    <li>ጨዋታውን ለመጀመር ከሚመጣልን ከ1-300 የመጫወቻ ካርድ ውስጥ አንዱን እንመርጣለን።</li>
                                    <li>የመጫወቻ ካርዱ ላይ በቀይ ቀለም የተመረጡ ቁጥሮች የሚያሳዩት መጫወቻ ካርድ በሌላ ተጫዋች መመረጡን ነው።</li>
                                    <li>የመጫወቻ ካርድ ስንነካው ከታች በኩል ካርድ ቁጥሩ የሚይዘዉን መጫወቻ ካርድ ያሳየናል።</li>
                                    <li>ወደ ጨዋታው ለመግባት የምንፈልገዉን ካርድ ከመረጥን ለምዝገባ የተሰጠው ሰኮንድ ዜሮ ሲሆን ቀጥታ ወደ ጨዋታ ያስገባናል።</li>
                                </ul>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">🎮 ጨዋታ</h4>
                                <ul className="list-disc pl-4 space-y-2 text-sm">
                                    <li>ወደ ጨዋታው ስንገባ በመረጥነው የካርድ ቁጥር መሰረት የመጫወቻ ካርድ እናገኛለን።</li>
                                    <li>ጨዋታው ሲጀምር የተለያዪ ቁጥሮች ከ1 እስከ 75 መጥራት ይጀምራል።</li>
                                    <li>የሚጠራው ቁጥር የኛ መጫወቻ ካርድ ውስጥ ካለ የተጠራውን ቁጥር ክሊክ በማረግ መምረጥ እንችላለን።</li>
                                    <li>የመረጥነውን ቁጥር ማጥፋት ከፈለግን መልሰን እራሱን ቁጥር ክሊክ በማረግ ማጥፋት እንችላለን።</li>
                                </ul>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">🏆 አሸናፊ</h4>
                                <ul className="list-disc pl-4 space-y-2 text-sm">
                                    <li>ቁጥሮቹ ሲጠሩ ከመጫወቻ ካርዳችን ላይ እየመረጥን ወደጎን ወይም ወደታች ወይም ወደሁለቱም አግዳሚ ወይም አራቱን ማእዘናት ከመረጥን ወዲያውኑ ከታች በኩል bingo የሚለውን በመንካት ማሸነፍ እንችላለን።</li>
                                    <li>ወደጎን ወይም ወደታች ወይም ወደሁለቱም አግዳሚ ወይም አራቱን ማእዘናት ሳይጠሩ bingo የሚለውን ክሊክ ካደረግን ከጨዋታው እንታገዳለን።</li>
                                    <li>ሁለት ወይም ከዚያ በላይ ተጫዋቾች እኩል ቢያሸንፉ ደራሹ ለቁጥራቸው ይካፈላል።</li>
                                </ul>
                            </section>
                        </div>
                    </details>
                </motion.div>

                {/* FAQ SECTION (Accordion) */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <details className="group bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
                        <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-slate-800/50 transition-colors">
                            <h3 className="text-slate-400 text-sm font-bold uppercase">FAQ</h3>
                            <ChevronRight size={20} className="text-slate-500 transition-transform group-open:rotate-90" />
                        </summary>

                        <div className="p-4 pt-0 space-y-3 border-t border-slate-800/50">
                            {/* FAQ Item 1 */}
                            <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/50">
                                <h4 className="text-white font-bold text-sm mb-1">ገንዘብ እንዴት ማስገባት ይቻላል?</h4>
                                <p className="text-slate-400 text-xs">Wallet ገብተው Deposit የሚለውን ይጫኑ። የመረጡትን ባንክ እና መጠን በማስገባት ክፍያ መፈጸም ይችላሉ።</p>
                            </div>
                            {/* FAQ Item 2 */}
                            <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/50">
                                <h4 className="text-white font-bold text-sm mb-1">ዕለታዊ ጉርሻ (Daily Bonus) ምንድን ነው?</h4>
                                <p className="text-slate-400 text-xs">DAILY BONUS በቴሌግራም ቦቱ @BingoEthiopiaBot በኩል ብቻ ይከፈላል። በየቀኑ ቦቱ ላይ በመግባት Claim ማድረግ ይችላሉ።</p>
                            </div>
                            {/* FAQ Item 3 */}
                            <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/50">
                                <h4 className="text-white font-bold text-sm mb-1">ክፍያ ቢዘገይ ምን ማድረግ አለብኝ?</h4>
                                <p className="text-slate-400 text-xs">ክፍያው ከተለመደው ጊዜ (5-10 ደቂቃ) በላይ ከዘገየ፣ Support የሚለውን በመንካት የደንበኞች አገልግሎትን ያነጋግሩ።</p>
                            </div>
                        </div>
                    </details>
                </motion.div>
            </div>

            {/* App Info */}
            <div className="mt-8 text-center text-slate-500 text-sm">
                <p>Bingo Ethiopia v3.3</p>
                <p className="mt-1">Made with ❤️ in Ethiopia</p>
            </div>
        </div>
    );
};

export default Settings;
