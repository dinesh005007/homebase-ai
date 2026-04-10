"use client";

import { useRef, useState, useCallback } from "react";

export function useMediaCapture() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setAttachment(file);
      if (file.type.startsWith("image/")) {
        setPreview(URL.createObjectURL(file));
      } else {
        setPreview(null); // video or other — no thumbnail
      }
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    []
  );

  const openCamera = useCallback(() => {
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = "image/*";
    fileInputRef.current.capture = "environment";
    fileInputRef.current.click();
  }, []);

  const openGallery = useCallback(() => {
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = "image/*,video/*";
    fileInputRef.current.removeAttribute("capture");
    fileInputRef.current.click();
  }, []);

  const clearAttachment = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setAttachment(null);
    setPreview(null);
  }, [preview]);

  return {
    fileInputRef,
    attachment,
    preview,
    handleFileChange,
    openCamera,
    openGallery,
    clearAttachment,
  };
}
