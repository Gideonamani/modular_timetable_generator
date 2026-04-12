import * as React from "react";
import { Module } from "../types";
import { COLORS } from "../lib/constants";

export function useModules(initialModules: Module[]) {
  const [modules, setModules] = React.useState<Module[]>(initialModules);
  const [newModuleName, setNewModuleName] = React.useState('');
  const [newModuleDays, setNewModuleDays] = React.useState<number | ''>(1);
  const [newModuleInstructor, setNewModuleInstructor] = React.useState('');
  const [editingModuleId, setEditingModuleId] = React.useState<string | null>(null);

  const addModule = () => {
    if (!newModuleName.trim() || !newModuleDays || newModuleDays <= 0) return;
    const color = COLORS[modules.length % COLORS.length];
    setModules(prev => [...prev, {
      id: crypto.randomUUID(),
      name: newModuleName.trim(),
      days: Number(newModuleDays),
      color,
      instructor: newModuleInstructor.trim() || undefined,
    }]);
    setNewModuleName('');
    setNewModuleDays(1);
    setNewModuleInstructor('');
  };

  const updateModule = (id: string, updates: Partial<Module>) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeModule = (id: string) => {
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
    if (confirm('Are you sure you want to clear all modules?')) {
      setModules([]);
    }
  };

  return {
    modules, setModules,
    newModuleName, setNewModuleName,
    newModuleDays, setNewModuleDays,
    newModuleInstructor, setNewModuleInstructor,
    editingModuleId, setEditingModuleId,
    addModule, updateModule, removeModule, moveModule, duplicateModule, clearAllModules,
  };
}
