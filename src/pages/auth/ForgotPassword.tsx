import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ParticleBackground from "@/components/auth/ParticleBackground";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Greška", description: "Unesite vašu email adresu.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;

      toast({
        title: "Provjera emaila",
        description: "Poslan vam je link za reset lozinke. Provjerite inbox i spam.",
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Greška pri resetovanju lozinke",
        description: error.message || "Pokušajte ponovo kasnije.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 glow-border mb-4 overflow-hidden border border-white/10 p-2"
          >
            <img
              src="https://i.postimg.cc/Z5PkMvVq/KVS-SCUBA-LOGO.png"
              alt="ECO SCUBA Logo"
              className="w-full h-full object-contain"
            />
          </motion.div>
          <h1 className="font-display text-4xl font-bold text-text-primary tracking-tight">ECO SCUBA</h1>
          <p className="text-sm text-text-muted mt-2 font-medium">Resetujte lozinku</p>
        </div>

        <div className="glass rounded-2xl border border-border p-8 shadow-lg">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6 text-center">
            Zaboravili ste lozinku?
          </h2>

          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground">Email adresa</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vas@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-muted/20 border-border"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Slanje linka..." : "Pošalji link za reset lozinke"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:text-accent transition-colors font-medium">
              <ArrowLeft className="inline h-4 w-4 mr-2 align-text-bottom" /> Nazad na prijavu
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
