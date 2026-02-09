'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Bot, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const GENERATED_OPTIONS: Record<string, string[]> = {
    hype: [
        "🔥 BIG NEWS! The jackpot just hit 50k! Don't miss your chance to be the next millionaire. Play Now!",
        "🚀 TO THE MOON! Deposit today and get 2x Bonus. Limited seats available!",
        "💎 EXCLUSIVE: VIP status is easier to reach this weekend. Deposit and climb the ranks!",
        "⚡ FLASH SALE: 50% extra on all deposits for the next hour! Go go go!",
        "🏆 CHAMPIONSHIP SUNDAY: The big tournament starts in 1 hour. 100k Prize Pool!",
    ],
    formal: [
        "Dear User, check out the new Tournament schedule. Generous prizes await.",
        "Notice: System maintenance complete. Enjoy improved performance and new games.",
        "Update: We have updated our Terms of Service to better protect your account security.",
        "Payment Processed: Withdrawal speeds have been improved. Thank you for your patience.",
        "Weekly Digest: Here is a summary of your gaming activity and rewards points.",
    ],
    fun: [
        "🎱 Bingo Time! Who's feeling lucky? Tag a friend and join the lobby! 🎉",
        "👀 Spotted: A massive win! Could you be next? Let's gooooo!",
        "🤔 Riddle me this: What has numbers but never counts? A Bingo card! Play now!",
        "🌈 Somewhere over the rainbow... is a pot of gold (and a Bingo win). Good luck!",
        "🍕 Pizza + Bingo = The perfect Friday night. Who's with us?",
    ],
    urgent: [
        "⏰ Last Chance! The weekend bonus expires in 2 hours. Claim it now!",
        "⚠️ Alert: Your daily free spin is waiting. Don't let it fade away!",
        "⏳ Tick tock... The tournament registration closes soon.",
    ]
};

export function AICopywriter({ onGenerate }: { onGenerate: (text: string) => void }) {
    const [tone, setTone] = useState('hype');
    const [loading, setLoading] = useState(false);

    const handleMagic = async () => {
        setLoading(true);
        // Simulate API delay
        await new Promise(r => setTimeout(r, 1500));

        const options = GENERATED_OPTIONS[tone] || GENERATED_OPTIONS['hype'];
        const random = options[Math.floor(Math.random() * options.length)];

        onGenerate(random);
        setLoading(false);
        toast.success("AI generated fresh copy!");
    };

    return (
        <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-2 rounded-lg border border-purple-500/20">
            <div className="bg-purple-500/20 p-2 rounded-md">
                <Bot className="w-4 h-4 text-purple-400" />
            </div>

            <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="h-8 w-24 border-none bg-transparent text-xs focus:ring-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="hype">🔥 Hype</SelectItem>
                    <SelectItem value="formal">👔 Formal</SelectItem>
                    <SelectItem value="fun">🎉 Fun</SelectItem>
                    <SelectItem value="urgent">⏰ Urgent</SelectItem>
                </SelectContent>
            </Select>

            <Button
                size="sm"
                onClick={handleMagic}
                className="h-8 text-xs bg-purple-600 hover:bg-purple-700 ml-auto shadow-[0_0_10px_rgba(147,51,234,0.3)] animate-shimmer"
                disabled={loading}
            >
                {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                {loading ? 'Thinking...' : 'Generate'}
            </Button>
        </div>
    );
}
