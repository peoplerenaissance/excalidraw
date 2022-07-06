import { MIME_TYPES } from "../../constants";
import { decompressData } from "../../data/encode";
import { restoreElements } from "../../data/restore";
import { getSceneVersion } from "../../element";
import { ExcalidrawElement, FileId } from "../../element/types";
import { BinaryFileData, BinaryFileMetadata, DataURL } from "../../types";
import Portal from "../collab/Portal";

export const encryptElements = async (
  elements: readonly ExcalidrawElement[],
): Promise<any> => {
  return JSON.stringify(elements);
};

const httpStorageSceneVersionCache = new WeakMap<
  SocketIOClient.Socket,
  number
>();

const HTTP_STORAGE_BACKEND_URL = process.env.REACT_APP_SERVER_URL;

export const isSavedToHttpStorage = (
  portal: Portal,
  elements: readonly ExcalidrawElement[],
): boolean => {
  if (portal.socket && portal.roomId && portal.roomKey) {
    const sceneVersion = getSceneVersion(elements);

    return httpStorageSceneVersionCache.get(portal.socket) === sceneVersion;
  }
  // if no room exists, consider the room saved so that we don't unnecessarily
  // prevent unload (there's nothing we could do at that point anyway)
  return true;
};

export const saveToHttpStorage = async (
  portal: Portal,
  elements: readonly ExcalidrawElement[],
) => {
  const { roomId, roomKey, socket } = portal;
  if (
    // if no room exists, consider the room saved because there's nothing we can
    // do at this point
    !roomId ||
    !roomKey ||
    !socket ||
    isSavedToHttpStorage(portal, elements)
  ) {
    return true;
  }

  const sceneVersion = getSceneVersion(elements);

  const getResponse = await fetch(`${HTTP_STORAGE_BACKEND_URL}/drawing-data`, {
    method: "POST",
    body: new URLSearchParams({
      roomId,
      roomKey,
    }),
  });
  if (!getResponse.ok && getResponse.status !== 404) {
    return false;
  }

  if (getResponse.ok) {
    const existingElements = JSON.parse((await getResponse.json()).data);

    if (existingElements && getSceneVersion(existingElements) >= sceneVersion) {
      return false;
    }
  }

  console.log("Saving to http storage");

  const putResponse = await fetch(`${HTTP_STORAGE_BACKEND_URL}/drawing-data`, {
    method: "POST",
    body: new URLSearchParams({
      roomId,
      roomKey,
      data: JSON.stringify(elements),
    }),
  });

  if (putResponse.ok) {
    httpStorageSceneVersionCache.set(socket, sceneVersion);
    return true;
  }
  return false;
};

export const loadFromHttpStorage = async (
  roomId: string,
  roomKey: string,
  socket: SocketIOClient.Socket | null,
): Promise<readonly ExcalidrawElement[] | null> => {
  const getResponse = await fetch(`${HTTP_STORAGE_BACKEND_URL}/drawing-data`, {
    method: "POST",
    body: new URLSearchParams({
      roomId,
      roomKey,
    }),
  });

  const elements = JSON.parse((await getResponse.json()).data);

  if (socket) {
    httpStorageSceneVersionCache.set(socket!, getSceneVersion(elements));
  }

  return restoreElements(elements, null);
};

export const saveFilesToHttpStorage = async ({
  prefix,
  files,
  roomId,
  roomKey,
}: {
  prefix: string;
  files: { id: FileId; buffer: Uint8Array }[];
  roomId: string;
  roomKey: string;
}) => {
  const erroredFiles = new Map<FileId, true>();
  const savedFiles = new Map<FileId, true>();

  await Promise.all(
    files.map(async ({ id, buffer }) => {
      try {
        const payloadBlob = new Blob([buffer]);
        const body = await new Response(payloadBlob).arrayBuffer();

        await fetch(`${HTTP_STORAGE_BACKEND_URL}/drawing-file`, {
          method: "POST",
          headers: {
            "Room-Id": roomId,
            "Room-Key": roomKey,
            "File-Id": id,
          },
          body,
        });
        savedFiles.set(id, true);
      } catch (error: any) {
        erroredFiles.set(id, true);
      }
    }),
  );

  return { savedFiles, erroredFiles };
};

export const loadFilesFromHttpStorage = async (
  prefix: string,
  decryptionKey: string,
  filesIds: readonly FileId[],
  roomId: string,
  roomKey: string,
) => {
  const loadedFiles: BinaryFileData[] = [];
  const erroredFiles = new Map<FileId, true>();

  await Promise.all(
    [...new Set(filesIds)].map(async (id) => {
      try {
        const response = await fetch(
          `${HTTP_STORAGE_BACKEND_URL}/drawing-file`,
          {
            method: "GET",
            headers: {
              "Room-Id": roomId,
              "Room-Key": roomKey,
              "File-Id": id,
            },
          },
        );
        if (response.status < 400) {
          const buffer = await response.arrayBuffer();

          const { data, metadata } = await decompressData<BinaryFileMetadata>(
            new Uint8Array(buffer),
            {
              decryptionKey: roomKey,
            },
          );

          const dataURL = new TextDecoder().decode(data) as DataURL;

          loadedFiles.push({
            mimeType: metadata.mimeType || MIME_TYPES.binary,
            id,
            dataURL,
            created: metadata?.created || Date.now(),
          });
        } else {
          erroredFiles.set(id, true);
        }
      } catch (error: any) {
        erroredFiles.set(id, true);
        console.error(error);
      }
    }),
  );

  return { loadedFiles, erroredFiles };
};
