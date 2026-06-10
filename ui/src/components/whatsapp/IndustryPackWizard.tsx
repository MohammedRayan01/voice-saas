'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';
import { type PackMeta } from './PackGallery';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

type WizardField = {
    name: string;
    label: string;
    type: 'text' | 'select' | 'checkbox' | 'textarea' | 'time' | 'email' | 'tel' | 'url' | 'room_list';
    required?: boolean;
    placeholder?: string;
    options?: string[];
};

type WizardStep = {
    title: string;
    description?: string;
    fields: WizardField[];
};

interface IndustryPackWizardProps {
    pack: PackMeta | null;
    initialConfig?: Record<string, unknown>;
    open: boolean;
    onClose: () => void;
    onSuccess: (result: unknown) => void;
}

export default function IndustryPackWizard({
    pack,
    initialConfig,
    open,
    onClose,
    onSuccess,
}: IndustryPackWizardProps) {
    const { getAccessToken } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<Record<string, unknown>>(initialConfig ?? {});
    const [saving, setSaving] = useState(false);
    const [installed, setInstalled] = useState(false);
    const [installResult, setInstallResult] = useState<Record<string, unknown> | null>(null);

    if (!pack) return null;
    const steps = (pack.wizard_schema ?? []) as WizardStep[];
    const totalSteps = steps.length;
    const step = steps[currentStep];
    const isLastStep = currentStep === totalSteps - 1;

    const handleChange = (name: string, value: unknown) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleNext = () => {
        if (isLastStep) {
            handleInstall();
        } else {
            setCurrentStep((s) => s + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep((s) => s - 1);
    };

    const handleInstall = async () => {
        setSaving(true);
        try {
            const token = await getAccessToken();
            const url = initialConfig
                ? `${API}/api/v1/whatsapp/packs/installed`
                : `${API}/api/v1/whatsapp/packs/${pack.pack_id}/install`;
            const method = initialConfig ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ config: formData }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail ?? 'Install failed');
            }

            const result = await res.json();
            setInstallResult(result);
            setInstalled(true);
            onSuccess(result);
        } catch (err) {
            logger.error('Pack install error', err);
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setCurrentStep(0);
        setFormData(initialConfig ?? {});
        setInstalled(false);
        setInstallResult(null);
        onClose();
    };

    return (
        <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2">
                        <span>{pack.icon}</span>
                        {pack.name}
                    </SheetTitle>

                    {/* Step indicators */}
                    {!installed && (
                        <div className="flex items-center gap-1 mt-2">
                            {steps.map((s, i) => (
                                <div key={i} className="flex items-center gap-1">
                                    <div
                                        className={`h-2 w-2 rounded-full transition-colors ${
                                            i < currentStep
                                                ? 'bg-green-500'
                                                : i === currentStep
                                                ? 'bg-primary'
                                                : 'bg-muted'
                                        }`}
                                    />
                                    {i < steps.length - 1 && (
                                        <div className={`h-0.5 w-6 ${i < currentStep ? 'bg-green-500' : 'bg-muted'}`} />
                                    )}
                                </div>
                            ))}
                            <span className="text-xs text-muted-foreground ml-2">
                                Step {currentStep + 1} of {totalSteps}
                            </span>
                        </div>
                    )}
                </SheetHeader>

                {/* Success screen */}
                {installed && installResult ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                        <div>
                            <h3 className="font-semibold text-lg">Pack Installed!</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {pack.name} is now active for your organization.
                            </p>
                        </div>
                        <div className="rounded-lg border bg-muted/50 p-4 text-left w-full space-y-1.5">
                            <p className="text-sm font-medium">What was created:</p>
                            {typeof (installResult as Record<string, unknown>).automations_created === 'number' && (
                                <p className="text-xs text-muted-foreground">
                                    ✅ {(installResult as Record<string, unknown>).automations_created as number} automations
                                </p>
                            )}
                            {!!(installResult as Record<string, unknown>).pipeline_created && (
                                <p className="text-xs text-muted-foreground">✅ 1 booking pipeline with 6 stages</p>
                            )}
                            <p className="text-xs text-muted-foreground">✅ AI system prompt configured</p>
                            <p className="text-xs text-muted-foreground">✅ Business hours set</p>
                        </div>
                        <Button className="w-full" onClick={handleClose}>
                            Done
                        </Button>
                    </div>
                ) : (
                    /* Wizard form */
                    <div className="space-y-5 py-2">
                        <div>
                            <h3 className="font-medium">{step.title}</h3>
                            {step.description && (
                                <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                            )}
                        </div>

                        <div className="space-y-4">
                            {step.fields.map((field) => (
                                <FieldInput
                                    key={field.name}
                                    field={field}
                                    value={formData[field.name]}
                                    onChange={(v) => handleChange(field.name, v)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {!installed && (
                    <SheetFooter className="pt-6 flex gap-2">
                        {currentStep > 0 && (
                            <Button variant="outline" onClick={handleBack} disabled={saving} className="flex-1">
                                Back
                            </Button>
                        )}
                        <Button
                            onClick={handleNext}
                            disabled={saving}
                            className="flex-1"
                        >
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            {isLastStep
                                ? (initialConfig ? 'Save Changes' : 'Install Pack')
                                : 'Continue'}
                            {!isLastStep && !saving && <ChevronRight className="h-4 w-4 ml-1" />}
                        </Button>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
}

function FieldInput({
    field,
    value,
    onChange,
}: {
    field: WizardField;
    value: unknown;
    onChange: (v: unknown) => void;
}) {
    const strVal = (value as string) ?? '';

    if (field.type === 'select') {
        return (
            <div className="space-y-1.5">
                <Label>{field.label}{field.required && ' *'}</Label>
                <Select value={strVal} onValueChange={onChange}>
                    <SelectTrigger>
                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                        {(field.options ?? []).map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );
    }

    if (field.type === 'checkbox') {
        return (
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id={field.name}
                    checked={!!value}
                    onChange={(e) => onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor={field.name}>{field.label}</Label>
            </div>
        );
    }

    if (field.type === 'textarea' || field.type === 'room_list') {
        return (
            <div className="space-y-1.5">
                <Label>{field.label}{field.required && ' *'}</Label>
                <textarea
                    value={strVal}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                {field.type === 'room_list' && (
                    <p className="text-xs text-muted-foreground">
                        One room type per line. Format: &quot;Room Name (max guests)&quot;
                    </p>
                )}
            </div>
        );
    }

    // text | email | tel | url | time
    return (
        <div className="space-y-1.5">
            <Label>{field.label}{field.required && ' *'}</Label>
            <Input
                type={field.type}
                value={strVal}
                onChange={(e) => onChange(e.target.value)}
                placeholder={field.placeholder}
            />
        </div>
    );
}
