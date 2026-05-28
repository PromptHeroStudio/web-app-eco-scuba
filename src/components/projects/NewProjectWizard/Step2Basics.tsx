import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

const formSchema = z.object({
    title: z.string().min(5, "Naslov mora imati najmanje 5 znakova"),
    donor_name: z.string().min(2, "Ovo polje je obavezno"),
    project_language: z.enum(["bs", "en", "hr"]),
    priority_area: z.string().optional(),
});

interface WizardStep2Data {
    title?: string;
    donor_name?: string;
    project_language?: string;
    priority_area?: string;
    extractedData?: Record<string, unknown>;
}

interface Props {
    data: WizardStep2Data;
    onNext: (data: Partial<WizardStep2Data>) => void;
    onBack: () => void;
}

export default function Step2Basics({ data, onNext, onBack }: Props) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: data.title || "",
            donor_name: data.extractedData?.donor_name || data.donor_name || "",
            project_language: data.project_language || "bs",
            priority_area: data.extractedData?.priority_area || data.priority_area || "",
        },
    });

    return (
        <div className="flex flex-col h-full">
            <div className="mb-8">
                <h3 className="text-xl font-bold text-text-primary mb-2">Osnovne informacije</h3>
                <p className="text-text-dim text-sm">Prvi korak u definiranju vašeg projektnog prijedloga.</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Naziv projekta</FormLabel>
                                <FormControl>
                                    <Input placeholder="npr. Zaštita i očuvanje biodiverziteta..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="donor_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ime donatora</FormLabel>
                                    <FormControl>
                                        <Input placeholder="npr. USAID, EU IPA..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="project_language"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Jezik aplikacije</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Odaberi jezik" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="bs">Bosanski</SelectItem>
                                            <SelectItem value="en">Engleski</SelectItem>
                                            <SelectItem value="hr">Hrvatski</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="priority_area"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Prioritetna oblast</FormLabel>
                                <FormControl>
                                    <Input placeholder="npr. Okoliš, Edukacija, Sport..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="mt-8 flex justify-between">
                        <Button type="button" variant="ghost" className="gap-2" onClick={onBack}>
                            <ChevronLeft className="h-4 w-4" /> Nazad
                        </Button>
                        <Button type="submit" className="gap-2">
                            Dalje <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
