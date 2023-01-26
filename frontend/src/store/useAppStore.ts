import { create } from "zustand";
import {} from "zustand/middleware";

interface AppStore {
  selectedChainID: number;
  setSelectedChainID: (v: number) => void;
}

// // Log every time state is changed
// const log = (config: StateCreator<AppStore, [], [], AppStore>) => (set, get, api) =>
//   config(
//     (...args: any) => {
//       console.log("  applying", args);
//       set(...args);
//       console.log("  new state", get());
//     },
//     get,
//     api
//   );

export const useAppStore = create<AppStore>()((set) => ({
  selectedChainID: 0,
  setSelectedChainID: (v: number) => set(() => ({ selectedChainID: v })),
}));
