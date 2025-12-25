'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, CheckCircle, Clock, Search, Send, User, AlertCircle, CornerUpLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock Tickets
const MOCK_TICKETS = [
    { id: 'T-101', user: 'DawitAB', subject: 'Deposit not credited', status: 'open', time: '10m ago', unread: true },
    { id: 'T-102', user: 'HelenRed', subject: 'Game froze during play', status: 'open', time: '45m ago', unread: false },
    { id: 'T-99', user: 'AlexJ', subject: 'How to withdraw?', status: 'resolved', time: '2h ago', unread: false },
    { id: 'T-98', user: 'BingoKing', subject: 'Report cheating', status: 'escalated', time: '1d ago', unread: false },
];

const MOCK_MESSAGES = [
    { id: 1, sender: 'user', text: 'Hello, I deposited 500 ETB via CBE but it is not showing up.', time: '10:30 AM' },
    { id: 2, sender: 'agent', text: 'Hi Dawit, please share the transaction reference number.', time: '10:32 AM' },
    { id: 3, sender: 'user', text: 'It is REF123456789. Please check.', time: '10:35 AM' },
];

export default function SupportPage() {
    const [selectedTicket, setSelectedTicket] = useState(MOCK_TICKETS[0]);
    const [reply, setReply] = useState('');

    return (
        <div className="flex h-[calc(100vh-100px)] gap-4 pb-4">
            {/* Ticket List Sidebar */}
            <Card className="w-80 flex flex-col bg-black/40 border-white/10 backdrop-blur-xl">
                <div className="p-4 border-b border-white/10">
                    <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-400" />
                        Support Queue
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search tickets..."
                            className="pl-8 bg-white/5 border-white/10 text-white h-9"
                        />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {MOCK_TICKETS.map((ticket) => (
                            <button
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg border text-sm transition-all hover:bg-white/5",
                                    selectedTicket.id === ticket.id
                                        ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]"
                                        : "bg-transparent border-transparent"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={cn("font-bold", selectedTicket.id === ticket.id ? "text-blue-400" : "text-white")}>
                                        {ticket.user}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">{ticket.time}</span>
                                </div>
                                <div className="text-xs text-white/70 line-clamp-1 mb-2">{ticket.subject}</div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={ticket.status} />
                                    {ticket.unread && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </Card>

            {/* Main Chat Area */}
            <Card className="flex-1 flex flex-col bg-black/40 border-white/10 backdrop-blur-xl overflow-hidden">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-white/10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedTicket.user}`} />
                            <AvatarFallback>{selectedTicket.user[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-bold text-white flex items-center gap-2">
                                {selectedTicket.subject}
                                <span className="text-xs font-mono text-muted-foreground">#{selectedTicket.id}</span>
                            </div>
                            <div className="text-xs text-blue-400">User: @{selectedTicket.user} (VIP Level 1)</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="border-white/10 text-white/70 hover:text-white">
                            <Clock className="w-4 h-4 mr-2" />
                            Snooze
                        </Button>
                        <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Resolve
                        </Button>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4 max-w-3xl mx-auto">
                        <div className="flex justify-center">
                            <Badge variant="outline" className="bg-white/5 border-white/10 text-xs text-muted-foreground mb-4">
                                Ticket Started • {selectedTicket.time}
                            </Badge>
                        </div>
                        {MOCK_MESSAGES.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-3",
                                    msg.sender === 'agent' ? "flex-row-reverse" : "flex-row"
                                )}
                            >
                                <Avatar className="h-8 w-8 mt-1">
                                    {msg.sender === 'agent' ? (
                                        <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">ME</div>
                                    ) : (
                                        <AvatarFallback className="bg-white/10 text-white">{selectedTicket.user[0]}</AvatarFallback>
                                    )}
                                </Avatar>
                                <div
                                    className={cn(
                                        "p-3 rounded-2xl max-w-[80%] text-sm",
                                        msg.sender === 'agent'
                                            ? "bg-blue-600 text-white rounded-tr-none"
                                            : "bg-white/10 text-white rounded-tl-none border border-white/5"
                                    )}
                                >
                                    <p>{msg.text}</p>
                                    <div className={cn("text-[10px] mt-1 opacity-50", msg.sender === 'agent' ? "text-right" : "text-left")}>
                                        {msg.time}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t border-white/10 bg-black/20">
                    <div className="flex gap-2 max-w-3xl mx-auto">
                        <div className="relative flex-1">
                            <Input
                                placeholder="Type your reply..."
                                className="pr-10 bg-white/5 border-white/10 text-white min-h-[50px] py-3"
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                            />
                            <div className="absolute right-3 top-3 flex gap-2">
                                {/* Format tools could go here */}
                            </div>
                        </div>
                        <Button size="icon" className="h-[50px] w-[50px] bg-blue-600 hover:bg-blue-700">
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>
                    <div className="max-w-3xl mx-auto mt-2 flex gap-2">
                        <Badge variant="outline" className="cursor-pointer hover:bg-white/10 text-[10px] text-muted-foreground border-white/10 p-1 px-2">
                            Canned: "Can you provide a screenshot?"
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-white/10 text-[10px] text-muted-foreground border-white/10 p-1 px-2">
                            Canned: "Checking with finance..."
                        </Badge>
                    </div>
                </div>
            </Card>

            {/* Context Sidebar */}
            <Card className="w-72 bg-black/40 border-white/10 backdrop-blur-xl hidden xl:flex flex-col p-4 space-y-6">
                <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4 tracking-wider">User Context</h3>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">Balance</span>
                            <span className="text-sm font-bold text-green-400">450 ETB</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">Total Dep.</span>
                            <span className="text-sm font-bold text-white">5,200 ETB</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">Risk Score</span>
                            <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">Low (12)</Badge>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4 tracking-wider">Recent Logs</h3>
                    <div className="space-y-2">
                        <div className="text-xs text-white/60 flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 text-red-500" />
                            Failed login attempt (1h ago)
                        </div>
                        <div className="text-xs text-white/60 flex items-center gap-2">
                            <CornerUpLeft className="w-3 h-3 text-blue-500" />
                            Deposit Initiated (2h ago)
                        </div>
                    </div>
                </div>

                <div className="mt-auto">
                    <Button variant="destructive" className="w-full bg-red-950/50 hover:bg-red-900 border border-red-500/30 text-red-200">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Ban User
                    </Button>
                </div>
            </Card>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'open': return <Badge variant="outline" className="text-blue-400 border-blue-400/30 bg-blue-400/10">Open</Badge>;
        case 'resolved': return <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10">Resolved</Badge>;
        case 'escalated': return <Badge variant="outline" className="text-red-400 border-red-400/30 bg-red-400/10">Escalated</Badge>;
        default: return <Badge variant="outline" className="text-gray-400 border-gray-400/30">Unknown</Badge>;
    }
}
