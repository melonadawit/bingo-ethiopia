'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Image as ImageIcon, FileText, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ContentStudioPage() {
    const [topic, setTopic] = useState('');
    const [generatedText, setGeneratedText] = useState('');
    const [generatedImage, setGeneratedImage] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    const generateTextMutation = useMutation({
        mutationFn: async () => {
            // Re-using the announcement generator for now, but could be specific endpoint
            // Using 'event' type for generic content style
            return fetchAdmin('/generate-announcement', {
                method: 'POST',
                body: JSON.stringify({ topic, type: 'event' })
            });
        },
        onSuccess: (data: any) => {
            setGeneratedText(`${data.title}\n\n${data.message}`);
            toast.success("Content Generated");
        },
        onError: () => toast.error("Text Generation Failed")
    });

    const generateImageMutation = useMutation({
        mutationFn: async () => {
            return fetchAdmin('/generate-image', {
                method: 'POST',
                body: JSON.stringify({ prompt: topic })
            });
        },
        onSuccess: (data: any) => {
            if (data.url) {
                setGeneratedImage(data.url);
                toast.success("Image Generated");
            }
        },
        onError: () => toast.error("Image Generation Failed")
    });

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-br from-indigo-500/5 to-purple-500/5 p-8 rounded-3xl border border-white/10 shadow-xl backdrop-blur-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                <div className="z-10">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Content Studio</h1>
                    <p className="text-muted-foreground mt-2 text-lg">AI-powered creation suite for blogs, posts, and news.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Inputs */}
                <Card className="bg-black/40 border-indigo-500/20 shadow-2xl backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                            Creation Assistant
                        </CardTitle>
                        <CardDescription>Enter a topic and let AI do the rest.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Topic or Prompt</label>
                            <Input
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g. New Year's Bingo Extravaganza"
                                className="bg-white/5 border-white/10"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                onClick={() => generateTextMutation.mutate()}
                                disabled={!topic || generateTextMutation.isPending}
                                className="bg-indigo-600 hover:bg-indigo-700 w-full"
                            >
                                {generateTextMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                                Generate Text
                            </Button>
                            <Button
                                onClick={() => generateImageMutation.mutate()}
                                disabled={!topic || generateImageMutation.isPending}
                                variant="secondary"
                                className="w-full"
                            >
                                {generateImageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                                Generate Image
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Outputs */}
                <div className="space-y-6">
                    {/* Text Output */}
                    <Card className="bg-black/20 border-white/5 relative group">
                        <CardContent className="p-4 pt-4">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copyToClipboard}>
                                    {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                            <Textarea
                                value={generatedText}
                                readOnly
                                placeholder="Generated text will appear here..."
                                className="min-h-[200px] bg-transparent border-0 focus-visible:ring-0 resize-none text-base leading-relaxed"
                            />
                        </CardContent>
                    </Card>

                    {/* Image Output */}
                    {generatedImage && (
                        <Card className="bg-black/20 border-white/5 overflow-hidden">
                            <img src={generatedImage} alt="Generated" className="w-full h-auto object-cover" />
                            <div className="p-2 flex justify-end bg-black/50">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = generatedImage;
                                        link.download = `ai-gen-${Date.now()}.png`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                >
                                    Download
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
