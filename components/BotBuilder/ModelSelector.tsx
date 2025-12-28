import React, { useState } from 'react';
import { Check, Zap, Brain, Clock, DollarSign, ChevronDown, Sparkles } from 'lucide-react';
import { AIModel, AIProvider } from '../../types';
import { AI_MODELS, getModelsByProvider } from '../../constants';

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  showCostEstimate?: boolean;
  estimatedMonthlyMessages?: number;
}

const PROVIDER_INFO: Record<AIProvider, { name: string; color: string; bgColor: string }> = {
  openai: { name: 'OpenAI', color: 'text-green-600', bgColor: 'bg-green-100' },
  anthropic: { name: 'Anthropic', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  google: { name: 'Google', color: 'text-blue-600', bgColor: 'bg-blue-100' },
};

const SPEED_ICONS: Record<string, React.ReactNode> = {
  fast: <Zap size={14} className="text-green-500" />,
  medium: <Clock size={14} className="text-amber-500" />,
  slow: <Brain size={14} className="text-purple-500" />,
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModelId,
  onSelectModel,
  showCostEstimate = true,
  estimatedMonthlyMessages = 1000,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<AIProvider | 'all'>('all');

  const selectedModel = AI_MODELS.find(m => m.id === selectedModelId) || AI_MODELS[1]; // Default to gpt-4o-mini

  const filteredModels = activeProvider === 'all'
    ? AI_MODELS
    : getModelsByProvider(activeProvider);

  const estimateMonthlyCost = (model: AIModel): number => {
    // Assume average 500 tokens per message (250 input, 250 output)
    const avgInputTokens = 250;
    const avgOutputTokens = 250;
    const inputCost = (estimatedMonthlyMessages * avgInputTokens / 1000) * model.inputCostPer1k;
    const outputCost = (estimatedMonthlyMessages * avgOutputTokens / 1000) * model.outputCostPer1k;
    return inputCost + outputCost;
  };

  const formatCost = (cost: number): string => {
    if (cost < 1) return `$${cost.toFixed(2)}`;
    return `$${cost.toFixed(0)}`;
  };

  const formatContextWindow = (tokens: number): string => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(0)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return `${tokens}`;
  };

  return (
    <div className="relative">
      {/* Selected Model Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${PROVIDER_INFO[selectedModel.provider].bgColor}`}>
            <Sparkles size={18} className={PROVIDER_INFO[selectedModel.provider].color} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">{selectedModel.name}</span>
              {selectedModel.tier === 'premium' && (
                <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                  Premium
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className={PROVIDER_INFO[selectedModel.provider].color}>
                {PROVIDER_INFO[selectedModel.provider].name}
              </span>
              <span>•</span>
              <span>{formatContextWindow(selectedModel.contextWindow)} context</span>
            </div>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {/* Provider Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              onClick={() => setActiveProvider('all')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeProvider === 'all'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Models
            </button>
            {(['openai', 'anthropic', 'google'] as AIProvider[]).map(provider => (
              <button
                key={provider}
                onClick={() => setActiveProvider(provider)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeProvider === provider
                    ? `${PROVIDER_INFO[provider].color} border-b-2 border-current bg-white`
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {PROVIDER_INFO[provider].name}
              </button>
            ))}
          </div>

          {/* Model List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredModels.map(model => {
              const isSelected = model.id === selectedModelId;
              const monthlyCost = estimateMonthlyCost(model);

              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-3 text-left hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className={`p-2 rounded-lg ${PROVIDER_INFO[model.provider].bgColor} shrink-0`}>
                    <Sparkles size={16} className={PROVIDER_INFO[model.provider].color} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">{model.name}</span>
                      {model.tier === 'premium' && (
                        <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                          Premium
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mb-2 line-clamp-2">
                      {model.description}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        {SPEED_ICONS[model.speed]}
                        <span className="capitalize">{model.speed}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Brain size={14} />
                        <span>{formatContextWindow(model.contextWindow)}</span>
                      </div>
                      {showCostEstimate && (
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} />
                          <span>~{formatCost(monthlyCost)}/mo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="shrink-0 p-1 bg-blue-500 rounded-full text-white">
                      <Check size={14} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Cost Estimate Footer */}
          {showCostEstimate && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <DollarSign size={12} />
                <span>
                  Cost estimates based on ~{estimatedMonthlyMessages.toLocaleString()} messages/month
                  (500 tokens avg)
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
