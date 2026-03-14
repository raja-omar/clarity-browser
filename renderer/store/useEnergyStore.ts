import { create } from "zustand";
import type { AppBootstrap, EnergyLevel, EnergyLog } from "../types";

interface EnergyState {
  logs: EnergyLog[];
  initialize: (bootstrap: AppBootstrap) => void;
  saveLog: (payload: Omit<EnergyLog, "id" | "timestamp">) => Promise<void>;
  currentEnergy: () => EnergyLevel;
}

export const useEnergyStore = create<EnergyState>((set, get) => ({
  logs: [],
  initialize: (bootstrap) => set({ logs: bootstrap.energyLogs }),
  saveLog: async (payload) => {
    const entry = window.clarity
      ? await window.clarity.saveEnergyLog(payload)
      : {
          id: `energy-${Date.now()}`,
          timestamp: new Date().toISOString(),
          ...payload,
        };

    set((state) => ({
      logs: [entry, ...state.logs].slice(0, 5),
    }));
  },
  currentEnergy: () => get().logs[0]?.energy ?? "medium",
}));
