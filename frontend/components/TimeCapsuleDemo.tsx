"use client";

import { useTimeCapsule } from "@/hooks/useTimeCapsule";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useState } from "react";

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

export const TimeCapsuleDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();

  const {
    provider,
    chainId,
    accounts,
    isConnected,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    connect,
  } = useMetaMaskEthersSigner();

  const { instance: fhevmInstance, status: fhevmStatus } = useFhevm({
    provider,
    chainId,
    initialMockChains: { 31337: "http://localhost:8545" },
    enabled: true,
  });

  const {
    contractAddress,
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
    refreshCapsules,
  } = useTimeCapsule({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [content, setContent] = useState("");
  const [unlockTime, setUnlockTime] = useState("");
  const [heir, setHeir] = useState("");

  const handleCreateCapsule = () => {
    if (!content || !unlockTime) {
      alert("⚠️ Please fill in both the message content and unlock time to create your time capsule.");
      return;
    }

    const unlockTimestamp = BigInt(
      Math.floor(new Date(unlockTime).getTime() / 1000)
    );
    const currentTime = BigInt(Math.floor(Date.now() / 1000));

    if (unlockTimestamp <= currentTime) {
      alert("⚠️ The unlock time must be set to a future date and time. Please choose a time that hasn't occurred yet.");
      return;
    }

    createCapsule(content, unlockTimestamp, heir || undefined);
  };

  // Wallet Not Connected State
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-8 p-8 animate-fadeIn">
        <div className="text-center space-y-6 max-w-2xl">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-900 to-blue-800 rounded-3xl flex items-center justify-center shadow-2xl">
                <span className="text-white text-6xl">🔐</span>
              </div>
              <div className="absolute -top-2 -right-2 w-12 h-12 bg-red-700 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">⏰</span>
              </div>
            </div>
          </div>

          {/* Title and Description */}
          <div className="space-y-3">
            <h2 className="text-4xl font-extrabold text-gray-900">
              Welcome to TimeCapsule
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Connect your MetaMask wallet to begin creating encrypted time capsules.
              Your messages will be securely locked using FHEVM technology until your chosen unlock time.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
              <div className="text-3xl mb-2">🔒</div>
              <h3 className="font-bold text-gray-900 mb-1">Secure</h3>
              <p className="text-sm text-gray-600">End-to-end encryption</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
              <div className="text-3xl mb-2">⏰</div>
              <h3 className="font-bold text-gray-900 mb-1">Time-Locked</h3>
              <p className="text-sm text-gray-600">Unlock at specific time</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
              <div className="text-3xl mb-2">🔐</div>
              <h3 className="font-bold text-gray-900 mb-1">Private</h3>
              <p className="text-sm text-gray-600">Your data stays private</p>
            </div>
          </div>

          {/* Connect Button */}
          <button
            onClick={connect}
            className="px-10 py-5 bg-gradient-to-r from-blue-900 to-blue-800 text-white font-bold text-lg rounded-2xl hover:from-blue-800 hover:to-blue-700 transition-all shadow-2xl hover:shadow-blue-900/50 transform hover:scale-105 border-2 border-blue-700"
          >
            🦊 Connect MetaMask Wallet
          </button>

          <p className="text-sm text-gray-500 mt-4">
            Make sure you have MetaMask installed in your browser
          </p>
        </div>
      </div>
    );
  }

  // FHEVM Loading State
  if (fhevmStatus !== "ready") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-8 animate-fadeIn">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 border-8 border-blue-200 border-t-blue-900 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl">⚙️</span>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-900">
              {fhevmStatus === "loading"
                ? "Initializing FHEVM System..."
                : fhevmStatus === "error"
                ? "FHEVM Initialization Failed"
                : "Preparing Encryption System..."}
            </h3>
            <p className="text-gray-600">
              {fhevmStatus === "loading"
                ? "Please wait while we set up the encryption infrastructure for your time capsules."
                : fhevmStatus === "error"
                ? "There was an error initializing the FHEVM system. Please refresh the page and try again."
                : "Setting up secure encryption..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Contract Not Deployed State
  if (!isDeployed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-8 animate-fadeIn">
        <div className="bg-red-50 border-4 border-red-700 rounded-2xl p-8 max-w-lg text-center space-y-4 shadow-xl">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-red-900">
            Contract Not Deployed
          </h3>
          <p className="text-base text-red-800">
            The TimeCapsule smart contract is not deployed on the current network.
            Please switch to a supported network or deploy the contract first.
          </p>
          <div className="bg-white p-4 rounded-lg border-2 border-red-200 mt-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Current Chain ID:</span> {chainId}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full animate-fadeIn">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-red-800 text-white p-8 rounded-2xl shadow-2xl border-4 border-blue-900">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-700 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-4xl">📬</span>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold mb-1">Your Time Capsule Vault</h1>
              <p className="text-blue-200 text-base">
                Create and manage your encrypted time-locked messages securely on the blockchain
              </p>
            </div>
          </div>
          <div className="bg-blue-950/50 px-6 py-4 rounded-xl border-2 border-blue-700 text-center">
            <p className="text-xs text-blue-300 mb-1">Smart Contract</p>
            <p className="text-xs font-mono font-bold text-white">
              {contractAddress?.slice(0, 6)}...{contractAddress?.slice(-6)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column - Create Form */}
        <div className="space-y-6">
          {/* Create Capsule Card */}
          <div className="bg-white border-4 border-blue-900 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4 border-b-4 border-red-700">
              <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
                <span className="text-3xl">✨</span>
                Create New Time Capsule
              </h2>
              <p className="text-blue-200 text-sm mt-1">
                Lock your message with encryption until a future date
              </p>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Message Input */}
              <div>
                <label className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3">
                  <span className="text-xl">📝</span>
                  Your Secret Message
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your message here... It will be encrypted and locked until the unlock time you specify."
                  className="w-full p-4 border-3 border-gray-300 rounded-xl focus:border-blue-900 focus:ring-4 focus:ring-blue-200 transition-all resize-none text-gray-900 placeholder-gray-400 font-medium"
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <span>ℹ️</span>
                  Message is encrypted and stored in chunks (max 256 characters).
                </p>
              </div>

              {/* Unlock Time Input */}
              <div>
                <label className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3">
                  <span className="text-xl">⏰</span>
                  Unlock Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={unlockTime}
                  onChange={(e) => setUnlockTime(e.target.value)}
                  className="w-full p-4 border-3 border-gray-300 rounded-xl focus:border-blue-900 focus:ring-4 focus:ring-blue-200 transition-all text-gray-900 font-medium"
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <span>🔒</span>
                  Your capsule will remain locked and encrypted until this time arrives
                </p>
              </div>

              {/* Heir Address Input */}
              <div>
                <label className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3">
                  <span className="text-xl">👤</span>
                  Heir Address
                  <span className="text-sm text-gray-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={heir}
                  onChange={(e) => setHeir(e.target.value)}
                  placeholder="0x... (Leave empty to use your own address)"
                  className="w-full p-4 border-3 border-gray-300 rounded-xl focus:border-blue-900 focus:ring-4 focus:ring-blue-200 transition-all font-mono text-sm text-gray-900 placeholder-gray-400"
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <span>👥</span>
                  This address will be able to unlock and decrypt the capsule after the unlock time
                </p>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreateCapsule}
                disabled={isCreating || !content || !unlockTime}
                className="w-full px-6 py-5 bg-gradient-to-r from-red-700 to-red-600 text-white font-bold text-lg rounded-xl hover:from-red-800 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl transform hover:scale-[1.02] disabled:transform-none border-2 border-red-800"
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="animate-spin text-2xl">⏳</span>
                    <span>Creating Your Time Capsule...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    <span className="text-2xl">🚀</span>
                    <span>Create Time Capsule</span>
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-3 border-gray-300 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              How It Works
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">1️⃣</span>
                <p><span className="font-semibold">Create:</span> Write your message and choose an unlock time in the future</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">2️⃣</span>
                <p><span className="font-semibold">Encrypt:</span> Your message is encrypted using FHEVM and stored on the blockchain</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">3️⃣</span>
                <p><span className="font-semibold">Wait:</span> The capsule remains locked until the unlock time arrives</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">4️⃣</span>
                <p><span className="font-semibold">Unlock:</span> After the time passes, unlock and decrypt your message</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Capsules List */}
        <div className="space-y-6">
          {/* Message Display */}
          {message && (
            <div className="bg-blue-50 border-l-4 border-blue-900 p-5 rounded-xl shadow-lg animate-fadeIn">
              <p className="text-base text-blue-900 font-semibold flex items-center gap-2">
                <span className="text-2xl">📢</span>
                {message}
              </p>
            </div>
          )}

          {/* My Capsules Card */}
          <div className="bg-white border-4 border-blue-900 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4 border-b-4 border-red-700 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
                  <span className="text-3xl">📦</span>
                  My Time Capsules
                </h2>
                <p className="text-blue-200 text-sm mt-1">
                  Total: {userCapsuleIds.length} capsule{userCapsuleIds.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={refreshCapsules}
                disabled={isLoading}
                className="px-4 py-3 bg-red-700 text-white rounded-xl hover:bg-red-800 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl font-bold text-sm flex items-center gap-2 border-2 border-red-800"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin text-lg">⏳</span>
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">🔄</span>
                    <span>Refresh</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-6">
              {userCapsuleIds.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-7xl mb-6">📭</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No Capsules Yet</h3>
                  <p className="text-gray-600 text-base mb-2">
                    You haven't created any time capsules yet
                  </p>
                  <p className="text-gray-500 text-sm">
                    Use the form on the left to create your first encrypted time capsule
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-5 max-h-[800px] overflow-y-auto pr-2">
                  {(() => {
                    // Sort capsules
                    const sortedCapsules = userCapsuleIds
                      .map((id) => capsules.find((c) => c.id === id))
                      .filter((c): c is typeof c & { id: bigint } => c !== undefined)
                      .sort((a, b) => {
                        if (a.unlocked && !b.unlocked) return 1;
                        if (!a.unlocked && b.unlocked) return -1;
                        
                        const now = BigInt(Math.floor(Date.now() / 1000));
                        const aTimeDiff = a.unlockTime > now ? a.unlockTime - now : now - a.unlockTime;
                        const bTimeDiff = b.unlockTime > now ? b.unlockTime - now : now - b.unlockTime;
                        
                        if (!a.unlocked && !b.unlocked) {
                          return Number(aTimeDiff - bTimeDiff);
                        }
                        
                        if (a.unlocked && b.unlocked) {
                          return Number(b.unlockTime - a.unlockTime);
                        }
                        
                        return 0;
                      });

                    return sortedCapsules.map((capsule) => {
                      const canUnlock =
                        BigInt(Math.floor(Date.now() / 1000)) >= capsule.unlockTime;
                      const unlockDate = new Date(
                        Number(capsule.unlockTime) * 1000
                      ).toLocaleString();
                      const timeUntilUnlock = Number(capsule.unlockTime) * 1000 - Date.now();
                      const daysUntilUnlock = Math.floor(timeUntilUnlock / (1000 * 60 * 60 * 24));
                      const hoursUntilUnlock = Math.floor((timeUntilUnlock % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                      return (
                        <div
                          key={capsule.id.toString()}
                          className={`p-6 border-3 rounded-2xl transition-all hover:shadow-xl ${
                            capsule.unlocked
                              ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-600"
                              : canUnlock
                              ? "bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-600"
                              : "bg-gradient-to-br from-gray-50 to-slate-50 border-gray-400"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-extrabold text-xl text-gray-900 flex items-center gap-2">
                                <span className="text-2xl">
                                  {capsule.unlocked ? "🔓" : canUnlock ? "⏰" : "🔒"}
                                </span>
                                Capsule #{capsule.id.toString()}
                              </h3>
                            </div>
                            <span
                              className={`px-4 py-2 rounded-xl text-sm font-bold shadow-md ${
                                capsule.unlocked
                                  ? "bg-green-600 text-white"
                                  : canUnlock
                                  ? "bg-yellow-500 text-gray-900"
                                  : "bg-gray-600 text-white"
                              }`}
                            >
                              {capsule.unlocked
                                ? "✅ UNLOCKED"
                                : canUnlock
                                ? "⚡ READY TO UNLOCK"
                                : `🔒 LOCKED - ${daysUntilUnlock}d ${hoursUntilUnlock}h`}
                            </span>
                          </div>

                          <div className="space-y-3 mb-5">
                            <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
                              <div className="flex items-center gap-2 text-base text-gray-900 font-semibold mb-1">
                                <span className="text-xl">⏰</span>
                                Unlock Time
                              </div>
                              <p className="text-gray-700 ml-7">{unlockDate}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
                              <div className="flex items-center gap-2 text-base text-gray-900 font-semibold mb-1">
                                <span className="text-xl">👤</span>
                                Owner
                              </div>
                              <p className="text-gray-700 font-mono text-sm ml-7">
                                {capsule.owner.slice(0, 10)}...{capsule.owner.slice(-8)}
                              </p>
                            </div>
                            {capsule.heir !== capsule.owner && (
                              <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
                                <div className="flex items-center gap-2 text-base text-gray-900 font-semibold mb-1">
                                  <span className="text-xl">👥</span>
                                  Heir
                                </div>
                                <p className="text-gray-700 font-mono text-sm ml-7">
                                  {capsule.heir.slice(0, 10)}...{capsule.heir.slice(-8)}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-3 mt-5">
                            {!capsule.unlocked && canUnlock && (
                              <button
                                onClick={() => unlockCapsule(capsule.id)}
                                disabled={isUnlocking}
                                className="flex-1 px-5 py-4 bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-xl hover:from-blue-800 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl font-bold text-base border-2 border-blue-700"
                              >
                                {isUnlocking ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin text-xl">⏳</span>
                                    <span>Unlocking...</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="text-xl">🔓</span>
                                    <span>Unlock Capsule</span>
                                  </span>
                                )}
                              </button>
                            )}
                            {capsule.unlocked && capsule.encryptedContentHandles && capsule.encryptedContentHandles.length > 0 && (
                              <button
                                onClick={() => decryptCapsuleContent(capsule.id)}
                                disabled={isDecrypting || !!capsule.decryptedContent}
                                className="flex-1 px-5 py-4 bg-gradient-to-r from-red-700 to-red-600 text-white rounded-xl hover:from-red-800 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl font-bold text-base border-2 border-red-800"
                              >
                                {isDecrypting ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin text-xl">⏳</span>
                                    <span>Decrypting...</span>
                                  </span>
                                ) : capsule.decryptedContent ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="text-xl">✅</span>
                                    <span>Already Decrypted</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="text-xl">🔐</span>
                                    <span>Decrypt Content</span>
                                  </span>
                                )}
                              </button>
                            )}
                          </div>

                          {capsule.decryptedContent !== undefined && (
                            <div className="mt-5 p-5 bg-white border-3 border-green-600 rounded-2xl shadow-lg">
                              <div className="flex items-center gap-2 font-bold text-green-800 mb-3 text-lg">
                                <span className="text-2xl">✨</span>
                                Decrypted Message
                              </div>
                              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-300">
                                <p className="text-lg font-semibold break-words whitespace-pre-wrap text-gray-900">
                                  {String(capsule.decryptedContent)}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500 mt-3 italic flex items-center gap-1">
                                <span>ℹ️</span>
                                Decrypted message reconstructed from encrypted chunks.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
