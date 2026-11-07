import { get, set } from 'idb-keyval';
import { AppSettings, Book, Bookmark } from '../types';
import { generateDemoAudioBlob } from './elevenLabsApi';

const BOOKS_STORAGE_KEY = 'metro_reader_audiobooks_v3';
const SETTINGS_STORAGE_KEY = 'metro_reader_settings_v3';

export const DEFAULT_SETTINGS: AppSettings = {
  elevenLabsApiKey: '',
  useElevenLabs: false,
  selectedVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
  selectedVoiceName: 'Rachel',
  selectedModelId: 'eleven_multilingual_v2',
  voiceSettings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.15,
    use_speaker_boost: true,
  },
  accentColor: '#00e5ff',
  playbackSpeed: 1.0,
  autoPlayNextChapter: true,
  sleepTimerMinutes: null,
};

export async function loadBooks(): Promise<Book[]> {
  let books = await get<Book[]>(BOOKS_STORAGE_KEY);
  if (!books || books.length === 0) {
    books = await createInitialSampleBooks();
    await saveBooks(books);
  }

  // ALWAYS re-create fresh object URLs for all chapters with an audioBlob
  return books.map((book) => ({
    ...book,
    bookmarks: book.bookmarks || [],
    progressPercent: book.progressPercent ?? calculateBookProgress(book),
    chapters: book.chapters.map((ch) => {
      let freshUrl = ch.audioUrl;
      if (ch.audioBlob) {
        try {
          freshUrl = URL.createObjectURL(ch.audioBlob);
        } catch {
          freshUrl = undefined;
        }
      }
      return {
        ...ch,
        audioUrl: freshUrl,
      };
    }),
  }));
}

export function calculateBookProgress(book: Book): number {
  if (!book.chapters || book.chapters.length === 0) return 0;
  const currentCh = book.currentChapterIndex || 0;
  const chDuration = book.chapters[currentCh]?.duration || 100;
  const pos = book.playbackPosition || 0;
  const currentChapterFraction = Math.min(1, pos / chDuration);
  const total = (currentCh + currentChapterFraction) / book.chapters.length;
  return Math.min(100, Math.max(0, Math.round(total * 100)));
}

export async function saveBooks(books: Book[]): Promise<void> {
  // Strip transient object URLs before saving to avoid storing stale revoked URLs
  const storable = books.map((b) => ({
    ...b,
    chapters: b.chapters.map((ch) => ({
      ...ch,
      audioUrl: undefined, // Fresh URLs will be created on load from audioBlob
    })),
  }));
  await set(BOOKS_STORAGE_KEY, storable);
}

export async function saveBookProgress(
  bookId: string,
  chapterIndex: number,
  playbackPosition: number
): Promise<void> {
  const books = await loadBooks();
  const updated = books.map((b) => {
    if (b.id === bookId) {
      const updatedBook = {
        ...b,
        currentChapterIndex: chapterIndex,
        playbackPosition,
        lastPlayedAt: Date.now(),
      };
      return {
        ...updatedBook,
        progressPercent: calculateBookProgress(updatedBook),
      };
    }
    return b;
  });
  await saveBooks(updated);
}

export async function addBookmarkToBook(
  bookId: string,
  chapterIndex: number,
  timestamp: number,
  note?: string
): Promise<Bookmark> {
  const books = await loadBooks();
  const targetBook = books.find((b) => b.id === bookId);
  const chapterTitle = targetBook?.chapters[chapterIndex]?.title || `Chapter ${chapterIndex + 1}`;

  const bookmark: Bookmark = {
    id: 'bm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    bookId,
    chapterIndex,
    chapterTitle,
    timestamp: Math.round(timestamp),
    note: note?.trim() || undefined,
    createdAt: Date.now(),
  };

  const updatedBooks = books.map((b) => {
    if (b.id === bookId) {
      const existing = b.bookmarks || [];
      return {
        ...b,
        bookmarks: [bookmark, ...existing],
      };
    }
    return b;
  });

  await saveBooks(updatedBooks);
  return bookmark;
}

export async function removeBookmarkFromBook(bookId: string, bookmarkId: string): Promise<void> {
  const books = await loadBooks();
  const updatedBooks = books.map((b) => {
    if (b.id === bookId) {
      return {
        ...b,
        bookmarks: (b.bookmarks || []).filter((bm) => bm.id !== bookmarkId),
      };
    }
    return b;
  });
  await saveBooks(updatedBooks);
}

export async function loadSettings(): Promise<AppSettings> {
  const settings = await get<AppSettings>(SETTINGS_STORAGE_KEY);
  return { ...DEFAULT_SETTINGS, ...settings };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await set(SETTINGS_STORAGE_KEY, settings);
}

async function createInitialSampleBooks(): Promise<Book[]> {
  // Pre-generate audio blobs for all initial sample chapters
  const [tmAudio1, tmAudio2, shAudio1, shAudio2] = await Promise.all([
    generateDemoAudioBlob('The Time Traveller was expounding a recondite matter to us.', 45),
    generateDemoAudioBlob('The glittering metallic framework was scarcely larger than a small clock.', 45),
    generateDemoAudioBlob('To Sherlock Holmes she is always the woman.', 45),
    generateDemoAudioBlob('At three o clock precisely I was at Baker Street.', 45),
  ]);

  const timeMachine: Book = {
    id: 'sample_timemachine',
    title: 'The Time Machine',
    author: 'H. G. Wells',
    format: 'sample',
    coverUrl: '/src/assets/images/book_cover_timemachine_1794063074915.jpg',
    totalWords: 3240,
    totalChars: 18920,
    createdAt: Date.now() - 86400000 * 2,
    currentChapterIndex: 0,
    playbackPosition: 0,
    progressPercent: 20,
    isFullyConverted: true,
    bookmarks: [
      {
        id: 'bm_sample_1',
        bookId: 'sample_timemachine',
        chapterIndex: 0,
        chapterTitle: 'Chapter 1: The Principle of Time',
        timestamp: 8,
        note: 'Filby discusses the fourth dimension',
        createdAt: Date.now() - 3600000,
      },
    ],
    chapters: [
      {
        id: 'tm_ch1',
        title: 'Chapter 1: The Principle of Time',
        text: `The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us. His grey eyes shone and twinkled, and his usually pale face was flushed and animated. The fire burnt brightly, and the soft radiance of the incandescent lights in the lilies of silver caught the bubbles that flashed and passed in our glasses.

"You must follow me carefully. I shall have to controvert one or two ideas that are almost universally accepted. The geometry, for instance, they taught you at school is founded on a misconception."

"Is not that rather a large thing to expect us to begin upon?" said Filby, an argumentative person with red hair.

"I do not mean to ask you to accept anything without reasonable ground for it. You will soon admit as much as I need from you. You know of course that a mathematical line, a line of thickness nil, has no real existence. They taught you that? Nor has a mathematical plane. These things are mere abstractions."

"That is all right," said the Psychologist.

"Nor, having only length, breadth, and thickness, can a cube have a real existence."

"There I object," said Filby. "Of course a solid body may exist. All real things—"

"So most people think. But wait a moment. Can an instantaneous cube exist?"

"Don't follow you," said Filby.

"Can a cube that does not exist for any time at all, have a real existence?"

Filby became pensive. "Clearly," the Time Traveller proceeded, "any real body must have extension in four directions: it must have Length, Breadth, Thickness, and—Duration. But through a natural infirmity of the flesh, which I will explain to you in a moment, we incline to overlook this fact. There are really four dimensions, three which we call the three planes of Space, and a fourth, Time."`,
        wordCount: 1620,
        charCount: 9460,
        audioBlob: tmAudio1,
        audioUrl: URL.createObjectURL(tmAudio1),
        duration: 45,
        isConverted: true,
      },
      {
        id: 'tm_ch2',
        title: 'Chapter 2: The Machine Disappears',
        text: `The thing the Time Traveller held in his hand was a glittering metallic framework, scarcely larger than a small clock, and very delicately made. There was ivory in it, and some transparent crystalline substance. And now I must be plain, for what followed, unless his explanation is to be accepted, is an unaccountable thing. He took one of the small octagonal tables that were scattered about the room, and set it in front of the fire, with two legs on the hearthrug. On this table he placed the mechanism. Then he drew up a chair, and sat down. The only other object on the table was a small shaded lamp, the bright light of which fell upon the model.

"This little affair," said the Time Traveller, resting his elbows upon the table and pressing his hands together above the apparatus, "is only a model. It is my plan for a machine to travel through time. You will notice that it looks singularly askew, and that there is an odd twinkling appearance about this bar, as though it were in some way unreal." He pointed to the part with his finger. "Also, here is one little white lever, and here is another."

The Medical Man got up out of his chair and peered into the thing. "It's beautifully made," he said.

"It took two years to make," retorted the Time Traveller. Then, when we had all imitated the Medical Man, he said: "Now I want you clearly to understand that this lever, being pressed over, sends the machine gliding into the future, and this other reverses the motion."`,
        wordCount: 1620,
        charCount: 9460,
        audioBlob: tmAudio2,
        audioUrl: URL.createObjectURL(tmAudio2),
        duration: 45,
        isConverted: true,
      },
    ],
  };

  const sherlock: Book = {
    id: 'sample_sherlock',
    title: 'A Scandal in Bohemia',
    author: 'Arthur Conan Doyle',
    format: 'sample',
    coverUrl: '/src/assets/images/book_cover_sherlock_1794063073940.jpg',
    totalWords: 4180,
    totalChars: 24200,
    createdAt: Date.now() - 86400000 * 5,
    currentChapterIndex: 0,
    playbackPosition: 0,
    progressPercent: 0,
    bookmarks: [],
    isFullyConverted: true,
    chapters: [
      {
        id: 'sh_ch1',
        title: 'Chapter 1: The Bohemian King',
        text: `To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind. He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position.

He never spoke of the softer passions, save with a gibe and a sneer. They were admirable things for the observer—excellent for drawing the veil from men's motives and actions. But for the trained reasoner to admit such intrusions into his own delicate and finely adjusted temperament was to introduce a distracting factor which might throw a doubt upon all his mental results.

I had seen little of Holmes lately. My marriage had drifted us away from each other. My own complete happiness, and the home-centred interests which rise up around the man who first finds himself master of his own establishment, were sufficient to absorb all my attention; while Holmes, who loathed every form of society with his whole Bohemian soul, remained in our lodgings in Baker Street, buried among his old books, and alternating from week to week between cocaine and ambition, the drowsiness of the drug, and the fierce energy of his own keen nature.`,
        wordCount: 2090,
        charCount: 12100,
        audioBlob: shAudio1,
        audioUrl: URL.createObjectURL(shAudio1),
        duration: 45,
        isConverted: true,
      },
      {
        id: 'sh_ch2',
        title: 'Chapter 2: Irene Adler',
        text: `At three o'clock precisely I was at Baker Street, but Holmes had not yet returned. The landlady informed me that he had left the house shortly after eight o'clock in the morning. I sat down beside the fire, however, with the intention of awaiting him, however long he might be. I was already deeply interested in his inquiry, for, though it was surrounded by none of the grim and strange features which were associated with the two crimes which I have already recorded, still, the nature of the case and the exalted station of his client gave it a character of its own.

Indeed, apart from the nature of the investigation which my friend had on hand, there was something in his masterly grasp of a situation, and his keen, incisive reasoning, which made it a pleasure to me to study his system of work, and to follow the quick, subtle methods by which he disentangled the most inextricable mysteries.

It was close upon four before the door opened, and a drunken-looking groom, ill-kempt and side-whiskered, with an inflamed face and disreputable clothes, walked into the room. Accustomed as I was to my friend's amazing powers in the use of disguises, I had to look at him twice before I was certain that it was indeed he.`,
        wordCount: 2090,
        charCount: 12100,
        audioBlob: shAudio2,
        audioUrl: URL.createObjectURL(shAudio2),
        duration: 45,
        isConverted: true,
      },
    ],
  };

  return [timeMachine, sherlock];
}
