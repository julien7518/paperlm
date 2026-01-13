"use client";

import { useEffect, useState } from "react";
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
  const [value, setValue] = useState<number>(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const formatValue = (v: number) => {
    if (Number.isInteger(v)) return String(v);
    return parseFloat(v.toFixed(2)).toString();
  };

  return (
    <div className="space-y-2">
      <div className="justify-between flex">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm font-small">{formatValue(value)}</p>
      </div>
      <Slider
        defaultValue={[defaultValue]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => {
          const next = Number(v[0]);
          setValue(next);
          onChange?.(next);
        }}
      />
    </div>
  );
}
