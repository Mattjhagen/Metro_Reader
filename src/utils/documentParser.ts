import JSZip from 'jszip';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { Book, Chapter } from '../types';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export async function parseBookFile(file: File): Promise<Book> {
  const nameExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeExtension: Record<string, string> = {
    'application/epub+zip': 'epub',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/markdown': 'md',
    'text/plain': 'txt',
  };
  const extension = file.name.includes('.') ? nameExtension : mimeExtension[file.type] || 'txt';
  const fileId = 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  let title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  let author = 'Unknown Author';
  let chapters: Chapter[] = [];
  let coverUrl: string | undefined = undefined;

  switch (extension) {
    case 'epub': {
      const epubData = await parseEpub(file);
      if (epubData.title) title = epubData.title;
      if (epubData.author) author = epubData.author;
      if (epubData.coverUrl) coverUrl = epubData.coverUrl;
      chapters = epubData.chapters;
      break;
    }

    case 'pdf': {
      const pdfData = await parsePdf(file);
      if (pdfData.title) title = pdfData.title;
      chapters = pdfData.chapters;
      break;
    }

    case 'docx': {
      const docxData = await parseDocx(file);
      chapters = docxData.chapters;
      break;
    }

    case 'txt':
    case 'md':
    case 'markdown':
    case 'html':
    case 'htm':
    default: {
      const textContent = await file.text();
      chapters = splitTextIntoChapters(textContent, title);
      break;
    }
  }

  // Fallback: If no chapters detected, create Chapter 1
  if (chapters.length === 0) {
    chapters = [
      {
        id: 'ch_1',
        title: 'Full Book Text',
        text: 'No text extracted.',
        wordCount: 0,
        charCount: 0,
        isConverted: false,
      },
    ];
  }

  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  const totalChars = chapters.reduce((sum, ch) => sum + ch.charCount, 0);

  const formatType: Book['format'] =
    extension === 'pdf'
      ? 'pdf'
      : extension === 'epub'
      ? 'epub'
      : extension === 'docx'
      ? 'docx'
      : extension === 'md'
      ? 'md'
      : 'txt';

  return {
    id: fileId,
    title,
    author,
    format: formatType,
    coverUrl,
    fileSize: file.size,
    totalWords,
    totalChars,
    chapters,
    createdAt: Date.now(),
    currentChapterIndex: 0,
    playbackPosition: 0,
    isFullyConverted: false,
    bookmarks: [],
    progressPercent: 0,
  };
}

/**
 * EPUB Parser using JSZip
 */
async function parseEpub(file: File): Promise<{
  title?: string;
  author?: string;
  coverUrl?: string;
  chapters: Chapter[];
}> {
  const zip = await JSZip.loadAsync(file);

  // 1. Locate rootfile from META-INF/container.xml
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  let opfPath = 'content.opf';

  if (containerXml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(containerXml, 'application/xml');
    const rootfile = doc.querySelector('rootfile');
    if (rootfile) {
      opfPath = rootfile.getAttribute('full-path') || 'content.opf';
    }
  }

  // 2. Read OPF file
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error('Invalid EPUB: package OPF file not found');
  }

  const opfXml = await opfFile.async('text');
  const parser = new DOMParser();
  const opfDoc = parser.parseFromString(opfXml, 'application/xml');

  const titleNode = opfDoc.querySelector('dc\\:title, title');
  const authorNode = opfDoc.querySelector('dc\\:creator, creator');

  const title = titleNode?.textContent?.trim() || file.name.replace(/\.epub$/i, '');
  const author = authorNode?.textContent?.trim() || 'Unknown Author';

  // Opf folder directory for relative paths
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // 3. Extract Manifest & Spine
  const manifestMap = new Map<string, { href: string; mediaType: string; properties?: string }>();
  const itemNodes = opfDoc.querySelectorAll('manifest > item');
  let coverHref: string | null = null;

  itemNodes.forEach((node) => {
    const id = node.getAttribute('id');
    const href = node.getAttribute('href');
    const mediaType = node.getAttribute('media-type');
    const properties = node.getAttribute('properties');
    if (id && href) {
      manifestMap.set(id, { href, mediaType: mediaType || '', properties: properties || '' });

      if (properties?.includes('cover-image') || id.toLowerCase().includes('cover')) {
        coverHref = href;
      }
    }
  });

  // Extract Cover image if available
  let coverUrl: string | undefined = undefined;
  if (coverHref) {
    const fullCoverPath = opfDir + coverHref;
    const coverZipFile = zip.file(fullCoverPath) || zip.file(coverHref);
    if (coverZipFile) {
      const coverBlob = await coverZipFile.async('blob');
      coverUrl = URL.createObjectURL(coverBlob);
    }
  }

  // Spine items in reading order
  const spineItemrefs = opfDoc.querySelectorAll('spine > itemref');
  const chapters: Chapter[] = [];

  for (let i = 0; i < spineItemrefs.length; i++) {
    const idref = spineItemrefs[i].getAttribute('idref');
    if (!idref) continue;

    const manifestEntry = manifestMap.get(idref);
    if (!manifestEntry) continue;

    const fullChapterPath = opfDir + manifestEntry.href;
    const chapterZipFile = zip.file(fullChapterPath) || zip.file(manifestEntry.href);
    if (!chapterZipFile) continue;

    const htmlContent = await chapterZipFile.async('text');
    const htmlDoc = parser.parseFromString(htmlContent, 'text/html');

    // Extract title from heading or title tag
    const h1 = htmlDoc.querySelector('h1, h2, h3, title');
    const chapterTitle = h1?.textContent?.trim() || `Chapter ${chapters.length + 1}`;

    // Clean plain text
    // Remove scripts, styles, navs
    htmlDoc.querySelectorAll('script, style, nav, noscript').forEach((el) => el.remove());
    const rawText = htmlDoc.body ? htmlDoc.body.innerText || htmlDoc.body.textContent || '' : '';
    const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    // Skip empty or tiny chapters (e.g. 10 chars copyright or blank pages)
    if (cleanText.length > 80) {
      const words = cleanText.split(/\s+/).filter(Boolean).length;
      chapters.push({
        id: `ch_${i + 1}`,
        title: chapterTitle.length > 60 ? chapterTitle.substring(0, 60) + '...' : chapterTitle,
        text: cleanText,
        wordCount: words,
        charCount: cleanText.length,
        isConverted: false,
      });
    }
  }

  // If no spine chapters had enough text, fallback to all xhtml files
  if (chapters.length === 0) {
    const xhtmlFiles = Object.keys(zip.files).filter((name) =>
      /\.(xhtml|html|htm)$/i.test(name)
    );
    for (let i = 0; i < xhtmlFiles.length; i++) {
      const text = await zip.files[xhtmlFiles[i]].async('text');
      const doc = parser.parseFromString(text, 'text/html');
      const clean = doc.body?.innerText?.trim() || '';
      if (clean.length > 50) {
        chapters.push({
          id: `ch_${i + 1}`,
          title: `Section ${i + 1}`,
          text: clean,
          wordCount: clean.split(/\s+/).filter(Boolean).length,
          charCount: clean.length,
          isConverted: false,
        });
      }
    }
  }

  return { title, author, coverUrl, chapters };
}

/**
 * PDF Parser using pdfjs-dist
 */
async function parsePdf(file: File): Promise<{
  title?: string;
  chapters: Chapter[];
}> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullBookText = '';
  const pageTexts: { pageNum: number; text: string }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim();

    if (pageText.length > 0) {
      pageTexts.push({ pageNum: i, text: pageText });
      fullBookText += pageText + '\n\n';
    }
  }

  // Try to group pages into logical chapters (~10 pages or ~3,000 words each)
  const chapters: Chapter[] = [];
  const wordsPerPage = fullBookText.split(/\s+/).filter(Boolean).length;

  if (pdf.numPages <= 8 || wordsPerPage < 4000) {
    // Single chapter or short document
    chapters.push({
      id: 'ch_1',
      title: 'Full Document',
      text: fullBookText.trim(),
      wordCount: wordsPerPage,
      charCount: fullBookText.length,
      isConverted: false,
    });
  } else {
    // Group into chunks of 8-10 pages
    const PAGES_PER_CHAPTER = 8;
    for (let i = 0; i < pageTexts.length; i += PAGES_PER_CHAPTER) {
      const chunk = pageTexts.slice(i, i + PAGES_PER_CHAPTER);
      const chunkText = chunk.map((p) => p.text).join('\n\n').trim();
      const firstPageNum = chunk[0].pageNum;
      const lastPageNum = chunk[chunk.length - 1].pageNum;
      const chWords = chunkText.split(/\s+/).filter(Boolean).length;

      chapters.push({
        id: `ch_${Math.floor(i / PAGES_PER_CHAPTER) + 1}`,
        title: `Pages ${firstPageNum}–${lastPageNum}`,
        text: chunkText,
        wordCount: chWords,
        charCount: chunkText.length,
        isConverted: false,
      });
    }
  }

  return { chapters };
}

/**
 * DOCX Parser using Mammoth
 */
async function parseDocx(file: File): Promise<{ chapters: Chapter[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const rawText = result.value || '';
  const chapters = splitTextIntoChapters(rawText, file.name);
  return { chapters };
}

/**
 * Splits plain text into chapters by detecting headings or size boundaries
 */
function splitTextIntoChapters(rawText: string, fallbackTitle: string): Chapter[] {
  const clean = rawText.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  // Match common chapter patterns: "Chapter 1", "CHAPTER I", "## Chapter", "Part 1"
  const chapterRegex =
    /(?:^|\n)(?:#{1,3}\s+|CHAPTER\s+[0-9IVXLCDM]+|Chapter\s+[0-9IVXLCDM]+|Book\s+[0-9IVXLCDM]+|Act\s+[0-9IVXLCDM]+|Scene\s+[0-9IVXLCDM]+)[^\n]*/gi;

  const matches = [...clean.matchAll(chapterRegex)];

  if (matches.length >= 2) {
    const chapters: Chapter[] = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const startIndex = match.index! + match[0].indexOf(match[0].trim());
      const endIndex =
        i + 1 < matches.length ? matches[i + 1].index! : clean.length;

      const headerLine = match[0].replace(/^#+\s*/, '').trim();
      const bodyText = clean.substring(startIndex, endIndex).trim();
      const words = bodyText.split(/\s+/).filter(Boolean).length;

      if (bodyText.length > 50) {
        chapters.push({
          id: `ch_${i + 1}`,
          title: headerLine.length > 60 ? headerLine.substring(0, 60) + '...' : headerLine,
          text: bodyText,
          wordCount: words,
          charCount: bodyText.length,
          isConverted: false,
        });
      }
    }

    if (chapters.length > 0) {
      return chapters;
    }
  }

  // Fallback: Partition by word count chunks (~2,500 words per chapter)
  const paragraphs = clean.split(/\n\s*\n+/);
  const chapters: Chapter[] = [];
  let currentText = '';
  let currentWords = 0;
  let chIndex = 1;

  for (const para of paragraphs) {
    const pWords = para.split(/\s+/).filter(Boolean).length;
    if (currentWords + pWords > 2500 && currentText.length > 0) {
      chapters.push({
        id: `ch_${chIndex}`,
        title: `Chapter ${chIndex}`,
        text: currentText.trim(),
        wordCount: currentWords,
        charCount: currentText.length,
        isConverted: false,
      });
      chIndex++;
      currentText = para;
      currentWords = pWords;
    } else {
      currentText += (currentText ? '\n\n' : '') + para;
      currentWords += pWords;
    }
  }

  if (currentText.trim().length > 0) {
    chapters.push({
      id: `ch_${chIndex}`,
      title: chapters.length === 0 ? fallbackTitle : `Chapter ${chIndex}`,
      text: currentText.trim(),
      wordCount: currentWords,
      charCount: currentText.length,
      isConverted: false,
    });
  }

  return chapters;
}
