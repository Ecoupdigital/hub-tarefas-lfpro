import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface EmojiColorPickerProps {
  emoji?: string;
  color?: string;
  onEmojiChange: (emoji: string) => void;
  onColorChange: (color: string) => void;
  size?: "sm" | "md";
}

const EMOJI_CATEGORIES: Record<string, string[]> = {
  Trabalho: ["📋", "📌", "📎", "🗂️", "📁", "📂", "📊", "📈", "📉", "🗃️", "📝", "✅", "☑️", "🎯", "🏆", "💡"],
  Pessoas: ["👤", "👥", "👨‍💼", "👩‍💼", "🤝", "👋", "🙌", "💪", "🧑‍🤝‍🧑"],
  Tecnologia: ["💻", "🖥️", "📱", "⌨️", "🖱️", "🔧", "⚙️", "🔨", "🛠️", "🔌", "💾", "🖨️"],
  Tempo: ["📅", "📆", "⏰", "⏱️", "⌚", "🕐"],
  "Comunicacao": ["💬", "📧", "📨", "📤", "📥", "📢", "🔔", "🗣️", "📣"],
  Natureza: ["🌱", "🌿", "🍃", "🌲", "🌸", "🌟", "⭐", "🌙", "☀️", "🔥", "💧"],
  "Simbolos": ["❤️", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🔶", "🔷", "✨", "🎉", "🚀", "🏠", "🎮"],
};

const COLOR_SWATCHES = [
  "#5F3FFF", "#00C875", "#FDAB3D", "#E2445C",
  "#579BFC", "#A25DDC", "#037F4C", "#FF158A",
  "#CAB641", "#FF642E", "#0073EA", "#401694",
  "#FF5AC4", "#784BD1", "#66CCFF", "#7F5347",
];

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function EmojiColorPicker({
  emoji,
  color,
  onEmojiChange,
  onColorChange,
  size = "md",
}: EmojiColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(color || "");

  const displayEmoji = emoji || "📋";
  const displayColor = color || "#5F3FFF";

  const handleEmojiClick = (e: string) => {
    onEmojiChange(e);
    setOpen(false);
  };

  const handleColorClick = (c: string) => {
    onColorChange(c);
    setHexInput(c);
  };

  const handleHexSubmit = () => {
    const val = hexInput.startsWith("#") ? hexInput : `#${hexInput}`;
    if (HEX_REGEX.test(val)) {
      onColorChange(val);
    }
  };

  const triggerSize = size === "sm" ? "h-7 w-7 text-base" : "h-9 w-9 text-lg";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex items-center justify-center rounded hover:bg-muted transition-colors",
            triggerSize,
          )}
        >
          <span>{displayEmoji}</span>
          <span
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background"
            style={{ backgroundColor: displayColor }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start">
        <Tabs defaultValue="emoji">
          <TabsList className="w-full h-8 mb-2">
            <TabsTrigger value="emoji" className="flex-1 text-xs py-1">
              Emoji
            </TabsTrigger>
            <TabsTrigger value="color" className="flex-1 text-xs py-1">
              Cor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emoji" className="mt-0 max-h-[260px] overflow-y-auto">
            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
              <div key={category} className="mb-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {category}
                </p>
                <div className="flex flex-wrap gap-0.5">
                  {emojis.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => handleEmojiClick(e)}
                      className={cn(
                        "h-8 w-8 flex items-center justify-center rounded text-base hover:bg-muted transition-colors",
                        displayEmoji === e && "bg-muted ring-1 ring-primary/30",
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="color" className="mt-0">
            <div className="grid grid-cols-4 gap-2 mb-3">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleColorClick(c)}
                  className={cn(
                    "h-6 w-6 rounded-full mx-auto transition-all",
                    displayColor === c && "ring-2 ring-offset-1 ring-primary",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleHexSubmit()}
                placeholder="#5F3FFF"
                className="flex h-8 w-full rounded border border-input bg-background px-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                maxLength={7}
              />
              <button
                type="button"
                onClick={handleHexSubmit}
                className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                OK
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
