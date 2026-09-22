import { create } from 'zustand';

export interface WorkflowStep {
  step: string;
  status: string;
}

interface WorkflowStore {
  workflowId: string | null;
  steps: WorkflowStep[];
  status: 'idle' | 'running' | 'complete' | 'error';
  streamingContent: string;
  error: string | null;
  setStatus: (status: WorkflowStore['status']) => void;
  addStep: (step: WorkflowStep) => void;
  updateStep: (step: string, status: string) => void;
  appendStream: (chunk: string) => void;
  clearStream: () => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  workflowId: null,
  steps: [],
  status: 'idle',
  streamingContent: '',
  error: null,
  setStatus: (status) => set({ status }),
  addStep: (step) => set((s) => ({ steps: [...s.steps, step] })),
  updateStep: (step, status) =>
    set((s) => ({
      steps: s.steps.map((st) => (st.step === step ? { step, status } : st)),
    })),
  appendStream: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),
  clearStream: () => set({ streamingContent: '' }),
  reset: () =>
    set({ workflowId: null, steps: [], status: 'idle', streamingContent: '', error: null }),
}));
