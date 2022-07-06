import { ExcalidrawElement, FileId } from "../../element/types";
import { BinaryFileData } from "../../types";
import Portal from "../collab/Portal";

export interface StorageBackend {
  isSaved: (portal: Portal, elements: readonly ExcalidrawElement[]) => boolean;
  saveToStorageBackend: (
    portal: Portal,
    elements: readonly ExcalidrawElement[],
  ) => Promise<boolean>;
  loadFromStorageBackend: (
    roomId: string,
    roomKey: string,
    socket: SocketIOClient.Socket | null,
  ) => Promise<readonly ExcalidrawElement[] | null>;
  saveFilesToStorageBackend: ({
    prefix,
    files,
    roomId,
    roomKey,
  }: {
    prefix: string;
    files: {
      id: FileId;
      buffer: Uint8Array;
    }[];
    roomId: string;
    roomKey: string;
  }) => Promise<{
    savedFiles: Map<FileId, true>;
    erroredFiles: Map<FileId, true>;
  }>;
  loadFilesFromStorageBackend: (
    prefix: string,
    decryptionKey: string,
    filesIds: readonly FileId[],
    roomId: string,
    roomKey: string,
  ) => Promise<{
    loadedFiles: BinaryFileData[];
    erroredFiles: Map<FileId, true>;
  }>;
}
