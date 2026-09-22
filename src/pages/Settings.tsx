import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Check, Cloud, Cpu, KeyRound, Loader2, X } from 'lucide-react';
import clsx from 'clsx';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  size_gb: number;
  is_installed: boolean;
  is_active: boolean;
  recommended_device: string;
  description: string;
}

interface LlmConfig {
  provider: string;
  model: string;
  openrouter_api_key: string;
  openrouter_model: string;
  openai_api_key: string;
  openai_model: string;
  nvidia_api_key: string;
  nvidia_base_url: string;
  nvidia_model: string;
}

interface ModelStatus {
  provider: string;
  current_model: string;
  ollama_running: boolean;
  is_cloud: boolean;
  ollama_installed_models: string[];
}

type CloudProvider = 'nvidia' | 'openai' | 'openrouter';

const CLOUD_TABS: { id: CloudProvider; label: string; keyField: keyof LlmConfig; keyHint: string }[] = [
  {
    id: 'nvidia',
    label: 'NVIDIA',
    keyField: 'nvidia_api_key',
    keyHint: 'NVIDIA NIM API key from https://build.nvidia.com',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    keyField: 'openai_api_key',
    keyHint: 'OpenAI API key from https://platform.openai.com/api-keys',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    keyField: 'openrouter_api_key',
    keyHint: 'OpenRouter API key from https://openrouter.ai/keys',
  },
];

export function Settings() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [config, setConfig] = useState<LlmConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeCloudTab, setActiveCloudTab] = useState<CloudProvider>('nvidia');
  const [keyPrompt, setKeyPrompt] = useState<ModelInfo | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [m, s, c] = await Promise.all([
        invoke<ModelInfo[]>('list_models'),
        invoke<ModelStatus>('get_model_info'),
        invoke<LlmConfig>('get_provider_settings'),
      ]);
      setModels(m);
      setStatus(s);
      setConfig(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const activate = async (model: ModelInfo) => {
    if (model.provider !== 'ollama') {
      const provider = model.provider as CloudProvider;
      const tab = CLOUD_TABS.find((item) => item.id === provider);
      const existingKey = tab && config ? String(config[tab.keyField] || '') : '';
      setActiveCloudTab(provider);
      setApiKeyDraft(existingKey);
      setKeyPrompt(model);
      return;
    }

    const key = `${model.provider}:${model.id}`;
    setActivating(key);
    try {
      await invoke('load_model', { modelId: model.id, provider: model.provider });
      await refresh();
    } catch (e) {
      alert(String(e));
    } finally {
      setActivating(null);
    }
  };

  const activateCloudModel = async () => {
    if (!config || !keyPrompt) return;
    const provider = keyPrompt.provider as CloudProvider;
    const key = `${keyPrompt.provider}:${keyPrompt.id}`;
    const nextKey = apiKeyDraft.trim();
    if (!nextKey) {
      alert(`Enter a ${providerLabel(provider)} API key to use this model.`);
      return;
    }

    const providerPayload = {
      provider,
      model: keyPrompt.id,
      openrouterApiKey: provider === 'openrouter' ? nextKey : config.openrouter_api_key,
      openrouterModel: provider === 'openrouter' ? keyPrompt.id : config.openrouter_model,
      openaiApiKey: provider === 'openai' ? nextKey : config.openai_api_key,
      openaiModel: provider === 'openai' ? keyPrompt.id : config.openai_model,
      nvidiaApiKey: provider === 'nvidia' ? nextKey : config.nvidia_api_key,
      nvidiaBaseUrl: config.nvidia_base_url || 'https://integrate.api.nvidia.com/v1',
      nvidiaModel: provider === 'nvidia' ? keyPrompt.id : config.nvidia_model,
    };

    setSaving(true);
    setActivating(key);
    try {
      await invoke('save_provider_settings', { payload: providerPayload });
      setKeyPrompt(null);
      setApiKeyDraft('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await refresh();
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
      setActivating(null);
    }
  };

  const localModels = models.filter((m) => m.provider === 'ollama');
  const cloudModels = models.filter((m) => m.provider === activeCloudTab);
  const active = models.find((m) => m.is_active);
  const activeLabel = active?.name ?? status?.current_model ?? config?.model;
  const currentCloudTab = CLOUD_TABS.find((tab) => tab.id === activeCloudTab);

  return (
    <div className="p-8 max-w-3xl space-y-8 page-transition">
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#4A3B45' }}>Settings</h1>
        <p style={{ color: '#7A6670' }}>Choose a local or cloud model. Cloud APIs are much faster.</p>
      </div>

      {/* Active model banner */}
      <section className="bg-gradient-to-r from-[#FF7EB6]/10 to-[#DDA0FF]/10 border border-[#FFD6E7] rounded-2xl p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#7A6670' }}>Active model</p>
        <p className="text-xl font-semibold flex items-center gap-2" style={{ color: '#4A3B45' }}>
          {loading ? (
            <>
              <Loader2 className="animate-spin text-[#FF7EB6]" size={22} />
              Loading model...
            </>
          ) : activeLabel ? (
            <>
              <Check className="text-[#FF7EB6]" size={22} />
              {activeLabel}
            </>
          ) : (
            'None selected'
          )}
        </p>
        <p className="text-sm mt-1" style={{ color: '#7A6670' }}>
          Provider: {status?.provider ?? '—'} · {status?.is_cloud ? 'Cloud (fast)' : 'Local Ollama'}
          {status && !status.ollama_running && !status.is_cloud && (
            <span className="text-red-500 font-medium"> · Ollama not running</span>
          )}
        </p>
      </section>

      {/* Local models */}
      <section className="glass-card p-6 border border-[#FFD6E7]">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2" style={{ color: '#4A3B45' }}>
          <Cpu size={20} className="text-[#FF7EB6]" /> Local models (Ollama)
        </h2>
        <p className="text-sm mb-4" style={{ color: '#7A6670' }}>
          Phi-3 is fastest on CPU. Pull with: <code className="bg-[#FFD6E7]/30 px-1 py-0.5 rounded text-[#4A3B45]">ollama pull phi3</code>
        </p>
        <ul className="space-y-2">
          {localModels.map((m) => (
            <ModelRow
              key={`${m.provider}-${m.id}`}
              model={m}
              activating={activating}
              onActivate={() => activate(m)}
            />
          ))}
        </ul>
      </section>

      {/* Cloud models */}
      <section className="glass-card p-6 border border-[#FFD6E7]">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2" style={{ color: '#4A3B45' }}>
          <Cloud size={20} className="text-[#DDA0FF]" /> Cloud models (fast)
        </h2>
        <p className="text-sm mb-4" style={{ color: '#7A6670' }}>
          Pick a provider, then click Use this. The app will ask for that provider's key and save it with the selected model.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4 rounded-xl bg-white/40 p-1 border border-[#FFD6E7]">
          {CLOUD_TABS.map((tab) => {
            const hasKey = Boolean(config?.[tab.keyField]);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCloudTab(tab.id)}
                className={clsx(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2',
                  activeCloudTab === tab.id
                    ? 'bg-white text-[#4A3B45] shadow-sm'
                    : 'text-[#7A6670] hover:bg-white/60'
                )}
              >
                {tab.label}
                {hasKey && <Check size={14} className="text-[#FF7EB6]" />}
              </button>
            );
          })}
        </div>

        {currentCloudTab && (
          <p className="text-xs mb-3" style={{ color: '#7A6670' }}>
            {currentCloudTab.keyHint}
          </p>
        )}

        <ul className="space-y-2 mb-6">
          {cloudModels.map((m) => (
            <ModelRow
              key={`${m.provider}-${m.id}`}
              model={m}
              activating={activating}
              onActivate={() => activate(m)}
            />
          ))}
        </ul>
        {saved && <p className="text-sm text-[#FF7EB6] font-medium">API key saved and model activated.</p>}
      </section>

      {keyPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md glass-card p-5 border border-[#FFD6E7]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#4A3B45' }}>
                  <KeyRound size={18} className="text-[#FF7EB6]" />
                  Use {keyPrompt.name}
                </h3>
                <p className="text-sm mt-1" style={{ color: '#7A6670' }}>
                  Enter your {providerLabel(keyPrompt.provider)} API key. It will be saved for this provider and this model will become active.
                </p>
              </div>
              <button
                onClick={() => setKeyPrompt(null)}
                className="p-2 rounded-lg hover:bg-white/60 transition-colors"
                aria-label="Close"
              >
                <X size={18} style={{ color: '#7A6670' }} />
              </button>
            </div>

            <ApiField
              label={`${providerLabel(keyPrompt.provider)} API key`}
              hint={providerHint(keyPrompt.provider)}
              value={apiKeyDraft}
              onChange={setApiKeyDraft}
              secret
            />

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setKeyPrompt(null)}
                className="px-4 py-2 rounded-lg bg-white/60 text-sm font-medium"
                style={{ color: '#7A6670' }}
              >
                Cancel
              </button>
              <button
                onClick={activateCloudModel}
                disabled={saving || activating === `${keyPrompt.provider}:${keyPrompt.id}`}
                className="flex items-center gap-2 btn-premium disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                Save key and use this
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModelRow({
  model,
  activating,
  onActivate,
}: {
  model: ModelInfo;
  activating: string | null;
  onActivate: () => void;
}) {
  const key = `${model.provider}:${model.id}`;
  const isLoading = activating === key;

  return (
    <li
      className={clsx(
        'flex items-center justify-between p-3 rounded-2xl border transition-colors',
        model.is_active
          ? 'bg-white/80 border-[#FF7EB6] shadow-sm'
          : 'bg-white/40 border-[#FFD6E7] hover:border-[#FF7EB6]'
      )}
    >
      <div className="min-w-0 flex-1 pr-3">
        <p className="font-medium flex items-center gap-2" style={{ color: '#4A3B45' }}>
          {model.name}
          {model.is_active && (
            <span className="text-xs bg-gradient-to-r from-[#FF7EB6] to-[#DDA0FF] text-white px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </p>
        <p className="text-xs truncate" style={{ color: '#7A6670' }}>{model.description}</p>
        {model.provider === 'ollama' && !model.is_installed && (
          <p className="text-xs text-red-500 font-medium mt-1">Not installed — run ollama pull {model.id.split(':')[0]}</p>
        )}
      </div>
      <button
        disabled={model.is_active || isLoading}
        onClick={onActivate}
        className={clsx(
          'shrink-0 text-sm px-3 py-1.5 rounded-lg font-medium transition-all',
          model.is_active
            ? 'bg-gray-200 text-gray-500 cursor-default'
            : 'btn-premium'
        )}
      >
        {isLoading ? <Loader2 className="animate-spin mx-auto" size={16} /> : model.is_active ? 'Active' : 'Use this'}
      </button>
    </li>
  );
}

function providerLabel(provider: string) {
  if (provider === 'openai') return 'OpenAI';
  if (provider === 'openrouter') return 'OpenRouter';
  if (provider === 'nvidia') return 'NVIDIA';
  return provider;
}

function providerHint(provider: string) {
  if (provider === 'openai') return 'https://platform.openai.com/api-keys';
  if (provider === 'openrouter') return 'https://openrouter.ai/keys';
  if (provider === 'nvidia') return 'https://build.nvidia.com';
  return undefined;
}

function ApiField({
  label,
  hint,
  value,
  onChange,
  secret,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  secret?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: '#7A6670' }}>{label}</label>
      {hint && <p className="text-xs mb-1 opacity-80" style={{ color: '#7A6670' }}>{hint}</p>}
      <input
        type={secret ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full input-soft"
      />
    </div>
  );
}
