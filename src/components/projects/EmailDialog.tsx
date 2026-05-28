import type { FormEvent } from "react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectTitle: string;
}

export default function EmailDialog({ open, onOpenChange, projectTitle }: Props) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { toast } = useToast();

    const handleSend = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        setLoading(true);
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session?.access_token) {
                throw new Error('Nije moguće dohvatiti aktivnu sesiju za slanje emaila. Molimo se ponovo prijavite.');
            }

            const payload = {
                recipient_email: data.email,
                recipient_name: data.name,
                project_title: projectTitle,
                message: data.message,
            };

            const { error } = await supabase.functions.invoke('send-project-email', {
                body: JSON.stringify(payload),
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (error) throw error;
            setSuccess(true);
            setTimeout(() => {
                onOpenChange(false);
                setSuccess(false);
            }, 2000);
        } catch (caughtError: unknown) {
            const errorMessage = caughtError instanceof Error ? caughtError.message : String(caughtError);
            toast({ title: "Greška", description: errorMessage, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-bg-secondary border-white/5">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" /> Posalji emailom
                    </DialogTitle>
                    <DialogDescription>
                        Pošalji email notifikaciju direktno primaocu projekta uz referencu njegovog naziva i poruke.
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary">Email poslat!</h3>
                        <p className="text-sm text-text-dim mt-2">Projektni prijedlog je uspješno poslat primaocu.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSend} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email primaoca</Label>
                            <Input id="email" name="email" type="email" placeholder="npr. donator@eu.ba" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Ime primaoca / Institucija</Label>
                            <Input id="name" name="name" placeholder="npr. Delegacija EU u BiH" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="message">Popratna poruka (opcionalno)</Label>
                            <Textarea id="message" name="message" placeholder="Poštovani, šaljemo vam..." rows={4} />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Otkaži</Button>
                            <Button type="submit" disabled={loading} className="gap-2">
                                {loading ? "Slanje..." : "Pošalji"} <Send className="h-4 w-4" />
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
