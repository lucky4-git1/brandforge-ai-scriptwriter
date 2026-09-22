import { useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { useBrandStore } from '../state/brandStore';
import { useWorkflowStore } from '../state/workflowStore';
import { useContentStore } from '../state/contentStore';
import { useSkillsStore } from '../state/skillsStore';

export function useWorkflow() {
  const { currentBrand } = useBrandStore();
  const wf = useWorkflowStore();
  const { loadContent } = useContentStore();
  const { activeSkills } = useSkillsStore();

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    (async () => {
      unsubs.push(
        await listen<{ step: string; status: string; workflowId: string }>(
          'workflow-progress',
          (e) => {
            wf.updateStep(e.payload.step, e.payload.status);
            if (e.payload.status === 'running') wf.addStep({ step: e.payload.step, status: 'running' });
          }
        )
      );
      unsubs.push(
        await listen<string>('agent-response', (e) => {
          wf.appendStream(e.payload);
        })
      );
      unsubs.push(
        await listen('workflow-complete', async () => {
          wf.setStatus('complete');
          if (currentBrand) await loadContent(currentBrand.id);
        })
      );
      unsubs.push(
        await listen('ollama-not-running', () => {
          wf.setStatus('error');
          useWorkflowStore.setState({ error: 'Ollama is not running. Start it with: ollama serve' });
        })
      );
    })();
    return () => unsubs.forEach((u) => u());
  }, [currentBrand?.id]);

  const runPipeline = useCallback(
    async (topic: string, platform: string = 'tiktok', language: string = 'english') => {
      if (!currentBrand) throw new Error('Select a brand first');
      wf.reset();
      wf.setStatus('running');
      wf.clearStream();
      try {
        await invoke('run_content_pipeline', {
          brandId: currentBrand.id,
          topic,
          platform,
          language,
          activeSkills,
        });
        wf.setStatus('complete');
        await loadContent(currentBrand.id);
      } catch (e) {
        wf.setStatus('error');
        useWorkflowStore.setState({ error: String(e) });
        throw e;
      }
    },
    [currentBrand, wf, loadContent, activeSkills]
  );

  return { runPipeline, ...wf };
}
