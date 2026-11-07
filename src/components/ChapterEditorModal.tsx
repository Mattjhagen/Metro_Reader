import React, { useState } from 'react';
import { Book, Chapter } from '../types';
import {
  Scissors,
  Edit2,
  Trash2,
  Combine,
  ArrowUp,
  ArrowDown,
  Plus,
  Check,
  X,
  AlertCircle,
  FileText,
  Save,
} from 'lucide-react';

interface ChapterEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  onUpdateBook: (updatedBook: Book) => void;
  accentColor: string;
}

export const ChapterEditorModal: React.FC<ChapterEditorModalProps> = ({
  isOpen,
  onClose,
  book,
  onUpdateBook,
  accentColor,
}) => {
  // Editing state
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  // Splitting state
  const [splittingChapter, setSplittingChapter] = useState<Chapter | null>(null);
  const [splitPart1Title, setSplitPart1Title] = useState<string>('');
  const [splitPart2Title, setSplitPart2Title] = useState<string>('');
  const [splitTextPart1, setSplitTextPart1] = useState<string>('');
  const [splitTextPart2, setSplitTextPart2] = useState<string>('');
  const [splitCursorPos, setSplitCursorPos] = useState<number>(0);

  // Adding new chapter state
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newChapterTitle, setNewChapterTitle] = useState<string>('');
  const [newChapterText, setNewChapterText] = useState<string>('');

  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const showNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Helper to commit book changes
  const commitUpdatedChapters = (newChapters: Chapter[]) => {
    const totalWords = newChapters.reduce((sum, ch) => sum + ch.wordCount, 0);
    const totalChars = newChapters.reduce((sum, ch) => sum + ch.charCount, 0);
    const isFullyConverted = newChapters.every((ch) => ch.isConverted);

    // Keep active chapter in bounds
    const currentChapterIndex = Math.min(
      book.currentChapterIndex,
      Math.max(0, newChapters.length - 1)
    );

    const updatedBook: Book = {
      ...book,
      chapters: newChapters,
      totalWords,
      totalChars,
      isFullyConverted,
      currentChapterIndex,
    };

    onUpdateBook(updatedBook);
  };

  // 1. Rename Chapter
  const handleStartRename = (ch: Chapter) => {
    setEditingChapterId(ch.id);
    setEditingTitle(ch.title);
  };

  const handleSaveRename = (chapterId: string) => {
    if (!editingTitle.trim()) return;
    const newChapters = book.chapters.map((ch) =>
      ch.id === chapterId ? { ...ch, title: editingTitle.trim() } : ch
    );
    commitUpdatedChapters(newChapters);
    setEditingChapterId(null);
    showNotify('Chapter renamed successfully.');
  };

  // 2. Open Splitter View
  const handleOpenSplitter = (ch: Chapter) => {
    setSplittingChapter(ch);
    setSplitPart1Title(`${ch.title} (Part 1)`);
    setSplitPart2Title(`${ch.title} (Part 2)`);

    // Default 50/50 split at paragraph
    const midpoint = Math.floor(ch.text.length / 2);
    let splitIndex = ch.text.indexOf('\n\n', midpoint);
    if (splitIndex === -1) {
      splitIndex = ch.text.indexOf('. ', midpoint);
      if (splitIndex !== -1) splitIndex += 1;
    }
    if (splitIndex === -1) splitIndex = midpoint;

    const p1 = ch.text.substring(0, splitIndex).trim();
    const p2 = ch.text.substring(splitIndex).trim();

    setSplitTextPart1(p1);
    setSplitTextPart2(p2);
  };

  // Re-split at custom cursor position in textarea
  const handleSplitAtCursor = (cursorIndex: number) => {
    if (!splittingChapter) return;
    const p1 = splittingChapter.text.substring(0, cursorIndex).trim();
    const p2 = splittingChapter.text.substring(cursorIndex).trim();
    setSplitTextPart1(p1);
    setSplitTextPart2(p2);
    showNotify(`Split point set at character ${cursorIndex}`);
  };

  // Save Split
  const handleConfirmSplit = () => {
    if (!splittingChapter || !splitTextPart1.trim() || !splitTextPart2.trim()) return;

    const chIndex = book.chapters.findIndex((c) => c.id === splittingChapter.id);
    if (chIndex === -1) return;

    const words1 = splitTextPart1.split(/\s+/).filter(Boolean).length;
    const words2 = splitTextPart2.split(/\s+/).filter(Boolean).length;

    const part1: Chapter = {
      id: 'ch_' + Date.now() + '_1',
      title: splitPart1Title.trim() || 'Part 1',
      text: splitTextPart1.trim(),
      wordCount: words1,
      charCount: splitTextPart1.length,
      isConverted: false, // Reset conversion for re-split chapters
    };

    const part2: Chapter = {
      id: 'ch_' + Date.now() + '_2',
      title: splitPart2Title.trim() || 'Part 2',
      text: splitTextPart2.trim(),
      wordCount: words2,
      charCount: splitTextPart2.length,
      isConverted: false,
    };

    const newChapters = [...book.chapters];
    newChapters.splice(chIndex, 1, part1, part2);
    commitUpdatedChapters(newChapters);
    setSplittingChapter(null);
    showNotify(`Split "${splittingChapter.title}" into 2 chapters.`);
  };

  // 3. Merge Chapter with Next
  const handleMergeWithNext = (index: number) => {
    if (index >= book.chapters.length - 1) return;
    const ch1 = book.chapters[index];
    const ch2 = book.chapters[index + 1];

    if (!confirm(`Merge "${ch1.title}" and "${ch2.title}" into a single chapter?`)) {
      return;
    }

    const mergedText = `${ch1.text}\n\n${ch2.text}`;
    const words = mergedText.split(/\s+/).filter(Boolean).length;

    const mergedChapter: Chapter = {
      id: ch1.id,
      title: `${ch1.title} & ${ch2.title}`,
      text: mergedText,
      wordCount: words,
      charCount: mergedText.length,
      isConverted: false,
    };

    const newChapters = [...book.chapters];
    newChapters.splice(index, 2, mergedChapter);
    commitUpdatedChapters(newChapters);
    showNotify(`Merged chapters successfully.`);
  };

  // 4. Delete Chapter
  const handleDeleteChapter = (index: number) => {
    if (book.chapters.length <= 1) {
      alert('A book must have at least one chapter.');
      return;
    }
    const target = book.chapters[index];
    if (!confirm(`Delete "${target.title}"?`)) return;

    const newChapters = book.chapters.filter((_, i) => i !== index);
    commitUpdatedChapters(newChapters);
    showNotify(`Deleted "${target.title}".`);
  };

  // 5. Reorder Chapters
  const handleMoveChapter = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= book.chapters.length) return;

    const newChapters = [...book.chapters];
    const [moved] = newChapters.splice(index, 1);
    newChapters.splice(targetIndex, 0, moved);
    commitUpdatedChapters(newChapters);
  };

  // 6. Add Manual Chapter
  const handleCreateNewChapter = () => {
    if (!newChapterTitle.trim() || !newChapterText.trim()) {
      alert('Please enter both a chapter title and text content.');
      return;
    }

    const words = newChapterText.trim().split(/\s+/).filter(Boolean).length;
    const newCh: Chapter = {
      id: 'ch_' + Date.now(),
      title: newChapterTitle.trim(),
      text: newChapterText.trim(),
      wordCount: words,
      charCount: newChapterText.length,
      isConverted: false,
    };

    const newChapters = [...book.chapters, newCh];
    commitUpdatedChapters(newChapters);
    setNewChapterTitle('');
    setNewChapterText('');
    setIsAddingNew(false);
    showNotify(`Added "${newCh.title}".`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-2xl bg-[#111111] border-2 border-neutral-700 text-white p-6 space-y-5 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-neutral-800 pb-3">
          <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-400">
            AUDIOBOOK STRUCTURE EDITOR
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <div>
              <h3 className="text-xl font-light text-white">Edit Chapters: {book.title}</h3>
              <p className="text-xs text-neutral-400">
                Rename, re-split, merge, or reorder chapters if the auto-parser separated them incorrectly.
              </p>
            </div>
            <button
              onClick={() => setIsAddingNew(true)}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5 shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Chapter</span>
            </button>
          </div>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            className="p-2.5 text-black text-xs font-semibold uppercase tracking-wider flex items-center justify-between animate-in fade-in"
            style={{ backgroundColor: accentColor }}
          >
            <span>{notification}</span>
            <button onClick={() => setNotification(null)}>✕</button>
          </div>
        )}

        {/* SPLITTER INTERFACE (Active when splitting a chapter) */}
        {splittingChapter ? (
          <div className="p-4 bg-black border border-neutral-800 space-y-4 flex-1 overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  RE-SPLIT CHAPTER: "{splittingChapter.title}"
                </span>
              </div>
              <button
                onClick={() => setSplittingChapter(null)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-neutral-400 font-light leading-relaxed">
              Place your cursor inside the text where you want the split to occur and click <strong>"Split at Cursor"</strong>, or edit the split texts directly:
            </p>

            {/* Original Text with Cursor Selection */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Click inside text to set split point
              </label>
              <textarea
                defaultValue={splittingChapter.text}
                onSelect={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  setSplitCursorPos(target.selectionStart);
                }}
                rows={6}
                className="w-full bg-[#141414] border border-neutral-800 text-neutral-200 p-2.5 text-xs font-mono leading-relaxed focus:outline-none focus:border-white selection:bg-cyan-900"
              />
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-neutral-500 font-mono text-[11px]">
                  Cursor position: char {splitCursorPos.toLocaleString()}
                </span>
                <button
                  onClick={() => handleSplitAtCursor(splitCursorPos)}
                  disabled={splitCursorPos <= 0 || splitCursorPos >= splittingChapter.text.length}
                  className="px-3 py-1 bg-cyan-950 text-cyan-300 border border-cyan-700 text-xs font-bold uppercase tracking-wider hover:bg-cyan-900 disabled:opacity-40"
                >
                  Split at Cursor
                </button>
              </div>
            </div>

            {/* Part 1 & Part 2 Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Part 1 */}
              <div className="space-y-2 p-3 bg-[#161616] border border-neutral-800">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span className="font-bold uppercase tracking-wider text-white">NEW CHAPTER 1</span>
                  <span>{splitTextPart1.split(/\s+/).filter(Boolean).length} words</span>
                </div>
                <input
                  type="text"
                  value={splitPart1Title}
                  onChange={(e) => setSplitPart1Title(e.target.value)}
                  placeholder="Part 1 Title"
                  className="w-full bg-black border border-neutral-700 text-white px-2 py-1.5 text-xs focus:outline-none focus:border-white"
                />
                <textarea
                  value={splitTextPart1}
                  onChange={(e) => setSplitTextPart1(e.target.value)}
                  rows={4}
                  className="w-full bg-black border border-neutral-800 text-neutral-300 p-2 text-xs font-mono leading-relaxed focus:outline-none"
                />
              </div>

              {/* Part 2 */}
              <div className="space-y-2 p-3 bg-[#161616] border border-neutral-800">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span className="font-bold uppercase tracking-wider text-white">NEW CHAPTER 2</span>
                  <span>{splitTextPart2.split(/\s+/).filter(Boolean).length} words</span>
                </div>
                <input
                  type="text"
                  value={splitPart2Title}
                  onChange={(e) => setSplitPart2Title(e.target.value)}
                  placeholder="Part 2 Title"
                  className="w-full bg-black border border-neutral-700 text-white px-2 py-1.5 text-xs focus:outline-none focus:border-white"
                />
                <textarea
                  value={splitTextPart2}
                  onChange={(e) => setSplitTextPart2(e.target.value)}
                  rows={4}
                  className="w-full bg-black border border-neutral-800 text-neutral-300 p-2 text-xs font-mono leading-relaxed focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSplittingChapter(null)}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border border-neutral-800 text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSplit}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-black shadow-lg"
                style={{ backgroundColor: accentColor }}
              >
                Apply Split & Update Book
              </button>
            </div>
          </div>
        ) : isAddingNew ? (
          /* ADD NEW CHAPTER VIEW */
          <div className="p-4 bg-black border border-neutral-800 space-y-3 flex-1 overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                ADD NEW CHAPTER
              </span>
              <button
                onClick={() => setIsAddingNew(false)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-400 uppercase font-semibold">
                Chapter Title
              </label>
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="e.g. Chapter 3: The Return"
                className="w-full bg-[#161616] border border-neutral-800 text-white p-2.5 text-xs focus:outline-none focus:border-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-400 uppercase font-semibold">
                Chapter Text
              </label>
              <textarea
                value={newChapterText}
                onChange={(e) => setNewChapterText(e.target.value)}
                rows={8}
                placeholder="Paste or type chapter text here..."
                className="w-full bg-[#161616] border border-neutral-800 text-white p-2.5 text-xs font-mono focus:outline-none focus:border-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddingNew(false)}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border border-neutral-800 text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewChapter}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-black shadow-lg"
                style={{ backgroundColor: accentColor }}
              >
                Save New Chapter
              </button>
            </div>
          </div>
        ) : (
          /* CHAPTER LIST VIEW */
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-900 border border-neutral-800 min-h-64 no-scrollbar">
            {book.chapters.map((ch, idx) => {
              const isEditing = editingChapterId === ch.id;
              const isLast = idx === book.chapters.length - 1;

              return (
                <div
                  key={ch.id}
                  className="p-3.5 hover:bg-[#161616] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* Left: Title & Word Count */}
                  <div className="min-w-0 flex-1 space-y-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(ch.id);
                            if (e.key === 'Escape') setEditingChapterId(null);
                          }}
                          className="flex-1 bg-black border border-neutral-600 text-white px-2 py-1 text-xs focus:outline-none focus:border-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(ch.id)}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                          title="Save title"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingChapterId(null)}
                          className="p-1 text-neutral-500 hover:text-white"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-neutral-400">
                          {(idx + 1).toString().padStart(2, '0')}.
                        </span>
                        <span className="text-sm text-white font-medium truncate">
                          {ch.title}
                        </span>
                        {ch.isConverted && (
                          <span
                            className="text-[9px] font-bold uppercase px-1.5 py-0.2 text-black"
                            style={{ backgroundColor: accentColor }}
                          >
                            Audio Ready
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                      <span>{ch.wordCount.toLocaleString()} words</span>
                      <span>·</span>
                      <span>{ch.charCount.toLocaleString()} chars</span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {/* Rename Button */}
                    <button
                      onClick={() => handleStartRename(ch)}
                      className="p-1.5 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 transition-colors"
                      title="Rename Chapter"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Split Button */}
                    <button
                      onClick={() => handleOpenSplitter(ch)}
                      className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-400 border border-cyan-900 hover:border-cyan-600 flex items-center gap-1"
                      title="Split Chapter into Two"
                    >
                      <Scissors className="w-3 h-3" />
                      <span>Split</span>
                    </button>

                    {/* Merge With Next Button */}
                    {!isLast && (
                      <button
                        onClick={() => handleMergeWithNext(idx)}
                        className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 border border-neutral-800 hover:border-neutral-600 hover:text-white flex items-center gap-1"
                        title="Merge with next chapter"
                      >
                        <Combine className="w-3 h-3" />
                        <span>Merge</span>
                      </button>
                    )}

                    {/* Move Up */}
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMoveChapter(idx, 'up')}
                      className="p-1.5 text-neutral-500 hover:text-white disabled:opacity-20"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Move Down */}
                    <button
                      disabled={isLast}
                      onClick={() => handleMoveChapter(idx, 'down')}
                      className="p-1.5 text-neutral-500 hover:text-white disabled:opacity-20"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteChapter(idx)}
                      className="p-1.5 text-neutral-500 hover:text-red-400"
                      title="Delete Chapter"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-2 flex justify-between items-center text-xs text-neutral-500 border-t border-neutral-900">
          <span>{book.chapters.length} chapters · {book.totalWords.toLocaleString()} total words</span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-black transition-opacity"
            style={{ backgroundColor: accentColor }}
          >
            Done Editing
          </button>
        </div>
      </div>
    </div>
  );
};
