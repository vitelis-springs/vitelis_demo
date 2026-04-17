"use client";

import "vanilla-jsoneditor/themes/jse-theme-dark.css";
import { useEffect, useRef } from "react";
import type { JsonEditor as JsonEditorInstance, Content } from "vanilla-jsoneditor";

interface JsonEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  height?: string | number;
}

export default function JsonEditor({ value, onChange, height = "calc(90vh - 300px)" }: JsonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<JsonEditorInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const lastEditorStr = useRef<string>(value ?? "");
  // prevents echoing editor-initiated changes back to the editor
  const skipSync = useRef(false);

  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;
    let mounted = true;

    import("vanilla-jsoneditor").then(({ createJSONEditor }) => {
      if (!mounted || !containerRef.current) return;

      const initialStr = lastEditorStr.current;
      let content: Content;
      try {
        content = { json: initialStr ? JSON.parse(initialStr) : {} };
      } catch {
        content = { text: initialStr };
      }

      editorRef.current = createJSONEditor({
        target: containerRef.current,
        props: {
          content,
          mode: "tree",
          onChange(newContent: Content) {
            let str: string;
            if ("text" in newContent && typeof newContent.text === "string") {
              str = newContent.text;
            } else if ("json" in newContent) {
              try {
                str = JSON.stringify(newContent.json, null, 2);
              } catch {
                str = "";
              }
            } else {
              str = "";
            }
            skipSync.current = true;
            lastEditorStr.current = str;
            onChangeRef.current?.(str);
          },
        },
      });
    });

    return () => {
      mounted = false;
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  // Sync external value changes (e.g. from form.setFieldValue or webhook response)
  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    if (!editorRef.current || value === lastEditorStr.current) return;

    lastEditorStr.current = value ?? "";
    let content: Content;
    try {
      content = { json: value ? JSON.parse(value) : {} };
    } catch {
      content = { text: value ?? "" };
    }
    editorRef.current.updateProps({ content });
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="jse-theme-dark"
      style={{
        height,
        minHeight: 300,
        border: "1px solid #303030",
        borderRadius: 6,
        overflow: "hidden",
      }}
    />
  );
}
