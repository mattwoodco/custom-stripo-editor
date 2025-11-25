"use client";

import { Container } from "@/components/container";
import { StripoEditor } from "@/components/stripo-editor";

export default function DefaultPage() {
  return (
    <Container>
      <div className="flex flex-col gap-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">
            Stripo Email Editor (Default)
          </h1>
          <p className="text-gray-600">
            Creating a new "Hello World" email template...
          </p>
        </div>
        <StripoEditor createHelloWorldTemplate={true} />
      </div>
    </Container>
  );
}
