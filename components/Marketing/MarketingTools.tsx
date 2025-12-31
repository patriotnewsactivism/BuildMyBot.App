import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Instagram, Megaphone, Loader, Copy, Check, FileText, Undo2, AlertCircle, LucideIcon } from 'lucide-react';
import { marketingService } from '../../services/marketingService';
import { MarketingContent, MarketingContentType } from '../../types';

type ToolConfig = {
  id: MarketingContentType;
  label: string;
  icon: LucideIcon;
  desc: string;
};

export const MarketingTools: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Professional');
  const [activeType, setActiveType] = useState<MarketingContentType>('email');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [templates, setTemplates] = useState<MarketingContent[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tools: ToolConfig[] = [
    { id: 'email', label: 'Email Campaign', icon: Mail, desc: 'Cold outreach, drip, or newsletters' },
    { id: 'ad', label: 'Ad Copy', icon: Megaphone, desc: 'Google/Meta headlines & bodies' },
    { id: 'blog', label: 'Blog Draft', icon: FileText, desc: 'Outline + intro paragraph' },
    { id: 'social', label: 'Social Post', icon: Instagram, desc: 'LinkedIn + X ready copy' },
  ];

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [selectedTemplateId, templates]
  );

  useEffect(() => {
    marketingService
      .listContent()
      .then(setTemplates)
      .catch((err: any) => setError(err?.message || 'Unable to load templates.'));
  }, []);

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setCopied(false);
    setGeneratedContent('');
    setError(null);

    try {
      const result = await marketingService.generateContent({
        type: activeType,
        topic,
        tone,
        templateId: selectedTemplate?.id,
        templateContent: selectedTemplate?.content,
      });

      setGeneratedContent(result.content);

      if (result.id) {
        setTemplates((prev) => {
          const existing = prev.filter((t) => t.id !== result.id);
          return [result, ...existing].slice(0, 15);
        });
        setSelectedTemplateId(result.id);
      }
    } catch (e: any) {
      setGeneratedContent('Error generating content. Please try again.');
      setError(e?.message || 'Generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setTopic((template.metadata as { topic?: string })?.topic || topic);
      setTone(((template.metadata as { tone?: string })?.tone as string) || tone);
      setGeneratedContent(template.content);
      setActiveType(template.contentType);
    }
  };

  const clearTemplate = () => {
    setSelectedTemplateId(null);
    setGeneratedContent('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">AI Marketing Suite</h2>
        <p className="text-slate-500">Generate high-converting copy in seconds using ai-complete with marketing variants.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-800 bg-red-50 border border-red-200 p-3 rounded-lg">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveType(t.id)}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between min-h-[100px] ${
              activeType === t.id
                ? 'border-blue-900 bg-blue-50 ring-1 ring-blue-900'
                : 'border-slate-200 bg-white hover:border-blue-300'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                activeType === t.id ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <t.icon size={16} />
            </div>
            <div>
              <div className="font-semibold text-slate-800 text-xs">{t.label}</div>
              <div className="text-[10px] text-slate-500 leading-tight mt-1">{t.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">What is this about?</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., New Summer Sale, Product Launch, Webinar Invite"
              className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tone of Voice</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
            >
              <option>Professional</option>
              <option>Friendly</option>
              <option>Urgent</option>
              <option>Witty</option>
              <option>Luxury</option>
            </select>
          </div>
        </div>

        {selectedTemplate && (
          <div className="border rounded-lg border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-700 space-y-2">
            <div className="flex justify-between items-center">
              <div className="font-semibold text-blue-900 text-sm">
                Reusing template: {selectedTemplate.title || selectedTemplate.contentType.toUpperCase()}
              </div>
              <button
                onClick={clearTemplate}
                className="text-xs text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
                type="button"
              >
                <Undo2 size={14} />
                Clear
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-[11px] text-slate-600 max-h-32 overflow-auto">
              {selectedTemplate.content}
            </pre>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!topic || loading}
          className="w-full bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-950 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader className="animate-spin" size={20} /> : <Megaphone size={20} />}
          Generate Content
        </button>
      </div>

      {templates.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Saved Templates</h3>
              <p className="text-xs text-slate-500">Use a previous asset as a starting point.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {templates.map((template) => (
              <div
                key={template.id || template.title}
                className={`border rounded-lg p-3 space-y-2 text-sm transition ${
                  template.id === selectedTemplateId ? 'border-blue-900 bg-blue-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="uppercase tracking-wide text-[10px] font-semibold">{template.contentType}</span>
                  <span>{template.createdAt ? new Date(template.createdAt).toLocaleDateString() : ''}</span>
                </div>
                <div className="font-semibold text-slate-800">{template.title || 'Untitled'}</div>
                <p className="text-xs text-slate-600 line-clamp-3">{template.content}</p>
                <button
                  onClick={() => handleUseTemplate(template.id)}
                  className="text-blue-800 hover:text-blue-950 text-xs font-medium"
                  type="button"
                >
                  Use as template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {generatedContent && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-medium text-slate-700">Generated Result</h3>
            <button onClick={copyToClipboard} className="text-sm text-blue-900 hover:text-blue-950 flex items-center gap-1">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
          </div>
          <div className="p-6 whitespace-pre-wrap text-slate-600 text-sm leading-relaxed">
            {generatedContent}
          </div>
        </div>
      )}
    </div>
  );
};
