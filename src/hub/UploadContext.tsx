"use client";
import { createContext, useContext } from "react";

type UploadFn = (file: File, folder?: string) => Promise<{ url: string; path: string }>;

export const UploadContext = createContext<UploadFn | null>(null);
export const useUpload = () => useContext(UploadContext);
