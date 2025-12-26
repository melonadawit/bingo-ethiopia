"use client"

import * as React from "react"
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    LayoutDashboard,
    Shield,
    ShieldAlert,
    Wallet,
    Megaphone,
    Gamepad2,
    Trophy,
    Sparkles,
    Bot,
    Users
} from "lucide-react"
import { Command } from "cmdk"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"

export function CommandMenu() {
    const router = useRouter()
    const [open, setOpen] = React.useState(false)

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
            <div
                className="w-full max-w-2xl bg-black border border-white/20 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
            >
                <Command className="w-full bg-transparent">
                    <div className="flex items-center border-b border-white/10 px-3" cmdk-input-wrapper="">
                        <Command.Input
                            placeholder="Type a command or search..."
                            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-white font-mono"
                        />
                    </div>
                    <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
                        <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                            No results found.
                        </Command.Empty>

                        <Command.Group heading="Navigation" className="text-xs font-medium text-muted-foreground px-2 py-1.5 mb-2">
                            <Command.Item
                                onSelect={() => runCommand(() => router.push('/overview'))}
                                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-white hover:bg-white/10 aria-selected:bg-white/10 transition-colors"
                            >
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                <span>Overview</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => router.push('/users'))}
                                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-white hover:bg-white/10 aria-selected:bg-white/10 transition-colors"
                            >
                                <Users className="mr-2 h-4 w-4" />
                                <span>User Management</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => router.push('/finance'))}
                                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-white hover:bg-white/10 aria-selected:bg-white/10 transition-colors"
                            >
                                <Wallet className="mr-2 h-4 w-4" />
                                <span>Finance & Ledger</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => router.push('/risk'))}
                                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-white hover:bg-white/10 aria-selected:bg-white/10 transition-colors"
                            >
                                <ShieldAlert className="mr-2 h-4 w-4 text-red-400" />
                                <span>Risk Console</span>
                            </Command.Item>
                        </Command.Group>

                        <Command.Separator className="-mx-1 h-px bg-white/10 my-1" />

                        <Command.Group heading="Tools & Settings" className="text-xs font-medium text-muted-foreground px-2 py-1.5 mb-2">
                            <Command.Item
                                onSelect={() => runCommand(() => router.push('/content'))}
                                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-white hover:bg-white/10 aria-selected:bg-white/10 transition-colors"
                            >
                                <Sparkles className="mr-2 h-4 w-4 text-yellow-400" />
                                <span>Content Studio</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => router.push('/settings'))}
                                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-white hover:bg-white/10 aria-selected:bg-white/10 transition-colors"
                            >
                                <Settings className="mr-2 h-4 w-4" />
                                <span>System Settings</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => router.push('/audit'))}
                                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-white hover:bg-white/10 aria-selected:bg-white/10 transition-colors"
                            >
                                <Shield className="mr-2 h-4 w-4" />
                                <span>Audit Logs</span>
                            </Command.Item>
                        </Command.Group>

                        <Command.Separator className="-mx-1 h-px bg-white/10 my-1" />

                        <Command.Group heading="System Actions" className="text-xs font-medium text-muted-foreground px-2 py-1.5 mb-2">
                            <Command.Item
                                disabled
                                className="flex cursor-not-allowed select-none items-center rounded-sm px-2 py-2 text-sm text-white/50"
                            >
                                <Bot className="mr-2 h-4 w-4" />
                                <span>Restart Bot (Requires Super Admin)</span>
                            </Command.Item>
                        </Command.Group>
                    </Command.List>

                    <div className="border-t border-white/10 p-2 flex justify-between items-center bg-white/5">
                        <div className="text-[10px] text-muted-foreground">
                            <span className="bg-white/10 px-1 py-0.5 rounded border border-white/10">↑↓</span> to navigate
                            <span className="bg-white/10 px-1 py-0.5 rounded border border-white/10 ml-2">↵</span> to select
                            <span className="bg-white/10 px-1 py-0.5 rounded border border-white/10 ml-2">esc</span> to close
                        </div>
                        <div className="text-[10px] font-mono text-purple-400">
                            BINGO ADMIN v2.0
                        </div>
                    </div>
                </Command>
            </div>
        </div>
    )
}
