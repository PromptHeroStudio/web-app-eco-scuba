import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    User,
    Shield,
    Bell,
    Building,
    Save,
    Camera,
    CheckCircle2,
    AlertCircle,
    Loader2
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import type { Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Settings() {
    const { setPageTitle } = useUIStore();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [passwordState, setPasswordState] = useState({ current: '', new: '', confirm: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [authProvider, setAuthProvider] = useState<string | null>(null);

    useEffect(() => {
        setPageTitle("Postavke sistema");
        fetchProfile();
    }, [setPageTitle]);

    const fetchProfile = async () => {
        setFetching(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const provider = (user as any)?.app_metadata?.provider ?? (user as any)?.identities?.[0]?.provider ?? null;
                setAuthProvider(provider);

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;
                if (data) {
                    const normalizedProfile = {
                        ...data,
                        notification_prefs: data.notification_prefs ?? { email: true, inapp: true, deadlines: true }
                    };
                    setProfile(normalizedProfile);
                }
            }
        } catch (err) {
            console.error("Error fetching profile:", err);
            toast.error("Greška pri učitavanju profila.");
        } finally {
            setFetching(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            if (!profile) throw new Error('Profil nije učitan.');

            const notificationPrefs = profile.notification_prefs ?? { email: true, inapp: true, deadlines: true };

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: profile.full_name,
                    organization: profile.organization,
                    notification_prefs: notificationPrefs,
                })
                .eq('id', user.id);

            if (error) throw error;
            toast.success("Profil uspješno ažuriran!");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("Profile save error:", err);
            toast.error(message || "Greška pri spašavanju promjena.");
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Datoteka je prevelika. Maksimalno 5MB.");
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('profile-avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data } = await supabase.storage
                .from('profile-avatars')
                .getPublicUrl(fileName);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: data.publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setProfile({ ...profile, avatar_url: data.publicUrl });
            toast.success("Avatar uspješno učitan!");
        } catch (err) {
            console.error("Avatar upload error:", err);
            toast.error("Greška pri učitavanju avatara.");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordState.new !== passwordState.confirm) {
            toast.error("Lozinke se ne poklapaju.");
            return;
        }

        if (passwordState.new.length < 12) {
            toast.error("Nova lozinka mora imati najmanje 12 karaktera.");
            return;
        }

        setPasswordLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Ne mogu dohvatiti korisnika. Molimo osvježite stranicu.');
            }

            const provider = (user as any)?.app_metadata?.provider ?? (user as any)?.identities?.[0]?.provider ?? null;
            if (provider === 'google') {
                toast.error("Prijavljeni ste putem Google računa. Lozinku možete promijeniti u postavkama Google profila.");
                return;
            }

            if (!user.email) {
                throw new Error('Ne mogu dohvatiti vašu email adresu. Molimo osvježite stranicu.');
            }

            const { error: reauthError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwordState.current,
            });

            if (reauthError) {
                console.error('Re-authentication failed:', reauthError);
                toast.error("Pogrešna trenutna lozinka.");
                return;
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: passwordState.new
            });

            if (updateError) {
                console.error('Password update failed:', updateError);
                throw updateError;
            }

            toast.success("Lozinka uspješno ažurirana!");
            setPasswordState({ current: '', new: '', confirm: '' });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("Password change error:", err);
            toast.error(message || "Greška pri promjeni lozinke.");
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleSaveNotificationPrefs = async (notificationPrefs?: { email: boolean; inapp: boolean; deadlines: boolean }) => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const prefs = notificationPrefs ?? profile?.notification_prefs ?? { email: true, inapp: true, deadlines: true };

            const { error } = await supabase
                .from('profiles')
                .update({ notification_prefs: prefs })
                .eq('id', user.id);

            if (error) throw error;
            toast.success("Preferencije obavijestavanja ažurirane!");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("Notification prefs save error:", err);
            toast.error(message || "Greška pri spašavanju preferencija.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm("Sigurni ste? Ova akcija je nepovratna i trajno ćete izgubiti pristup svim projektima.")) {
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Delete user data first
            await supabase.from('projects').delete().eq('owner_id', user.id);
            
            // Delete user account
            const response = await supabase.auth.admin.deleteUser(user.id);
            if (response.error) throw response.error;

            toast.success("Račun obrisан. Preusmjeravam na login...");
            setTimeout(() => window.location.href = '/login', 2000);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            toast.error(message || "Greška pri brisanju računa.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-brand animate-spin" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto py-6"
        >
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-[#0B1F33]">Postavke</h1>
                <p className="text-[#4B647A] text-sm mt-1">Upravljajte svojim računom, organizacijom i obavijestima.</p>
            </div>

            <Tabs defaultValue="profil" className="space-y-8">
                <TabsList className="bg-bg-secondary p-1 rounded-2xl border border-border h-auto flex flex-wrap gap-1 w-fit shadow-sm">
                    <TabsTrigger value="profil" className="gap-2 px-6 py-2.5 rounded-xl data-[state=active]:bg-brand data-[state=active]:text-white transition-all font-bold text-xs uppercase tracking-wider">
                        <User className="h-4 w-4" /> Profil
                    </TabsTrigger>
                    <TabsTrigger value="sigurnost" className="gap-2 px-6 py-2.5 rounded-xl data-[state=active]:bg-brand data-[state=active]:text-white transition-all font-bold text-xs uppercase tracking-wider">
                        <Shield className="h-4 w-4" /> Sigurnost
                    </TabsTrigger>
                    <TabsTrigger value="obavijesti" className="gap-2 px-6 py-2.5 rounded-xl data-[state=active]:bg-brand data-[state=active]:text-white transition-all font-bold text-xs uppercase tracking-wider">
                        <Bell className="h-4 w-4" /> Obavijesti
                    </TabsTrigger>
                    <TabsTrigger value="organizacija" className="gap-2 px-6 py-2.5 rounded-xl data-[state=active]:bg-brand data-[state=active]:text-white transition-all font-bold text-xs uppercase tracking-wider">
                        <Building className="h-4 w-4" /> Organizacija
                    </TabsTrigger>
                </TabsList>

                <div className="relative overflow-hidden">
                    {/* Subtle Background Decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-[100px] pointer-events-none rounded-full" />

                    <TabsContent value="profil" className="mt-0 space-y-10 relative z-10 bg-white/90 border border-white/80 rounded-[24px] shadow-[0_8px_24px_rgba(47,128,237,0.08)] p-8">
                        <div className="flex flex-col md:flex-row gap-12 items-start">
                            {/* Avatar section */}
                            <div className="flex flex-col items-center gap-5">
                                <div className="relative group">
                                    <div className="h-36 w-36 rounded-full bg-bg-tertiary border-4 border-bg-surface flex items-center justify-center text-4xl font-bold text-brand shadow-2xl overflow-hidden ring-4 ring-brand/10">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="font-display">
                                                {profile?.full_name?.[0] || 'U'}
                                            </span>
                                        )}
                                    </div>
                                    <label htmlFor="avatar-upload" className="absolute bottom-1 right-1 h-10 w-10 rounded-full bg-brand text-white flex items-center justify-center border-4 border-bg-secondary shadow-lg hover:scale-110 transition-transform active:scale-95 cursor-pointer">
                                        <Camera className="h-4 w-4" />
                                    </label>
                                    <input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/png,image/jpeg,image/gif"
                                        onChange={handleAvatarUpload}
                                        disabled={loading}
                                        className="hidden"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold uppercase tracking-widest text-[#0B1F33]">Profilna slika</p>
                                    <p className="text-[10px] text-[#4B647A] uppercase tracking-tighter mt-1.5">PNG, JPG ili GIF do 5MB</p>
                                </div>
                            </div>

                            {/* Form section */}
                            <form onSubmit={handleSaveProfile} className="flex-1 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2.5">
                                        <Label htmlFor="fullname" className="text-xs font-bold uppercase tracking-widest text-[#4B647A] px-1">Ime i prezime</Label>
                                        <Input
                                            id="fullname"
                                            value={profile?.full_name || ''}
                                            onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                                            className="bg-bg-tertiary border-border h-12 rounded-xl focus:ring-brand px-4 text-sm font-medium"
                                            placeholder="npr. Adnan Drnda"
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-[#4B647A] px-1">Email adresa</Label>
                                        <Input
                                            id="email"
                                            value={profile?.email || ''}
                                            disabled
                                            className="bg-bg-tertiary border-border h-12 rounded-xl opacity-50 cursor-not-allowed px-4 text-sm font-medium"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="org" className="text-xs font-bold uppercase tracking-widest text-[#4B647A] px-1">Organizacija / Sekcija</Label>
                                    <Input
                                        id="org"
                                        value={profile?.organization || ''}
                                        onChange={e => setProfile({ ...profile, organization: e.target.value })}
                                        className="bg-bg-tertiary border-border h-12 rounded-xl focus:ring-brand px-4 text-sm font-medium"
                                        placeholder="npr. ECO SCUBA Sekcija"
                                    />
                                </div>

                                <div className="pt-6 border-t border-border/50">
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        variant="brand"
                                        className="gap-3 h-12 px-10 shadow-xl shadow-brand/20 font-bold rounded-xl"
                                    >
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Spasi promjene
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </TabsContent>

                    <TabsContent value="sigurnost" className="mt-0 space-y-10 relative z-10 bg-white/90 border border-white/80 rounded-[24px] shadow-[0_8px_24px_rgba(47,128,237,0.08)] p-8">
                        <div className="max-w-md space-y-10">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-[#0B1F33]">Promjena lozinke</h3>
                                    <p className="text-xs text-[#4B647A] mt-1">Osigurajte da vaša lozinka ima najmanje 12 karaktera.</p>
                                </div>
                            <div className="space-y-5">
                                    {authProvider === 'google' ? (
                                        <div className="rounded-2xl border border-[#D6E6F5] bg-white/80 p-4 text-sm text-[#0B1F33]">
                                            Prijavljeni ste putem Google računa. Lozinku možete promijeniti u postavkama Google profila.
                                        </div>
                                    ) : null}
                                    <div className="space-y-2.5">
                                        <Label htmlFor="current-pass" className="text-xs font-bold uppercase tracking-widest text-[#4B647A] px-1">Trenutna lozinka</Label>
                                        <Input 
                                            id="current-pass" 
                                            type="password" 
                                            className="bg-white/5 border border-[#D6E6F5] h-12 rounded-xl"
                                            value={passwordState.current}
                                            onChange={e => setPasswordState({ ...passwordState, current: e.target.value })}
                                            disabled={passwordLoading || authProvider === 'google'}
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label htmlFor="new-pass" className="text-xs font-bold uppercase tracking-widest text-[#4B647A] px-1">Nova lozinka</Label>
                                        <Input 
                                            id="new-pass" 
                                            type="password" 
                                            className="bg-white/5 border border-[#D6E6F5] h-12 rounded-xl"
                                            value={passwordState.new}
                                            onChange={e => setPasswordState({ ...passwordState, new: e.target.value })}
                                            disabled={passwordLoading || authProvider === 'google'}
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label htmlFor="confirm-pass" className="text-xs font-bold uppercase tracking-widest text-[#4B647A] px-1">Potvrda nove lozinke</Label>
                                        <Input 
                                            id="confirm-pass" 
                                            type="password" 
                                            className="bg-white/5 border border-[#D6E6F5] h-12 rounded-xl"
                                            value={passwordState.confirm}
                                            onChange={e => setPasswordState({ ...passwordState, confirm: e.target.value })}
                                            disabled={passwordLoading || authProvider === 'google'}
                                        />
                                    </div>
                                    <Button 
                                        onClick={handlePasswordChange}
                                        disabled={passwordLoading || !passwordState.new || authProvider === 'google'}
                                        className="w-full h-12 font-bold rounded-xl mt-2 gap-2 bg-[#2F80ED] text-white hover:scale-105 transition-transform"
                                    >
                                        {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Ažuriraj lozinku
                                    </Button>
                                </div>
                            </div>

                            <div className="pt-10 border-t border-border">
                                <div className="flex items-center gap-2 mb-4">
                                    <AlertCircle className="h-5 w-5 text-danger" />
                                    <h3 className="text-lg font-bold text-danger">Opasna zona</h3>
                                </div>
                                <div className="bg-danger/5 border border-danger/20 rounded-2xl p-6 space-y-4">
                                    <p className="text-xs text-danger/80 leading-relaxed font-medium">
                                        Brisanjem računa trajno gubite pristup svim projektima i asembliranim RIP podacima. Ova akcija je nepovratna.
                                    </p>
                                    <Button 
                                        onClick={handleDeleteAccount}
                                        disabled={loading}
                                        variant="outline" 
                                        className="w-full h-11 border-danger/30 text-danger hover:bg-danger/10 hover:text-danger font-bold rounded-xl gap-2"
                                    >
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                        Trajno obriši moj račun
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="obavijesti" className="mt-0 space-y-8 relative z-10 bg-white/90 border border-white/80 rounded-[24px] shadow-[0_8px_24px_rgba(47,128,237,0.08)] p-8">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-6 bg-bg-tertiary/50 rounded-2xl border border-border group hover:border-brand/20 transition-colors">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-[#0B1F33]">Email obavijesti</p>
                                    <p className="text-[11px] text-[#4B647A] max-w-xs">Primajte asemblirane izvještaje o progresu sekcija na vaš email.</p>
                                </div>
                                <Switch
                                    checked={profile?.notification_prefs?.email || false}
                                    onCheckedChange={async (checked) => {
                                        const updated = { ...profile, notification_prefs: { ...profile?.notification_prefs, email: checked } };
                                        setProfile(updated);
                                        await handleSaveNotificationPrefs(updated.notification_prefs);
                                    }}
                                    className="data-[state=checked]:bg-[#00C2FF]"
                                />
                            </div>
                            <div className="flex items-center justify-between p-6 bg-bg-tertiary/50 rounded-2xl border border-border group hover:border-brand/20 transition-colors">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-[#0B1F33]">In-app notifikacije</p>
                                    <p className="text-[11px] text-[#4B647A] max-w-xs">Obavijesti o odobrenjima i komentarima saradnika unutar platforme.</p>
                                </div>
                                <Switch
                                    checked={profile?.notification_prefs?.inapp || false}
                                    onCheckedChange={async (checked) => {
                                        const updated = { ...profile, notification_prefs: { ...profile?.notification_prefs, inapp: checked } };
                                        setProfile(updated);
                                        await handleSaveNotificationPrefs(updated.notification_prefs);
                                    }}
                                    className="data-[state=checked]:bg-[#00C2FF]"
                                />
                            </div>
                            <div className="flex items-center justify-between p-6 bg-bg-tertiary/50 rounded-2xl border border-border group hover:border-brand/20 transition-colors">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-[#0B1F33]">Upozorenja o rokovima</p>
                                    <p className="text-[11px] text-[#4B647A] max-w-xs">Primajte signale kada se približava rok za predaju projekta.</p>
                                </div>
                                <Switch 
                                    checked={profile?.notification_prefs?.deadlines || false}
                                    onCheckedChange={async (checked) => {
                                        const updated = { ...profile, notification_prefs: { ...profile?.notification_prefs, deadlines: checked } };
                                        setProfile(updated);
                                        await handleSaveNotificationPrefs(updated.notification_prefs);
                                    }}
                                    className="data-[state=checked]:bg-[#00C2FF]" 
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="organizacija" className="mt-0 space-y-8 relative z-10 bg-white/90 border border-white/80 rounded-[24px] shadow-[0_8px_24px_rgba(47,128,237,0.08)] p-8">
                        <div className="p-10 bg-brand/[0.03] rounded-[2.5rem] border border-brand/10 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand to-transparent opacity-20" />
                            <div className="h-24 w-24 rounded-full bg-brand/5 border border-brand/10 flex items-center justify-center mx-auto mb-8 shadow-inner shadow-brand/5">
                                <Building className="h-12 w-12 text-brand" />
                            </div>
                            <h3 className="text-2xl font-display font-bold text-[#0B1F33] mb-3">Institucionalna licenca</h3>
                            <p className="text-sm text-[#4B647A] max-w-sm mx-auto mb-10 leading-relaxed">
                                Vaš račun je dio organizacije <span className="text-brand font-bold">{profile?.organization || 'ECO SCUBA'}</span>.
                                Svi asemblirani RIP podaci se dijele unutar vaše sekcije.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
                                <div className="p-5 bg-bg-secondary/60 backdrop-blur-sm rounded-2xl border border-border text-left shadow-sm">
                                    <p className="text-[10px] font-bold text-brand uppercase tracking-widest mb-1.5 px-0.5">Podrazumijevani jezik</p>
                                    <p className="text-sm font-bold text-text-primary">Bosanski (BOS)</p>
                                </div>
                                <div className="p-5 bg-bg-secondary/60 backdrop-blur-sm rounded-2xl border border-border text-left shadow-sm">
                                    <p className="text-[10px] font-bold text-brand uppercase tracking-widest mb-1.5 px-0.5">RIP Repozitorij</p>
                                    <p className="text-sm font-bold text-text-primary">Aktivno (6 Domena)</p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </motion.div>
    );
}
