"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

// These will be generated after deployment
// For now, create placeholder files
import { TimeCapsuleAddresses } from "@/abi/TimeCapsuleAddresses";
import { TimeCapsuleABI } from "@/abi/TimeCapsuleABI";

export type CapsuleInfo = {
  id: bigint;
  unlockTime: bigint;
  owner: string;
  heir: string;
  exists: boolean;
  unlocked: boolean;
  encryptedContentHandles?: string[];
  decryptedContent?: string;
};

/**
 * Decode a numeric value back to text (reversible encoding)
 * @param numValue The numeric value to decode
 * @returns The decoded text string
 */
function decodeNumberToText(numValue: number): string {
  const chars: string[] = [];
  let value = numValue;
  
  // Extract 4 characters (each 8 bits)
  // We need to extract from least significant to most significant
  for (let i = 0; i < 4; i++) {
    const charCode = value % 256;
    value = Math.floor(value / 256);
    chars.unshift(String.fromCharCode(charCode));
  }
  
  // Remove trailing null characters
  const result = chars.join('').replace(/\0+$/, '');
  return result || String(numValue); // Fallback to number if all nulls
}

type TimeCapsuleInfoType = {
  abi: typeof TimeCapsuleABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getTimeCapsuleByChainId(
  chainId: number | undefined
): TimeCapsuleInfoType {
  if (!chainId) {
    return { abi: TimeCapsuleABI.abi };
  }

  const entry =
    TimeCapsuleAddresses[chainId.toString() as keyof typeof TimeCapsuleAddresses];

  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: TimeCapsuleABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: TimeCapsuleABI.abi,
  };
}

export const useTimeCapsule = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [capsules, setCapsules] = useState<CapsuleInfo[]>([]);
  const [userCapsuleIds, setUserCapsuleIds] = useState<bigint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [message, setMessage] = useState<string>("");

  const timeCapsuleRef = useRef<TimeCapsuleInfoType | undefined>(undefined);
  const isLoadingRef = useRef<boolean>(false);
  const isCreatingRef = useRef<boolean>(false);
  const isUnlockingRef = useRef<boolean>(false);
  const isDecryptingRef = useRef<boolean>(false);

  const timeCapsule = useMemo(() => {
    const c = getTimeCapsuleByChainId(chainId);
    timeCapsuleRef.current = c;
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!timeCapsule) {
      return undefined;
    }
    return (
      Boolean(timeCapsule.address) &&
      timeCapsule.address !== ethers.ZeroAddress
    );
  }, [timeCapsule]);

  // Load user's capsules
  const loadUserCapsules = useCallback(async () => {
    if (
      !timeCapsuleRef.current?.address ||
      !ethersSigner ||
      !ethersReadonlyProvider
    ) {
      setUserCapsuleIds([]);
      return;
    }

    try {
      const contract = new ethers.Contract(
        timeCapsuleRef.current.address,
        timeCapsuleRef.current.abi,
        ethersReadonlyProvider
      );

      const userAddress = await ethersSigner.getAddress();
      const ids = await contract.getUserCapsules(userAddress);
      setUserCapsuleIds(ids.map((id: bigint) => BigInt(id.toString())));
    } catch (error) {
      console.error("Failed to load user capsules:", error);
      setMessage("Failed to load capsules");
    }
  }, [ethersSigner, ethersReadonlyProvider]);

  // Load capsule details
  const loadCapsuleDetails = useCallback(
    async (capsuleId: bigint) => {
      if (!timeCapsuleRef.current?.address || !ethersReadonlyProvider) {
        return;
      }

      try {
        const contract = new ethers.Contract(
          timeCapsuleRef.current.address,
          timeCapsuleRef.current.abi,
          ethersReadonlyProvider
        );

        const [info, encryptedContents] = await Promise.all([
          contract.getCapsuleInfo(capsuleId),
          contract.getEncryptedContents(capsuleId).catch(() => undefined),
        ]);

        const capsule: CapsuleInfo = {
          id: capsuleId,
          unlockTime: BigInt(info.unlockTime.toString()),
          owner: info.owner,
          heir: info.heir,
          exists: info.exists,
          unlocked: info.unlocked,
          encryptedContentHandles: Array.isArray(encryptedContents)
            ? (encryptedContents as string[])
            : undefined,
        };

        setCapsules((prev) => {
          const filtered = prev.filter((c) => c.id !== capsuleId);
          return [...filtered, capsule];
        });
      } catch (error) {
        console.error("Failed to load capsule details:", error);
      }
    },
    [ethersReadonlyProvider]
  );

  // Auto-load capsules when user connects
  useEffect(() => {
    if (userCapsuleIds.length > 0) {
      userCapsuleIds.forEach((id) => {
        loadCapsuleDetails(id);
      });
    }
  }, [userCapsuleIds, loadCapsuleDetails]);

  useEffect(() => {
    if (ethersSigner && timeCapsule.address) {
      loadUserCapsules();
    }
  }, [ethersSigner, timeCapsule.address, loadUserCapsules]);

  // Create capsule
  const createCapsule = useCallback(
    async (
      content: string,
      unlockTime: bigint,
      heir: string | undefined
    ) => {
      if (
        isCreatingRef.current ||
        !timeCapsule.address ||
        !instance ||
        !ethersSigner
      ) {
        return;
      }

      isCreatingRef.current = true;
      setIsCreating(true);
      setMessage("Creating capsule...");

      const thisChainId = chainId;
      const thisTimeCapsuleAddress = timeCapsule.address;
      const thisEthersSigner = ethersSigner;

      const run = async () => {
        const isStale = () =>
          thisTimeCapsuleAddress !== timeCapsuleRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const encoder = new TextEncoder();
          const bytes = encoder.encode(content);
          const MAX_MESSAGE_BYTES = 1024; // 1 KB cap
          if (bytes.length === 0) {
            setMessage("Message is empty");
            return;
          }
          if (bytes.length > MAX_MESSAGE_BYTES) {
            setMessage(`Message is too long (max ${MAX_MESSAGE_BYTES} bytes).`);
            return;
          }

          // Pack every 4 bytes into one uint32 (big-endian)
          const chunkCount = Math.ceil(bytes.length / 4);
          const uint32Chunks: number[] = new Array(chunkCount);
          for (let i = 0; i < chunkCount; i++) {
            const b0 = bytes[i * 4] ?? 0;
            const b1 = bytes[i * 4 + 1] ?? 0;
            const b2 = bytes[i * 4 + 2] ?? 0;
            const b3 = bytes[i * 4 + 3] ?? 0;
            const value = ((b0 << 24) >>> 0) + (b1 << 16) + (b2 << 8) + b3;
            uint32Chunks[i] = value >>> 0;
          }

          setMessage("Encrypting content...");

          // Create encrypted input with all chunks
          const input = instance.createEncryptedInput(
            thisTimeCapsuleAddress,
            thisEthersSigner.address
          );
          for (const v of uint32Chunks) {
            input.add32(v);
          }

          await new Promise((resolve) => setTimeout(resolve, 100));
          const enc = await input.encrypt();

          if (isStale()) {
            setMessage("Operation cancelled");
            return;
          }

          setMessage("Sending transaction...");

          const contract = new ethers.Contract(
            thisTimeCapsuleAddress,
            timeCapsule.abi,
            thisEthersSigner
          );

          const tx = await contract.createCapsule(
            enc.handles,
            enc.inputProof,
            unlockTime,
            heir || ethers.ZeroAddress
          );

          setMessage(`Waiting for transaction: ${tx.hash}...`);

          const receipt = await tx.wait();

          if (isStale()) {
            setMessage("Operation cancelled");
            return;
          }

          setMessage(`Capsule created! Status: ${receipt?.status}`);
          await loadUserCapsules();
        } catch (error: any) {
          setMessage(`Failed to create capsule: ${error.message}`);
        } finally {
          isCreatingRef.current = false;
          setIsCreating(false);
        }
      };

      run();
    },
    [
      timeCapsule.address,
      timeCapsule.abi,
      instance,
      ethersSigner,
      chainId,
      sameChain,
      sameSigner,
      loadUserCapsules,
    ]
  );

  // Unlock capsule
  const unlockCapsule = useCallback(
    async (capsuleId: bigint) => {
      if (
        isUnlockingRef.current ||
        !timeCapsule.address ||
        !ethersSigner
      ) {
        return;
      }

      isUnlockingRef.current = true;
      setIsUnlocking(true);
      setMessage("Unlocking capsule...");

      const thisChainId = chainId;
      const thisTimeCapsuleAddress = timeCapsule.address;
      const thisEthersSigner = ethersSigner;

      const run = async () => {
        const isStale = () =>
          thisTimeCapsuleAddress !== timeCapsuleRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const contract = new ethers.Contract(
            thisTimeCapsuleAddress,
            timeCapsule.abi,
            thisEthersSigner
          );

          const tx = await contract.unlockCapsule(capsuleId);

          setMessage(`Waiting for transaction: ${tx.hash}...`);
          const receipt = await tx.wait();

          if (isStale()) {
            setMessage("Operation cancelled");
            return;
          }

          setMessage(`Capsule unlocked! Status: ${receipt?.status}`);
          await loadCapsuleDetails(capsuleId);
        } catch (error: any) {
          setMessage(`Failed to unlock capsule: ${error.message}`);
        } finally {
          isUnlockingRef.current = false;
          setIsUnlocking(false);
        }
      };

      run();
    },
    [
      timeCapsule.address,
      timeCapsule.abi,
      ethersSigner,
      chainId,
      sameChain,
      sameSigner,
      loadCapsuleDetails,
    ]
  );

  // Decrypt capsule content
  const decryptCapsuleContent = useCallback(
    async (capsuleId: bigint) => {
      if (
        isDecryptingRef.current ||
        !timeCapsule.address ||
        !instance ||
        !ethersSigner
      ) {
        return;
      }

      const capsule = capsules.find((c) => c.id === capsuleId);
      if (!capsule || !capsule.encryptedContentHandles || capsule.encryptedContentHandles.length === 0) {
        setMessage("Capsule content not found");
        return;
      }

      isDecryptingRef.current = true;
      setIsDecrypting(true);
      setMessage("Decrypting content...");

      const thisChainId = chainId;
      const thisTimeCapsuleAddress = timeCapsule.address;
      const thisCapsuleId = capsuleId;
      const thisEthersSigner = ethersSigner;
      const handles = capsule.encryptedContentHandles;

      const run = async () => {
        const isStale = () =>
          thisTimeCapsuleAddress !== timeCapsuleRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const sig = await FhevmDecryptionSignature.loadOrSign(
            instance,
            [timeCapsule.address as `0x${string}`],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

          if (!sig) {
            setMessage("Unable to build decryption signature");
            return;
          }

          if (isStale()) {
            setMessage("Operation cancelled");
            return;
          }

          setMessage("Calling FHEVM userDecrypt...");

          const res = await instance.userDecrypt(
            handles.map((h) => ({ handle: h, contractAddress: thisTimeCapsuleAddress })),
            sig.privateKey,
            sig.publicKey,
            sig.signature,
            sig.contractAddresses,
            sig.userAddress,
            sig.startTimestamp,
            sig.durationDays
          );

          if (isStale()) {
            setMessage("Operation cancelled");
            return;
          }

          // Reassemble bytes in order and decode as UTF-8
          const resRecord = res as Record<string, bigint | number>;
          const uint32Values: number[] = handles.map((h) => Number(resRecord[h] as bigint | number));
          const byteArray: number[] = [];
          for (const v of uint32Values) {
            const b0 = (v >>> 24) & 0xff;
            const b1 = (v >>> 16) & 0xff;
            const b2 = (v >>> 8) & 0xff;
            const b3 = v & 0xff;
            byteArray.push(b0, b1, b2, b3);
          }
          // Trim trailing zero padding
          let end = byteArray.length;
          while (end > 0 && byteArray[end - 1] === 0) end--;
          const trimmed = byteArray.slice(0, end);
          const decoder = new TextDecoder();
          const decodedText = decoder.decode(new Uint8Array(trimmed));

          setCapsules((prev) =>
            prev.map((c) =>
              c.id === thisCapsuleId
                ? {
                    ...c,
                    decryptedContent: decodedText,
                  }
                : c
            )
          );

          setMessage("Content decrypted successfully!");
        } catch (error: any) {
          setMessage(`Decryption failed: ${error.message}`);
        } finally {
          isDecryptingRef.current = false;
          setIsDecrypting(false);
        }
      };

      run();
    },
    [
      timeCapsule.address,
      instance,
      ethersSigner,
      fhevmDecryptionSignatureStorage,
      capsules,
      chainId,
      sameChain,
      sameSigner,
    ]
  );

  // Refresh all capsules
  const refreshCapsules = useCallback(async () => {
    if (!ethersSigner || !ethersReadonlyProvider || !timeCapsuleRef.current?.address) {
      return;
    }

    try {
      // Reload user capsule IDs
      await loadUserCapsules();
      
      // Reload details for all existing capsules
      const allCapsuleIds = Array.from(
        new Set([
          ...userCapsuleIds,
          ...capsules.map(c => c.id)
        ])
      );
      
      for (const id of allCapsuleIds) {
        await loadCapsuleDetails(id);
      }
    } catch (error) {
      console.error("Failed to refresh capsules:", error);
      setMessage("Failed to refresh capsules");
    }
  }, [ethersSigner, ethersReadonlyProvider, userCapsuleIds, capsules, loadUserCapsules, loadCapsuleDetails]);

  return {
    contractAddress: timeCapsule.address,
    isDeployed,
    capsules,
    userCapsuleIds,
    isLoading,
    isCreating,
    isUnlocking,
    isDecrypting,
    message,
    createCapsule,
    unlockCapsule,
    decryptCapsuleContent,
    loadUserCapsules,
    refreshCapsules,
  };
};
