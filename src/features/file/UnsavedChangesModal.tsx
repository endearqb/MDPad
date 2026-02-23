import { Button } from "baseui/button";
import { KIND } from "baseui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "baseui/modal";
import type { PendingAction } from "../../shared/types/doc";

interface UnsavedChangesModalProps {
  isOpen: boolean;
  pendingAction: PendingAction;
  isBusy: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesModal({
  isOpen,
  pendingAction,
  isBusy,
  onSave,
  onDiscard,
  onCancel
}: UnsavedChangesModalProps) {
  const actionText =
    pendingAction?.kind === "open"
      ? "open another file"
      : "close MDPad";

  return (
    <Modal
      closeable={!isBusy}
      isOpen={isOpen}
      onClose={onCancel}
    >
      <ModalHeader>Unsaved changes</ModalHeader>
      <ModalBody>
        You have unsaved edits. Save before you {actionText}?
      </ModalBody>
      <ModalFooter>
        <Button
          disabled={isBusy}
          kind={KIND.tertiary}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          disabled={isBusy}
          kind={KIND.secondary}
          onClick={onDiscard}
        >
          Don&apos;t Save
        </Button>
        <Button
          disabled={isBusy}
          onClick={onSave}
        >
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
}
