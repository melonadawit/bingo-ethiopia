'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Megaphone, Target, Zap, Hash, Copy, Check, Send, Users, MapPin, Smartphone, PanelLeft, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Feature Components
import { DripBuilder } from '@/components/drip-builder';
import { TelegramEditor } from '@/components/telegram-editor';
import { PhonePreview } from '@/components/phone-preview';

export default function MarketingPage() {
    // --- Advanced Campaign State ---
    const [message, setMessage] = useState('');
    const [targetAudience, setTargetAudience] = useState('ALL');
    const [region, setRegion] = useState('ALL');
    const [campaignTitle, setCampaignTitle] = useState('Special Offer');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [buttonText, setButtonText] = useState('');
    const [buttonUrl, setButtonUrl] = useState('');

    // --- AI Campaign State ---
    const [concept, setConcept] = useState('');
    const [aiResults, setAiResults] = useState<{ type: 'text' | 'image', content: string }[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState('broadcast');
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);

    // --- Actions ---
    const sendCampaignMutation = useMutation({
        mutationFn: async () => {
            // Real API call
            const payload = {
                message,
                targetAudience,
                region,
                image: selectedImage,
                actions: (buttonText && buttonUrl) ? [{ text: buttonText, url: buttonUrl }] : []
            };

            return fetchAdmin('/broadcast', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        },
        onSuccess: (data: any) => {
            const count = data.count || 0;
            const fails = data.failCount || 0;
            if (count > 0) {
                toast.success(`Campaign "${campaignTitle}" sent to ${count} users!${fails > 0 ? ` (${fails} failed)` : ''}`);
            } else {
                toast.warning(`Campaign processed, but 0 users were reached. Check your filters.`);
            }
            setMessage('');
            setButtonText('');
            setButtonUrl('');
            setSelectedImage(null);
        },
    });

    const generateAiMutation = useMutation({
        mutationFn: async (type: 'text' | 'image') => {
            setIsGenerating(true);
            const endpoint = type === 'text' ? '/generate-announcement' : '/generate-image';
            const body = type === 'text'
                ? { topic: `${concept}. Write a short marketing message.`, type: 'event' }
                : { prompt: `Marketing poster for: ${concept}, vibrant` };

            return fetchAdmin(endpoint, {
                method: 'POST',
                body: JSON.stringify(body)
            });
        },
        onSuccess: (data: any, variables) => {
            if (variables === 'text') {
                setAiResults(prev => [{ type: 'text', content: data.message || data.title }, ...prev]);
            } else if (data.url) {
                setAiResults(prev => [{ type: 'image', content: data.url }, ...prev]);
            }
            toast.success("AI Generated Content");
            setIsGenerating(false);
        },
        onError: () => {
            toast.error("Generation Failed");
            setIsGenerating(false);
        }
    });

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-br from-pink-500/5 to-rose-500/5 p-8 rounded-3xl border border-white/10 shadow-xl backdrop-blur-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                <div className="z-10">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-500">Marketing Center</h1>
                    <p className="text-muted-foreground mt-2 text-lg">Manage Broadcasts, Drip Sequences, and Viral Campaigns.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-black/40 border border-white/10">
                    <TabsTrigger value="broadcast">📢 Campaign Studio</TabsTrigger>
                    <TabsTrigger value="drip">💧 Drip Automation</TabsTrigger>
                </TabsList>

                {/* --- TAB 1: CAMPAIGN STUDIO (Merged) --- */}
                <TabsContent value="broadcast" className="space-y-6">
                    <div className="flex flex-col lg:flex-row h-[calc(100vh-250px)] min-h-[600px]">

                        {/* LEFT COLUMN: AI Tools (Collapsible) */}
                        <div className={`transition-all duration-300 ease-in-out flex flex-col gap-4 h-full ${isAiPanelOpen ? 'w-[320px] opacity-100 mr-6' : 'w-0 opacity-0 overflow-hidden mr-0'}`}>
                            <Card className="bg-black/40 border-pink-500/20 shadow-xl backdrop-blur-xl flex-shrink-0 min-w-[320px]">
                                <CardHeader className="pb-3 px-4 pt-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Zap className="w-5 h-5 text-yellow-400" /> AI Assistant
                                        </CardTitle>
                                        <Button variant="secondary" size="icon" className="h-6 w-6 bg-white/10 hover:bg-white/20" title="Collapse Panel" onClick={() => setIsAiPanelOpen(false)}>
                                            <PanelLeft className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pb-4">
                                    <Input
                                        value={concept}
                                        onChange={(e) => setConcept(e.target.value)}
                                        placeholder="Idea: e.g. Rainy Day Bonus"
                                        className="bg-white/5 border-white/10 text-sm"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button size="sm" onClick={() => generateAiMutation.mutate('text')} disabled={isGenerating || !concept} variant="secondary" className="text-xs">
                                            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Write Copy"}
                                        </Button>
                                        <Button size="sm" onClick={() => generateAiMutation.mutate('image')} disabled={isGenerating || !concept} variant="outline" className="text-xs">
                                            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create Art"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Results Scrollable Area */}
                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar min-w-[320px]">
                                {aiResults.map((res, idx) => (
                                    <Card key={idx} className="bg-black/60 border-white/5 p-3 relative group">
                                        {res.type === 'text' ? (
                                            <p className="text-sm whitespace-pre-wrap text-muted-foreground line-clamp-4 hover:line-clamp-none transition-all">{res.content}</p>
                                        ) : (
                                            <img src={res.content} className="rounded md:h-24 w-full object-cover" />
                                        )}

                                        {/* Actions Overlay */}
                                        <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-white/5 opacity-80 group-hover:opacity-100 transition-opacity">
                                            {res.type === 'text' && (
                                                <Button size="icon" variant="secondary" className="h-6 w-6" title="Use in Editor" onClick={() => {
                                                    setMessage(res.content);
                                                    toast.success("Copied to Editor!");
                                                }}>
                                                    <Send className="w-3 h-3" />
                                                </Button>
                                            )}

                                            {res.type === 'image' && (
                                                <Button size="icon" variant="secondary" className="h-6 w-6" title="Attach to Campaign" onClick={() => {
                                                    setSelectedImage(res.content);
                                                    toast.success("Image attached!");
                                                }}>
                                                    <Paperclip className="w-3 h-3" />
                                                </Button>
                                            )}

                                            <Button size="icon" variant="outline" className="h-6 w-6" title="Copy" onClick={() => {
                                                navigator.clipboard.writeText(res.content);
                                                toast.success("Copied!");
                                            }}>
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                            {res.type === 'image' && (
                                                <Button size="icon" variant="outline" className="h-6 w-6" title="Download" onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = res.content;
                                                    link.download = `bingo-ai-${Date.now()}.png`;
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                }}>
                                                    <Smartphone className="w-3 h-3" /> {/* Icon proxy for download */}
                                                </Button>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                                {aiResults.length === 0 && (
                                    <div className="text-center text-xs text-muted-foreground p-4 border border-dashed border-white/10 rounded-lg">
                                        Generated ideas will appear here.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* MIDDLE COLUMN: Editor (Expands) */}
                        <div className="flex-1 flex flex-col h-full min-w-[400px] mr-6">
                            <Card className="bg-black/40 border-pink-500/20 shadow-xl backdrop-blur-xl h-full flex flex-col transition-all duration-300">
                                <CardHeader className="py-4 flex flex-row items-center gap-4">
                                    {!isAiPanelOpen && (
                                        <Button variant="secondary" size="icon" className="h-8 w-8 -ml-2 bg-pink-500/20 border border-pink-500/50 hover:bg-pink-500/30 text-white" title="Open Assistant" onClick={() => setIsAiPanelOpen(true)}>
                                            <PanelLeft className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Send className="w-5 h-5 text-pink-400" />
                                        Compose Message
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 flex-1 flex flex-col overflow-y-auto">
                                    {/* Image Attachment Preview */}
                                    {selectedImage && (
                                        <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/50 group shrink-0">
                                            <img src={selectedImage} alt="Attachment" className="h-32 w-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setSelectedImage(null)}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                            <div className="absolute bottom-2 left-2 text-xs font-medium text-white bg-black/50 px-2 py-0.5 rounded">Attached Image</div>
                                        </div>
                                    )}

                                    {/* Targeting Compact */}
                                    <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 rounded-lg border border-white/5 shrink-0">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Target</Label>
                                            <Select value={targetAudience} onValueChange={setTargetAudience}>
                                                <SelectTrigger className="h-8 bg-black/20 border-white/10 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ALL">All Players</SelectItem>
                                                    <SelectItem value="VIP">VIP Only</SelectItem>
                                                    <SelectItem value="ACTIVE">Active Users</SelectItem>
                                                    <SelectItem value="NEW">New Signups</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Region</Label>
                                            <Select value={region} onValueChange={setRegion}>
                                                <SelectTrigger className="h-8 bg-black/20 border-white/10 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ALL">All Regions</SelectItem>
                                                    <SelectItem value="ADDIS">Addis Ababa</SelectItem>
                                                    <SelectItem value="INTL">International</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2 flex-1 flex flex-col min-h-0">
                                        <Label className="text-xs">Message</Label>
                                        <div className="flex-1 min-h-[150px]">
                                            <TelegramEditor
                                                value={message}
                                                onChange={setMessage}
                                                minHeight="100%"
                                                variables={['player_name', 'balance', 'bonus_amount']}
                                            />
                                        </div>
                                    </div>

                                    {/* Action Button Inputs */}
                                    <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 rounded-lg border border-white/5 shrink-0">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Button Text</Label>
                                            <Input
                                                value={buttonText}
                                                onChange={(e) => setButtonText(e.target.value)}
                                                placeholder="e.g. Play Now"
                                                className="h-8 bg-black/20 border-white/10 text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Action URL</Label>
                                            <Input
                                                value={buttonUrl}
                                                onChange={(e) => setButtonUrl(e.target.value)}
                                                placeholder="https://..."
                                                className="h-8 bg-black/20 border-white/10 text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 flex items-center justify-between border-t border-white/5 shrink-0">
                                        <span className="text-xs text-muted-foreground">Est. Reach: <b className="text-white">1,240</b></span>
                                        <Button
                                            onClick={() => sendCampaignMutation.mutate()}
                                            disabled={!message || sendCampaignMutation.isPending}
                                            className="bg-pink-600 hover:bg-pink-700 h-9 px-6"
                                        >
                                            {sendCampaignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Broadcast"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT COLUMN: Preview (Fixed width) */}
                        <div className="w-[320px] flex flex-col h-full flex-shrink-0">
                            <Card className="bg-black/20 border-white/5 h-full flex flex-col">
                                <CardHeader className="py-4">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                                        <Smartphone className="w-4 h-4" /> Preview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 flex items-center justify-center p-0 bg-black/10 rounded-b-xl overflow-hidden">
                                    <div className="scale-[0.85] origin-center">
                                        <PhonePreview
                                            message={message}
                                            title="BingoEth"
                                            buttonText={buttonText || undefined}
                                            image={selectedImage}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* --- TAB 2: DRIP AUTOMATION --- */}
                <TabsContent value="drip">
                    <DripBuilder />
                </TabsContent>
            </Tabs>
        </div>
    );
}
