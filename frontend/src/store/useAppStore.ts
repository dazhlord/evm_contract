import { create } from "zustand";
import {} from "zustand/middleware";

interface AppStore {
  selectedChainID: number;
  setSelectedChainID: (v: number) => void;
}

export const useAppStore = create<AppStore>()((set) => ({
  selectedChainID: 97,
  setSelectedChainID: (v: number) => set(() => ({ selectedChainID: v })),
}));
