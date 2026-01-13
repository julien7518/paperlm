# PaperLM

![PaperLM](/public/preview.png)

[Live website here](https://paperlm.vercel.app)

**PaperLM** is a privacy-first, browser-based AI research assistant for generating literature reviews from scientific papers. Using WebLLM and Transformers.js, it provides a complete local solution for academic research without cloud dependencies.

## 🎯 Key Features

- **Local AI Execution**: Runs Llama 3.2 1B or other models directly in the browser
- **Document Analysis**: Upload and process PDFs with semantic search
- **Context-Aware Responses**: Uses RAG to ground answers in your documents
- **Privacy-First**: All processing happens client-side - no data leaves your device
- **Academic Writing**: Professional responses with Markdown and LaTeX support
- **Literature Review Generation**: One-click "Lit Review" button for comprehensive analysis
- **Source Citations**: Automatic citation of document sources in responses

## 🚀 Quick Start

The application is hosted on Vercel. Simply visit the [live website](https://paperlm.vercel.app) to start using PaperLM immediately.

For local development:

```bash
git clone https://github.com/julien7518/paperlm
cd paperlm

npm install
npm run dev
```

## 📚 How It Works

1. **Upload Documents**: Drag and drop PDF files into the sidebar
2. **Process Documents**: Automatic chunking and embedding generation
3. **Ask Questions**: Get answers grounded in your uploaded papers with source citations
4. **Generate Literature Reviews**: Click the "Lit Review" button for comprehensive analysis
5. **Export Results**: Download conversations as JSON files

## 🔧 Technical Stack

- **Framework**: Next.js 16, React 19
- **LLM Engine**: MLC WebLLM (Llama 3.2 1B)
- **Embeddings**: Hugging Face Transformers (all-MiniLM-L6-v2)
- **PDF Processing**: PDF.js
- **UI**: Radix UI, Tailwind CSS

## 💡 Key Components

- **Document Processing**: PDF extraction → chunking → embedding → semantic search
- **LLM Integration**: WebLLM with streaming responses and context injection
- **State Management**: Singleton pattern for document store with React hooks

## ⚠️ Performance Notes

- **Model Loading**: ~1-2 minutes on first run
- **Memory**: ~1GB RAM required
- **Browser Requirements**: Modern browser with WebAssembly support
- **WebGPU**: Recommended for best performance

## 🛠️ Development

Key files:

- `app/page.tsx` - Main application
- `lib/document-processing/` - Document pipeline
- `lib/hooks/useWebLLM.ts` - LLM integration
- `lib/hooks/useDocumentProcessing.ts` - Document processing

## 🌟 Roadmap

- [ ] Source Citation Improvements: Better document referencing and citation formatting
- [ ] Document Metadata Extraction: Automatic extraction of titles, authors, dates
- [ ] Multiple Document Types: Support for DOCX, LaTeX, and other formats
- [ ] Mobile Optimization: Better mobile device support
- [ ] Voice Interaction: Speech-to-text and text-to-speech capabilities

## 🤝 Contributing

Contributions welcome! Follow existing code style and submit PRs to the `dev` branch.

## 📄 License

Under MIT License. See [License file](LICENSE.md)

---

**PaperLM** - Your local AI literature review assistant for academic research.
