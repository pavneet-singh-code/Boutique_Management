"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

export default function PdfUploader({ onFileSelect }) {
  const [dragging, setDragging] = useState(false);

  const validateFile = (file) => {
    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      alert("Please upload a PDF file.");
      return;
    }

    onFileSelect(file);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    validateFile(file);

    // Allows selecting the same file again
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files?.[0];

    validateFile(file);
  };

  return (
    <label
      htmlFor="pdf-upload"
      className="block cursor-pointer"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => {
        setDragging(false);
      }}
      onDrop={handleDrop}
    >
      <div
        className={`border-2 border-dashed rounded-2xl p-14 text-center transition ${
          dragging
            ? "border-[#1c1c1a] bg-white"
            : "border-[#d8d1c6] bg-white/50 hover:border-[#1c1c1a]"
        }`}
      >
        <div className="w-14 h-14 mx-auto rounded-full bg-[#1c1c1a] text-white flex items-center justify-center">
          <Upload size={22} />
        </div>

        <h2 className="text-lg font-medium mt-5">
          Upload your order PDF
        </h2>

        <p className="text-sm text-[#77736c] mt-2">
          Drag and drop your PDF here or click to browse
        </p>

        <p className="text-xs text-[#aaa49b] mt-4">
          Multiple pages are supported
        </p>

        <input
          id="pdf-upload"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </label>
  );
}