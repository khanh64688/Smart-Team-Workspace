import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Edit3, Globe, Lock } from 'lucide-react';
import { api } from '../../lib/api';
import type { Project, ProjectVisibility } from '../../types/api';

import { useToast } from '../../context/ToastContext';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null; // If passed, we are editing. If null, we are creating.
  onSuccess: (project: Project) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onSuccess,
}) => {
  const { showSuccess } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ProjectVisibility>('PRIVATE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!project;

  useEffect(() => {
    if (isOpen) {
      if (project) {
        setName(project.name);
        setDescription(project.description || '');
        setVisibility(project.visibility || 'PRIVATE');
      } else {
        setName('');
        setDescription('');
        setVisibility('PRIVATE');
      }
      setError(null);
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let res;
      if (isEditMode && project) {
        res = await api.put<Project>(`/projects/${project.id}`, {
          name: name.trim(),
          description: description.trim() || null,
          visibility,
        });
        showSuccess('Cập nhật thông tin dự án thành công!');
      } else {
        res = await api.post<Project>('/projects', {
          name: name.trim(),
          description: description.trim() || null,
          visibility,
        });
        showSuccess('Tạo dự án mới thành công!');
      }
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      if (err.response?.data?.error?.message) {
        setError(err.response.data.error.message);
      } else if (typeof err.response?.data?.detail === 'string') {
        setError(err.response.data.detail);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(`Failed to ${isEditMode ? 'update' : 'create'} project. Please check backend connection.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-gray-800 p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              {isEditMode ? <Edit3 className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
            </div>
            <h3 className="text-lg font-bold text-white">
              {isEditMode ? 'Edit Project Settings' : 'Create New Project'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Project Name *</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Thương mại điện tử"
              className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief project goal or assignment topic..."
              className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Visibility Access</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility('PUBLIC')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                  visibility === 'PUBLIC'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold">PUBLIC</p>
                  <p className="text-[10px] text-gray-400">Accessible by workspace members</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('PRIVATE')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                  visibility === 'PRIVATE'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold">PRIVATE</p>
                  <p className="text-[10px] text-gray-400">Restricted to added members</p>
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

