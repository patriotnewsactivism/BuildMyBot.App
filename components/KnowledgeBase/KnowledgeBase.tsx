'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/Auth/AuthProvider';

interface KnowledgeBaseFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: 'processing' | 'completed' | 'failed';
  chunks_count?: number;
  created_at: string;
}

interface KnowledgeBaseProps {
  botId: string;
}

export default function KnowledgeBase({ botId }: KnowledgeBaseProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<KnowledgeBaseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadFiles();
  }, [botId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/knowledge-base/files?botId=${botId}`);

      if (!response.ok) {
        throw new Error('Failed to load files');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
      ];

      if (!allowedTypes.includes(file.type)) {
        setError('File type not supported. Please upload PDF, DOCX, TXT, or MD files.');
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum size is 10MB.');
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('botId', botId);

      const response = await fetch('/api/knowledge-base/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      // Reset and reload
      setSelectedFile(null);
      await loadFiles();

      // Poll for processing completion
      setTimeout(() => loadFiles(), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`/api/knowledge-base/files?fileId=${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      await loadFiles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      processing: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-2">Knowledge Base</h2>
        <p className="text-gray-600 mb-6">
          Upload documents to train your bot with custom knowledge. The bot will use this information to answer questions.
        </p>

        {/* Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Document
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileSelect}
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              <p className="mt-2 text-xs text-gray-500">
                Supported formats: PDF, DOCX, TXT, MD (max 10MB)
              </p>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">{selectedFile.name}</span>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Uploaded Files</h3>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No files uploaded yet. Upload a document to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {file.file_type.includes('pdf') && (
                          <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 18h12V6h-4V2H4v16zm-2 1V0h12l4 4v16H2v-1z"/>
                          </svg>
                        )}
                        {file.file_type.includes('word') && (
                          <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 18h12V6h-4V2H4v16zm-2 1V0h12l4 4v16H2v-1z"/>
                          </svg>
                        )}
                        {(file.file_type.includes('text') || file.file_type.includes('markdown')) && (
                          <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 18h12V6h-4V2H4v16zm-2 1V0h12l4 4v16H2v-1z"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{file.file_name}</p>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-sm text-gray-500">
                            {formatFileSize(file.file_size)}
                          </span>
                          {file.chunks_count && (
                            <span className="text-sm text-gray-500">
                              {file.chunks_count} chunks
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            {new Date(file.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getStatusBadge(file.status)}
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                      title="Delete file"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Upload documents containing information about your business, products, or services</li>
          <li>• The system automatically processes and chunks your documents</li>
          <li>• AI creates embeddings for semantic search</li>
          <li>• Your bot will reference this information when answering questions</li>
          <li>• Sources are cited in responses for transparency</li>
        </ul>
      </div>
    </div>
  );
}
