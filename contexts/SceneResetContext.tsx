"use client";

import React, { createContext, useContext, ReactNode } from "react";

interface SceneResetContextType {
  resetSceneData: () => void;
}

const SceneResetContext = createContext<SceneResetContextType | null>(null);

export const useSceneReset = () => {
  const context = useContext(SceneResetContext);
  if (!context) {
    throw new Error("useSceneReset must be used within a SceneResetProvider");
  }
  return context;
};

export const SceneResetProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const resetSceneData = () => {
    console.log("🔄 Resetting all scene manager data from context");

    // Clear all scene manager related localStorage keys
    const keysToRemove = [
      "sceneManagerState",
      "sceneManagerJobId",
      "sceneManagerScript",
      "sceneManagerScenes",
      "sceneManagerImages",
      "sceneManagerAudio",
      "sceneManagerPrompts",
      "sceneManagerDurations",
      "lastJobId",
      "scenes",
      "images",
      "audio",
      "imagePrompts",
      "continuousAudioData",
      "continuousAudioTimings",
    ];

    // Also clear any automan prefixed keys
    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith("automan_scenes_") ||
        key.startsWith("automan_stale_audio_") ||
        keysToRemove.includes(key)
      ) {
        try {
          localStorage.removeItem(key);
          console.log(`Removed localStorage key: ${key}`);
        } catch (error) {
          console.error(`Error removing ${key}:`, error);
        }
      }
    });

    console.log("✅ Scene manager data reset complete");
  };

  return (
    <SceneResetContext.Provider value={{ resetSceneData }}>
      {children}
    </SceneResetContext.Provider>
  );
};
