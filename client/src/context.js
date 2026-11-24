import { createContext, useContext } from 'react';

export const DocCtx = createContext({ docId: null, readOnly: false });
export const MarksCtx = createContext({ nodes: {}, edges: {} });
export const useDoc = () => useContext(DocCtx);
export const useMarks = () => useContext(MarksCtx);
