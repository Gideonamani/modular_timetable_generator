import * as React from "react";
import { Module } from "../types";
import { COLORS } from "../lib/constants";

export function useModules(initialModules: Module[]) {
  const [modules, setModules] = React.useState<Module[]>(initialModules);
  const [newModuleName, setNewModuleName] = React.useState('');
  const [newModuleDays, setNewModuleDays] = React.useState<number | ''>(1);
  const [newModuleInstructor, setNewModuleInstructor] = React.useState('');
  const [newModuleColor, setNewModuleColor] = React.useState('');
  const [newModuleHasExamDay, setNewModuleHasExamDay] = React.useState(true);
  const [newModuleType, setNewModuleType] = React.useState<'module' | 'gap'>('module');
  const [editingModuleId, setEditingModuleId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState('');
  const [undoSnapshot, setUndoSnapshot] = React.useState<Module[] | null>(null);

  const addModule = () => {
    if (!newModuleName.trim()) {
      setFormError('Module name is required.');
      return;
    }
    if (!newModuleDays || newModuleDays <= 0 || !Number.isInteger(Number(newModuleDays))) {
      setFormError('Days must be a positive whole number.');
      return;
    }
    setFormError('');
    const GAP_COLOR = '#e5e7eb';
    const color = newModuleType === 'gap'
      ? GAP_COLOR
      : (newModuleColor || COLORS[modules.length % COLORS.length]);
    setModules(prev => [...prev, {
      id: crypto.randomUUID(),
      name: newModuleName.trim(),
      days: Number(newModuleDays),
      color,
      instructor: newModuleInstructor.trim() || undefined,
      hasExamDay: newModuleType === 'gap' ? false : newModuleHasExamDay,
      type: newModuleType,
    }]);
    setNewModuleName('');
    setNewModuleDays(1);
    setNewModuleInstructor('');
    setNewModuleColor('');
    setNewModuleHasExamDay(true);
    setNewModuleType('module');
    setFormError('');
  };

  const updateModule = (id: string, updates: Partial<Module>) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeModule = (id: string) => {
    setUndoSnapshot(modules);
    setModules(prev => prev.filter(m => m.id !== id));
  };

  const duplicateModule = (id: string) => {
    setModules(prev => {
      const module = prev.find(m => m.id === id);
      if (!module) return prev;
      return [...prev, { ...module, id: crypto.randomUUID(), name: `${module.name} (Copy)` }];
    });
  };

  const moveModule = (id: string, direction: 'up' | 'down') => {
    setModules(prev => {
      const index = prev.findIndex(m => m.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const clearAllModules = () => {
    setUndoSnapshot(modules);
    setModules([]);
  };

  const undoLastDelete = () => {
    if (undoSnapshot !== null) {
      setModules(undoSnapshot);
      setUndoSnapshot(null);
    }
  };

  const reorderModules = (activeId: string, overId: string) => {
    setModules(prev => {
      const oldIndex = prev.findIndex(m => m.id === activeId);
      const newIndex = prev.findIndex(m => m.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return next;
    });
  };

  return {
    modules, setModules,
    newModuleName, setNewModuleName,
    newModuleDays, setNewModuleDays,
    newModuleInstructor, setNewModuleInstructor,
    newModuleColor, setNewModuleColor,
    newModuleHasExamDay, setNewModuleHasExamDay,
    newModuleType, setNewModuleType,
    editingModuleId, setEditingModuleId,
    formError,
    canUndo: undoSnapshot !== null,
    addModule, updateModule, removeModule, moveModule, reorderModules, duplicateModule, clearAllModules, undoLastDelete,
  };
}
