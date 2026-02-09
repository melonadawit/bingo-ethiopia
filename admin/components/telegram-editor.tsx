'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Smile, Bold, Italic, Code, Eye, EyeOff } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TelegramEditorProps {
    value: string;
    onChange: (val: string) => void;
    label?: string;
    description?: string;
    minHeight?: string;
    variables?: string[];
    placeholder?: string;
}

export function TelegramEditor({ value, onChange, label, description, minHeight = "150px", variables, placeholder }: TelegramEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showPreview, setShowPreview] = useState(false);

    const insertTag = (tag: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        let newText = "";
        let newCursorPos = end;

        // Simple tag toggle logic could be added, but for now just wrap
        if (tag === 'b') {
            newText = `${before}<b>${selection}</b>${after}`;
            newCursorPos = end + 7; // Length of <b></b>
        } else if (tag === 'i') {
            newText = `${before}<i>${selection}</i>${after}`;
            newCursorPos = end + 7;
        } else if (tag === 'code') {
            newText = `${before}<code>${selection}</code>${after}`;
            newCursorPos = end + 13;
        }

        onChange(newText);

        // Restore cursor (need defer to allow render)
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end);

        const newText = `${before}${emojiData.emoji}${after}`;
        onChange(newText);

        const newCursorPos = start + emojiData.emoji.length;
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    // Simple parser for preview
    const renderPreview = (text: string) => {
        let html = text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/g, '<strong>$1</strong>')
            .replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/g, '<em>$1</em>')
            .replace(/&lt;code&gt;(.*?)&lt;\/code&gt;/g, '<code class="bg-gray-100 dark:bg-gray-800 rounded px-1 text-red-500 font-mono text-xs">$1</code>');

        return <div dangerouslySetInnerHTML={{ __html: html }} className="whitespace-pre-wrap break-words text-sm" />;
    };

    return (
        <div className="space-y-2 border rounded-md p-3 bg-card">
            <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">{label}</label>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertTag('b')} title="Bold">
                        <Bold className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertTag('i')} title="Italic">
                        <Italic className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertTag('code')} title="Monospace">
                        <Code className="h-4 w-4" />
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Emoji">
                                <Smile className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-none">
                            <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} />
                        </PopoverContent>
                    </Popover>

                    <div className="w-px h-4 bg-border mx-1" />

                    <Button
                        variant={showPreview ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className="h-8 text-xs"
                    >
                        {showPreview ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                        {showPreview ? 'Edit' : 'Preview'}
                    </Button>
                </div>
            </div>

            {showPreview ? (
                <div className="bg-[#e4ebf2] dark:bg-[#1f2936] p-4 rounded-lg min-h-[150px] border border-border/50">
                    <div className="bg-white dark:bg-[#2b394b] p-3 rounded-tl-lg rounded-tr-lg rounded-br-lg shadow-sm max-w-[85%] text-left text-black dark:text-white">
                        <div className="text-xs text-blue-500 font-bold mb-1">BingoBot</div>
                        {renderPreview(value)}
                        <div className="text-[10px] text-gray-400 text-right mt-1">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </div>
            ) : (
                <Textarea
                    ref={textareaRef}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="font-mono text-sm leading-relaxed"
                    style={{ minHeight }}
                    placeholder={placeholder}
                />
            )}


            {/* Limit Warning */}
            <div className={`text-[10px] text-right mt-1 ${value.length > 4096 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                {value.length} / 4096
            </div>

            {description && <p className="text-xs text-muted-foreground">{description}</p>}

            {variables && variables.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50 mt-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground self-center mr-2">Logic:</span>
                    {variables.map(v => (
                        <button
                            key={v}
                            onClick={() => insertTag(`{${v}}`)}
                            className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 px-2 py-0.5 rounded text-[10px] font-mono border border-blue-500/20 transition-colors"
                        >
                            {`{${v}}`}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

