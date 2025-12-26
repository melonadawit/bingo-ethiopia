'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Sparkles, Wand2, RefreshCw, Type, Layers, Image as ImageIcon, Share2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider-impl';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const ART_STYLES = [
    { id: 'none', label: 'No Style', prompt: '' },
    { id: 'cyberpunk', label: 'Cyberpunk', prompt: 'cyberpunk style, neon lights, futuristic city background, high detail, 8k' },
    { id: 'gold', label: 'Luxury Gold', prompt: 'luxury gold texture, elite, expensive, shiny, golden particles, black background, premium 4k' },
    { id: '3d', label: '3D Character', prompt: '3d pixar style character, cute, vibrant colors, soft lighting, 3d render' },
    { id: 'ethio', label: 'Ethiopian Pattern', prompt: 'ethiopian traditional tibeb pattern, cultural art, habesha style, vibrant' },
];

export default function ContentPage() {
    // Generator State
    const [prompt, setPrompt] = useState('Happy bingo winner holding a trophy');
    const [style, setStyle] = useState(ART_STYLES[1]);
    const [seed, setSeed] = useState(Date.now());
    const [loading, setLoading] = useState(false);

    // Overlay State
    const [title, setTitle] = useState('WINNER!');
    const [subtitle, setSubtitle] = useState('Dawit A.');
    const [amount, setAmount] = useState('5,000 ETB');

    // Image State
    const [generatedImage, setGeneratedImage] = useState('');

    const generateImage = () => {
        setLoading(true);
        // Refresh seed to get new image
        const newSeed = Date.now();
        setSeed(newSeed);

        // Construct Pollinations URL
        const fullPrompt = `${prompt}, ${style.prompt}`;
        const encoded = encodeURIComponent(fullPrompt);
        const url = `https://image.pollinations.ai/prompt/${encoded}?width=1080&height=1080&seed=${newSeed}&nologo=true&model=flux`;

        // Preload image to avoid flicker
        const img = new Image();
        img.src = url;
        img.onload = () => {
            setGeneratedImage(url);
            setLoading(false);
        };
        img.onerror = () => {
            toast.error('Failed to generate image');
            setLoading(false);
        };
    };

    // Initial generate
    useEffect(() => {
        if (!generatedImage) generateImage();
    }, []);

    const downloadCanvas = async () => {
        // In a real app, we'd use html2canvas here on the composition container.
        // For now, we'll just download the raw AI image as a basic implementation.
        // Or better, tell user "Right click to save" as dealing with cross-origin canvas is tricky without proxy.
        toast.info('Right-click the image and "Save As" to download high-res version.');
    };

    return (
        <div className="h-[calc(100vh-100px)] flex gap-6 pb-6">
            {/* Left Control Panel */}
            <Card className="w-[400px] flex flex-col bg-black/40 border-white/10 backdrop-blur-xl h-full border-none">
                <div className="p-6 border-b border-white/10">
                    <h1 className="text-2xl font-black flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                        <Wand2 className="w-6 h-6 text-purple-400" />
                        AI Studio
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">Powered by Flux & Pollinations</p>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-8">
                        {/* Prompt Section */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                <Sparkles className="w-3 h-3" /> Image Prompt
                            </label>
                            <div className="relative">
                                <textarea
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm min-h-[100px] focus:ring-2 ring-purple-500/50 outline-none resize-none"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Describe the image you want..."
                                />
                                <div className="absolute bottom-2 right-2 flex gap-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 rounded-full hover:bg-white/10"
                                        onClick={() => setPrompt('Futuristic bingo balls flying in space, neon explosion')}
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Style Selector */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                <ImageIcon className="w-3 h-3" /> Art Style
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {ART_STYLES.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setStyle(s)}
                                        className={cn(
                                            "text-xs p-2 rounded-md border text-left transition-all",
                                            style.id === s.id
                                                ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50"
                                                : "bg-white/5 border-white/10 hover:bg-white/10"
                                        )}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Generate Button */}
                        <Button
                            size="lg"
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-bold shadow-xl shadow-purple-900/20"
                            onClick={generateImage}
                            disabled={loading}
                        >
                            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                            Generate Art
                        </Button>

                        <div className="border-t border-white/10 pt-6 space-y-4">
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                <Type className="w-3 h-3" /> Text Overlays
                            </label>

                            <div className="space-y-2">
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Main Title"
                                    className="bg-white/5 border-white/10"
                                />
                                <Input
                                    value={subtitle}
                                    onChange={(e) => setSubtitle(e.target.value)}
                                    placeholder="Subtitle"
                                    className="bg-white/5 border-white/10"
                                />
                                <Input
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Accent Text"
                                    className="bg-white/5 border-white/10 text-yellow-400 font-bold"
                                />
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </Card>

            {/* Right Canvas Area */}
            <div className="flex-1 flex flex-col h-full gap-4">
                {/* Toolbar */}
                <Card className="bg-black/40 border-white/10 backdrop-blur-xl p-2 flex justify-between items-center border-none">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm"><Layers className="w-4 h-4 mr-2" /> Layers</Button>
                        <Button variant="ghost" size="sm"><Type className="w-4 h-4 mr-2" /> Fonts</Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={downloadCanvas}>
                            <Download className="w-4 h-4 mr-2" /> Export PNG
                        </Button>
                        <Button className="bg-blue-500 hover:bg-blue-600" size="sm">
                            <Share2 className="w-4 h-4 mr-2" /> Post to Channel
                        </Button>
                    </div>
                </Card>

                {/* Canvas */}
                <div className="flex-1 bg-[#1a1a1a] rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center p-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
                    {/* The Composition Frame */}
                    <div className="relative w-[500px] h-[500px] shadow-2xl ring-1 ring-white/10 bg-black group overflow-hidden">
                        {loading && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                        <Sparkles className="absolute inset-0 m-auto text-purple-400 w-6 h-6 animate-pulse" />
                                    </div>
                                    <p className="text-sm font-mono text-purple-300 animate-pulse">Dreaming...</p>
                                </div>
                            </div>
                        )}

                        {/* Generated Image Layer */}
                        {generatedImage && (
                            <img
                                src={generatedImage}
                                alt="Generated"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                        )}

                        {/* Overlay Layer (Simple Absolute Positioning for Demo) */}
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-t from-black/80 via-transparent to-black/20">
                            <h2 className="text-5xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-tighter uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>
                                {title}
                            </h2>
                            <p className="text-2xl font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-2">
                                {subtitle}
                            </p>
                            <div className="mt-6 bg-yellow-500 text-black font-black text-3xl px-6 py-2 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.6)] transform -rotate-2 border-2 border-white">
                                {amount}
                            </div>
                        </div>

                        {/* Watermark */}
                        <div className="absolute bottom-4 right-4 text-[10px] text-white/50 font-mono tracking-widest uppercase">
                            Bingo Ethiopia
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
