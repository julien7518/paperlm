"use client";

import { Slider } from "@/components/ui/slider";

interface SettingsSliderProps {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  onChange?: (val: number) => void;
}

export function SettingsSlider({
  label,
  min = 0.01,
  max = 1,
  step = 0.01,
  defaultValue = 0.5,
  onChange,
}: SettingsSliderProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>

      <Slider
        defaultValue={[defaultValue]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange?.(v[0])}
      />
    </div>
  );
}
