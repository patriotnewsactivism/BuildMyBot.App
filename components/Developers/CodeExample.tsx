import React, { useState } from 'react';
import { Copy, Check, ChevronDown } from 'lucide-react';

interface CodeExampleProps {
  title: string;
  language: 'javascript' | 'python' | 'curl' | 'json';
  code: string;
  description?: string;
}

const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  python: 'Python',
  curl: 'cURL',
  json: 'JSON',
};

const LANGUAGE_COLORS = {
  javascript: 'text-yellow-400',
  python: 'text-blue-400',
  curl: 'text-green-400',
  json: 'text-purple-400',
};

export const CodeExample: React.FC<CodeExampleProps> = ({
  title,
  language,
  code,
  description,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono font-bold ${LANGUAGE_COLORS[language]}`}>
            {LANGUAGE_LABELS[language]}
          </span>
          <span className="text-sm font-medium text-slate-800">{title}</span>
        </div>
        <ChevronDown
          size={18}
          className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200">
          {description && (
            <p className="px-4 py-3 text-sm text-slate-600 bg-slate-50 border-b border-slate-200">
              {description}
            </p>
          )}
          <div className="relative">
            <pre className="p-4 bg-slate-900 text-slate-300 text-sm font-mono overflow-x-auto">
              <code>{code}</code>
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check size={16} className="text-green-400" />
              ) : (
                <Copy size={16} className="text-slate-400" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface MultiCodeExampleProps {
  title: string;
  examples: {
    language: 'javascript' | 'python' | 'curl';
    code: string;
  }[];
  description?: string;
}

export const MultiCodeExample: React.FC<MultiCodeExampleProps> = ({
  title,
  examples,
  description,
}) => {
  const [activeLanguage, setActiveLanguage] = useState(examples[0]?.language || 'javascript');
  const [copied, setCopied] = useState(false);

  const activeExample = examples.find(e => e.language === activeLanguage) || examples[0];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeExample.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <div className="flex items-center justify-between p-4 bg-slate-50">
        <span className="text-sm font-medium text-slate-800">{title}</span>
        <div className="flex gap-1">
          {examples.map(example => (
            <button
              key={example.language}
              onClick={() => setActiveLanguage(example.language)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                activeLanguage === example.language
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-200'
              }`}
            >
              {LANGUAGE_LABELS[example.language]}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200">
        {description && (
          <p className="px-4 py-3 text-sm text-slate-600 bg-slate-50 border-b border-slate-200">
            {description}
          </p>
        )}
        <div className="relative">
          <pre className="p-4 bg-slate-900 text-slate-300 text-sm font-mono overflow-x-auto">
            <code>{activeExample.code}</code>
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check size={16} className="text-green-400" />
            ) : (
              <Copy size={16} className="text-slate-400" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeExample;
