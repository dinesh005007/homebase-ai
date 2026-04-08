"use client";

import { useState } from "react";

const API_URL = "http://localhost:8000/api/v1";

interface AskSource {
  title: string;
  page: number | null;
  similarity: number;
}

interface AskResult {
  answer: string;
  sources: AskSource[];
  model_used: string;
  latency_ms: number;
}

export default function Home() {
  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("warranty");
  const [propertyId, setPropertyId] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  // Chat state
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [asking, setAsking] = useState(false);

  const handleUpload = async () => {
    if (!file || !propertyId || !title) return;
    setUploading(true);
    setUploadStatus("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("property_id", propertyId);
    formData.append("doc_type", docType);
    formData.append("title", title);

    try {
      const res = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadStatus(`Processed: ${data.chunks_created} chunks indexed`);
      } else {
        setUploadStatus(`Error: ${data.detail || "Upload failed"}`);
      }
    } catch (err) {
      setUploadStatus(`Error: ${err instanceof Error ? err.message : "Network error"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async () => {
    if (!question || !propertyId) return;
    setAsking(true);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, property_id: propertyId }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setResult({
          answer: `Error: ${data.detail || "Request failed"}`,
          sources: [],
          model_used: "none",
          latency_ms: 0,
        });
      }
    } catch (err) {
      setResult({
        answer: `Error: ${err instanceof Error ? err.message : "Network error"}`,
        sources: [],
        model_used: "none",
        latency_ms: 0,
      });
    } finally {
      setAsking(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">HomeBase AI</h1>
        <p className="mt-2 text-gray-500">Week Zero</p>
      </div>

      {/* Property ID */}
      <div className="mb-8">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Property ID (UUID)
        </label>
        <input
          type="text"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          placeholder="paste property UUID from seed script"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Upload Section */}
      <section className="mb-10 rounded-lg border border-gray-200 p-6">
        <h2 className="mb-4 text-lg font-semibold">Upload Document</h2>
        <div className="space-y-3">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="warranty">Warranty</option>
            <option value="insurance">Insurance</option>
            <option value="hoa">HOA</option>
            <option value="closing">Closing</option>
            <option value="manual">Manual</option>
            <option value="other">Other</option>
          </select>
          <button
            onClick={handleUpload}
            disabled={uploading || !file || !propertyId || !title}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Processing..." : "Upload & Process"}
          </button>
          {uploadStatus && (
            <p className="text-sm font-medium text-green-700">{uploadStatus}</p>
          )}
        </div>
      </section>

      {/* Chat Section */}
      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="mb-4 text-lg font-semibold">Ask a Question</h2>
        <div className="space-y-3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Is grout cracking covered under warranty?"
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleAsk}
            disabled={asking || !question || !propertyId}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {asking ? "Thinking..." : "Ask"}
          </button>
        </div>

        {result && (
          <div className="mt-6 space-y-3">
            <div className="rounded-md bg-gray-50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {result.answer}
              </p>
            </div>
            {result.sources.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.sources.map((src, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                  >
                    {src.title}
                    {src.page != null && `, p.${src.page}`}
                    {" "}({src.similarity.toFixed(2)})
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400">
              Model: {result.model_used} | Latency: {result.latency_ms}ms
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
