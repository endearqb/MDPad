import { Button, KIND } from "baseui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "baseui/modal";

interface AttachmentLibrarySetupModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onSelectFolder: () => void;
}

export default function AttachmentLibrarySetupModal({
  isOpen,
  onCancel,
  onSelectFolder
}: AttachmentLibrarySetupModalProps) {
  return (
    <Modal
      closeable
      isOpen={isOpen}
      onClose={onCancel}
    >
      <ModalHeader>Choose image save folder</ModalHeader>
      <ModalBody>
        This is your first time pasting an image.
        <br />
        Please choose a global folder to store pasted images.
      </ModalBody>
      <ModalFooter>
        <Button
          kind={KIND.tertiary}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button onClick={onSelectFolder}>
          Choose Global Folder
        </Button>
      </ModalFooter>
    </Modal>
  );
}
