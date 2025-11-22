"use client";

import { StripoEditorSimple } from "@/components/stripo-editor-simple";

export default function EditorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">Stripo Email Editor</h1>
          <p className="text-gray-600">
            Create and edit your email templates with Stripo Editor
          </p>
        </div>
        <StripoEditorSimple />
      </div>
    </div>
  );
}

