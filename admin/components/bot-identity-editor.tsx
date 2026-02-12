
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fetchAdmin } from "@/lib/api";
import { Loader2, Save } from "lucide-react";

export function BotIdentityEditor({ onSave }: { onSave?: (data: any) => void }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        shortDescription: "",
        description: ""
    });

    useEffect(() => {
        // Ideally fetch current identity from API or cache
        // For now start empty or assume parent might pass initial data
        // fetchAdmin('/bot/identity').then... (GET not implemented yet, using cache?)
        // Let's just allow setting NEW values.
    }, []);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await fetchAdmin('/bot/identity', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            toast.success("Bot Identity Updated in Telegram!");
            if (onSave) onSave(formData);
        } catch (error: any) {
            toast.error(error.message || "Failed to update identity");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4">
                <div className="space-y-2">
                    <Label htmlFor="bot-name" className="text-white">Bot Name (Display Name)</Label>
                    <Input
                        id="bot-name"
                        placeholder="e.g. Bingo Ethiopia 🇪🇹"
                        className="bg-black/20 border-white/10 text-white"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                    />
                    <p className="text-xs text-white/40">Appears in chat list and headers.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="short-desc" className="text-white">Short Description (About)</Label>
                    <Input
                        id="short-desc"
                        placeholder="e.g. Play Bingo & Win Real Money!"
                        className="bg-black/20 border-white/10 text-white"
                        value={formData.shortDescription}
                        onChange={(e) => handleChange('shortDescription', e.target.value)}
                    />
                    <p className="text-xs text-white/40">Appears on the bot profile page and when sharing the bot.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="desc" className="text-white">Description (Intro)</Label>
                    <Textarea
                        id="desc"
                        placeholder="e.g. Welcome to the #1 Bingo Game in Ethiopia..."
                        className="bg-black/20 border-white/10 text-white min-h-[100px]"
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                    />
                    <p className="text-xs text-white/40">Appears when users open the empty chat with the bot.</p>
                </div>
            </div>

            <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto"
            >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save to Telegram
            </Button>
        </div>
    );
}
