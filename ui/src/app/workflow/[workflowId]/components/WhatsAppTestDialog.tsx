"use client";

import { MessageSquare } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";

interface WhatsAppTestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workflowId: number;
}

export const WhatsAppTestDialog = ({
    open,
    onOpenChange,
    workflowId,
}: WhatsAppTestDialogProps) => {
    const { getAccessToken } = useAuth();
    const [phone, setPhone] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [reply, setReply] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setReply(null);
        setError(null);
        setLoading(false);
    };

    const handleClose = (val: boolean) => {
        if (!val) reset();
        onOpenChange(val);
    };

    const handleSend = async () => {
        setLoading(true);
        setReply(null);
        setError(null);
        try {
            const token = await getAccessToken();
            const res = await fetch(`/api/v1/workflow/${workflowId}/test/whatsapp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ phone, message }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || `Request failed: ${res.status}`);
            }
            const data = await res.json();
            setReply(data.reply || "(empty reply)");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-green-500" />
                        Test WhatsApp Channel
                    </DialogTitle>
                    <DialogDescription>
                        Send a test message to see how your workflow AI responds on WhatsApp.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="wa-phone">Phone number</Label>
                        <Input
                            id="wa-phone"
                            placeholder="+919876543210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            E.164 format. Used to track conversation history across turns.
                        </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="wa-message">Message</Label>
                        <Textarea
                            id="wa-message"
                            placeholder="Type a test message..."
                            rows={3}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>

                    {reply !== null && (
                        <div className="rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3">
                            <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">AI Reply</p>
                            <p className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap">{reply}</p>
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-red-500">{error}</p>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                    {reply !== null ? (
                        <Button variant="outline" onClick={reset}>
                            Send Another
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSend}
                            disabled={loading || !phone.trim() || !message.trim()}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {loading ? "Sending..." : "Send"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
