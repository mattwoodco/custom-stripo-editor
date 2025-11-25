"use client";

import { Container } from "@/components/container";
import { StripoEditorCustomized } from "@/components/stripo-editor-customized";

export default function Home() {
  return (
    <Container>
      <div className="flex flex-col gap-4">
        <h1 className="font-bold">Custom Stripo Email Editor</h1>
        <StripoEditorCustomized createHelloWorldTemplate={true} />
      </div>
    </Container>
  );
}
