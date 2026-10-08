import { lazy, Suspense } from "react";
import { Modal } from "./Modal.js";
import { Spinner } from "./Spinner.js";
import { strings } from "../strings.js";

type EmojiPicked = {
  native: string;
};

type PickerComponent = (props: {
  data: unknown;
  theme: string;
  locale: string;
  previewPosition: string;
  skinTonePosition: string;
  onEmojiSelect: (emoji: EmojiPicked) => void;
}) => JSX.Element;

const LazyPicker = lazy(async () => {
  const [picker, data] = await Promise.all([import("@emoji-mart/react"), import("@emoji-mart/data")]);
  const Picker = picker.default as unknown as PickerComponent;
  return {
    default: (props: { onSelect: (native: string) => void; onClose: () => void }) => (
      <Picker
        data={data.default}
        theme="dark"
        locale="ru"
        previewPosition="none"
        skinTonePosition="none"
        onEmojiSelect={(emoji) => {
          props.onSelect(emoji.native);
          props.onClose();
        }}
      />
    )
  };
});

type EmojiPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (native: string) => void;
};

export const EmojiPicker = ({ open, onClose, onSelect }: EmojiPickerProps) => (
  <Modal open={open} title={strings.emoji.title} onClose={onClose}>
    <div className="emoji-picker">
      {open ? (
        <Suspense fallback={<Spinner size={24} label={strings.common.loading} />}>
          <LazyPicker onSelect={onSelect} onClose={onClose} />
        </Suspense>
      ) : null}
    </div>
  </Modal>
);
