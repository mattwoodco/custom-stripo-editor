"use client";

import { Container } from "@/components/container";
import { StripoEditorCustomized } from "@/components/stripo-editor-customized";

export default function Home() {
  return (
    <Container>
      <div className="flex flex-col gap-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">
            Stripo Email Editor (Customized)
          </h1>
          <p className="text-gray-600">
            Customized editor with toolbar styling and theming...
          </p>
        </div>
        <StripoEditorCustomized createHelloWorldTemplate={true} />
      </div>
    </Container>
  );
}
