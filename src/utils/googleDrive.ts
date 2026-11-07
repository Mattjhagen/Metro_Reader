import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory token cache (never stored in localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initDriveAuth = (
  onAuthChange: (user: User | null, token: string | null) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      onAuthChange(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        onAuthChange(user, null);
      }
    }
  });
};

export const signInWithGoogleDrive = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Google Drive access token from sign-in.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const signOutGoogleDrive = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

export interface DriveBookFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
}

/**
 * Lists books from Google Drive (.epub, .pdf, .docx, .txt, .md, Google Docs)
 */
export async function listGoogleDriveBooks(
  accessToken: string,
  searchQuery?: string
): Promise<DriveBookFile[]> {
  let q =
    "trashed = false and (name contains '.epub' or name contains '.pdf' or name contains '.docx' or name contains '.txt' or name contains '.md' or mimeType = 'application/pdf' or mimeType = 'application/epub+zip' or mimeType = 'application/vnd.google-apps.document')";

  if (searchQuery && searchQuery.trim()) {
    const escaped = searchQuery.replace(/'/g, "\\'");
    q = `trashed = false and name contains '${escaped}'`;
  }

  const fields = 'files(id, name, mimeType, size, modifiedTime, iconLink)';
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=${encodeURIComponent(fields)}&pageSize=30&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google Drive error HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Downloads a book file from Google Drive as a browser File object
 */
export async function downloadGoogleDriveBookFile(
  accessToken: string,
  fileId: string,
  fileName: string,
  mimeType: string
): Promise<File> {
  let downloadUrl: string;

  if (mimeType === 'application/vnd.google-apps.document') {
    // Export Google Doc as plain text
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    fileName = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
  } else {
    // Binary download for EPUB, PDF, DOCX, TXT
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  }

  const res = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download file from Google Drive (HTTP ${res.status})`);
  }

  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || mimeType });
}
