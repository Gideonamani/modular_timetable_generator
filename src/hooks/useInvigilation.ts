import * as React from "react";
import { Invigilator, SessionAssignment } from "../types";

export function useInvigilation(
  initialInvigilators: Invigilator[] = [],
  initialAssignments: Record<string, SessionAssignment> = {}
) {
  const [invigilators, setInvigilators] = React.useState<Invigilator[]>(initialInvigilators);
  const [assignments, setAssignments] = React.useState<Record<string, SessionAssignment>>(initialAssignments);

  const addInvigilator = React.useCallback((name: string, role?: string) => {
    const id = crypto.randomUUID();
    setInvigilators(prev => [...prev, { id, name: name.trim(), role: role?.trim() || undefined }]);
  }, []);

  const removeInvigilator = React.useCallback((id: string) => {
    setInvigilators(prev => prev.filter(i => i.id !== id));
    setAssignments(prev => {
      const updated: Record<string, SessionAssignment> = {};
      for (const key in prev) {
        const a = prev[key];
        updated[key] = {
          ...a,
          leadInvigilatorId: a.leadInvigilatorId === id ? undefined : a.leadInvigilatorId,
          additionalInvigilatorIds: a.additionalInvigilatorIds?.filter(iid => iid !== id),
        };
      }
      return updated;
    });
  }, []);

  const updateAssignment = React.useCallback((sessionKey: string, patch: Partial<SessionAssignment>) => {
    setAssignments(prev => ({
      ...prev,
      [sessionKey]: { ...prev[sessionKey], ...patch },
    }));
  }, []);

  return {
    invigilators, setInvigilators,
    assignments, setAssignments,
    addInvigilator, removeInvigilator, updateAssignment,
  };
}
