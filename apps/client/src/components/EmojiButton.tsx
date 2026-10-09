import { Smile } from "lucide-react";
import { useState } from "react";
import { strings } from "../strings.js";
import { EmojiPicker } from "./EmojiPicker.js";
import { GlassButton } from "./GlassButton.js";

type EmojiButtonProps = {
  onSelect: (native: string) => void;
  disabled?: boolean;
};

export const EmojiButton = ({ onSelect, disabled = false }: EmojiButtonProps) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <GlassButton
        variant="ghost"
        size="sm"
        icon={Smile}
        iconOnly
        disabled={disabled}
        aria-label={strings.emoji.open}
        title={strings.emoji.open}
        onClick={() => setOpen(true)}
      />
      <EmojiPicker open={open} onClose={() => setOpen(false)} onSelect={onSelect} />
    </>
  );
};
