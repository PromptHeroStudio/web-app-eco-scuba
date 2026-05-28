import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ParticleBackground from "@/components/auth/ParticleBackground";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const registerSchema = z.object({
  fullName: z.string().min(2, "Ime i prezime mora imati najmanje 2 znaka."),
  email: z.string().email("Unesite ispravan email."),
  password: z.string().min(8, "Lozinka mora imati najmanje 8 znakova."),
  confirmPassword: z.string().min(8, "Potvrdite lozinku."),
}).superRefine(({ password, confirmPassword }, ctx) => {
  if (password !== confirmPassword) {
    ctx.addIssue({
      code: "custom",
      message: "Lozinke se ne podudaraju.",
      path: ["confirmPassword"],
    });
  }
});

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = registerSchema.safeParse({ fullName, email, password, confirmPassword });
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      toast({
        title: "Greška pri registraciji",
        description: firstError?.message || "Provjerite unesene podatke.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      toast({
        title: "Registracija uspješna!",
        description: "Provjerite svoju email adresu i potvrdite račun prije prijave.",
      });
      navigate("/login");
    } catch (caughtError: unknown) {
      const errorMessage = caughtError instanceof Error ? caughtError.message : String(caughtError || "Pokušajte ponovo kasnije.");
      let description = errorMessage;
      if (/duplicate|already exists|already registered/i.test(description)) {
        description = "Ovaj email je već registrovan. Pokušajte prijavu ili resetujte lozinku.";
      }
      toast({ title: "Greška", description, variant: "destructive" });
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
        transition={{ duration: 0.6 }}
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
          <p className="text-sm text-text-muted mt-2 font-medium">Kreirajte svoj račun</p>
        </div>

        <div className="glass rounded-2xl border border-border p-8 shadow-lg">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6 text-center">
            Registracija
          </h2>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm text-muted-foreground">Ime i prezime</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  placeholder="Vaše ime"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 bg-muted/20 border-border"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground">Email adresa</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
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

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">Lozinka</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Najmanje 8 znakova"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-muted/20 border-border"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm text-muted-foreground">Potvrdite lozinku</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Ponovite lozinku"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 bg-muted/20 border-border"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registracija..." : "Registrujte se"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Već imate račun?{" "}
            <Link to="/login" className="text-primary hover:text-accent transition-colors font-medium">
              Prijavite se
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
