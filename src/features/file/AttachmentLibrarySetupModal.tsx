import { Button, KIND } from "baseui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "baseui/modal";
import type { AttachmentModalCopy } from "../../shared/i18n/appI18n";

interface AttachmentLibrarySetupModalProps {
  isOpen: boolean;
  copy: AttachmentModalCopy;
  onCancel: () => void;
  onSelectFolder: () => void;
}

export default function AttachmentLibrarySetupModal({
  isOpen,
  copy,
  onCancel,
  onSelectFolder
}: AttachmentLibrarySetupModalProps) {
  return (
    <Modal
      closeable
      isOpen={isOpen}
      onClose={onCancel}
    >
      <ModalHeader>{copy.title}</ModalHeader>
      <ModalBody>
        {copy.bodyLine1}
        <br />
        {copy.bodyLine2}
      </ModalBody>
      <ModalFooter>
        <Button
          kind={KIND.tertiary}
          onClick={onCancel}
        >
          {copy.cancel}
        </Button>
        <Button onClick={onSelectFolder}>
          {copy.chooseFolder}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
