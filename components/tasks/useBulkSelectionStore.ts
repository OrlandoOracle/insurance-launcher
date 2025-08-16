import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TaskFilters = {
  status?: ('OPEN' | 'DONE')[];
  stage?: ('NEW' | 'WORKING' | 'WAITING' | 'DONE')[];
  priority?: ('LOW' | 'MEDIUM' | 'HIGH')[];
  q?: string;
  contactId?: string;
  dueFrom?: string;
  dueTo?: string;
  label?: string;
  showArchived?: boolean;
};

export type TaskSort = {
  field: 'dueAt' | 'contact' | 'status' | 'priority' | 'stage' | 'createdAt';
  direction: 'asc' | 'desc';
};

export type ListScope = {
  filters: TaskFilters;
  sort?: TaskSort;
  page: number;
  pageSize: number;
};

type State = {
  mode: 'NONE' | 'PAGE' | 'GLOBAL';
  selectedIdsOnPage: Set<string>;
  allMatchingSelected: boolean;
  totalMatchingCount: number;
  currentScope: ListScope | null;
};

type Actions = {
  setScope: (scope: ListScope) => void;
  toggleRow: (id: string, checked: boolean) => void;
  togglePage: (idsOnPage: string[], checked: boolean) => void;
  selectAllMatching: (total: number) => void;
  clear: () => void;
  getSelectedIds: () => string[];
  isSelected: (id: string) => boolean;
};

export const useBulkSelectionStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      mode: 'NONE',
      selectedIdsOnPage: new Set(),
      allMatchingSelected: false,
      totalMatchingCount: 0,
      currentScope: null,

      setScope: (scope) => set({ currentScope: scope }),

      toggleRow: (id, checked) =>
        set((state) => {
          const next = new Set(state.selectedIdsOnPage);
          if (checked) {
            next.add(id);
          } else {
            next.delete(id);
          }
          return {
            selectedIdsOnPage: next,
            mode: next.size > 0 ? 'PAGE' : 'NONE',
            allMatchingSelected: false,
          };
        }),

      togglePage: (ids, checked) =>
        set(() => ({
          selectedIdsOnPage: new Set(checked ? ids : []),
          mode: checked && ids.length > 0 ? 'PAGE' : 'NONE',
          allMatchingSelected: false,
        })),

      selectAllMatching: (total) =>
        set({
          mode: 'GLOBAL',
          allMatchingSelected: true,
          totalMatchingCount: total,
        }),

      clear: () =>
        set({
          mode: 'NONE',
          selectedIdsOnPage: new Set(),
          allMatchingSelected: false,
          totalMatchingCount: 0,
        }),

      getSelectedIds: () => Array.from(get().selectedIdsOnPage),

      isSelected: (id) => get().selectedIdsOnPage.has(id),
    }),
    {
      name: 'task-bulk-selection',
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          if (!str) return null;
          const data = JSON.parse(str);
          // Convert array back to Set
          if (data?.state?.selectedIdsOnPage) {
            data.state.selectedIdsOnPage = new Set(data.state.selectedIdsOnPage);
          }
          return data;
        },
        setItem: (name, value) => {
          // Convert Set to array for storage
          const data = { ...value };
          if (data?.state?.selectedIdsOnPage) {
            data.state.selectedIdsOnPage = Array.from(data.state.selectedIdsOnPage);
          }
          sessionStorage.setItem(name, JSON.stringify(data));
        },
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    }
  )
);