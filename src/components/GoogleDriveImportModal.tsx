import React, { useState, useEffect } from 'react';
import {
  signInWithGoogleDrive,
  signOutGoogleDrive,
  getDriveAccessToken,
  listGoogleDriveBooks,
  downloadGoogleDriveBookFile,
  DriveBookFile,
} from '../utils/googleDrive';
import { User } from 'firebase/auth';
import { Cloud, Search, Download, RefreshCw, X, FileText, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';

interface GoogleDriveImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportBookFile: (file: File) => Promise<void>;
  accentColor: string;
}

export const GoogleDriveImportModal: React.FC<GoogleDriveImportModalProps> = ({
  isOpen,
  onClose,
  onImportBookFile,
  accentColor,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [driveFiles, setDriveFiles] = useState<DriveBookFile[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [importingFileId, setImportingFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const activeToken = getDriveAccessToken();
      if (activeToken) {
        setToken(activeToken);
        loadFiles(activeToken);
      }
    }
  }, [isOpen]);

  const loadFiles = async (authToken: string, query?: string) => {
    setIsLoadingFiles(true);
    setError(null);
    try {
      const files = await listGoogleDriveBooks(authToken, query);
      setDriveFiles(files);
    } catch (err: any) {
      setError(err.message || 'Failed to list Google Drive files.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const res = await signInWithGoogleDrive();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        await loadFiles(res.accessToken);
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in was cancelled or failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOutGoogleDrive();
    setUser(null);
    setToken(null);
    setDriveFiles([]);
  };

  const handleSelectDriveFile = async (fileItem: DriveBookFile) => {
    if (!token) return;
    setImportingFileId(fileItem.id);
    setError(null);
    try {
      const file = await downloadGoogleDriveBookFile(
        token,
        fileItem.id,
        fileItem.name,
        fileItem.mimeType
      );
      await onImportBookFile(file);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to download and parse book from Drive.');
    } finally {
      setImportingFileId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-[#111111] border-2 border-neutral-700 text-white p-6 space-y-5 shadow-2xl relative max-h-[90vh] flex flex-col">
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
            GOOGLE DRIVE CLOUD IMPORT
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div
              className="w-10 h-10 flex items-center justify-center shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              <Cloud className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-xl font-light text-white">Import from Google Drive</h3>
              <p className="text-xs text-neutral-400">
                Browse and download EPUB, PDF, DOCX, TXT books with permission from your account
              </p>
            </div>
          </div>
        </div>

        {/* Not Signed In View */}
        {!token ? (
          <div className="py-8 text-center space-y-6">
            <p className="text-xs text-neutral-300 max-w-sm mx-auto leading-relaxed">
              Connect your Google Drive account to import books directly into Metro Reader for VoiceStudio audiobook conversion.
            </p>

            {/* Official Google Sign-in Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="bg-white hover:bg-neutral-100 text-[#1f1f1f] px-5 py-3 text-sm font-semibold flex items-center gap-3 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isSigningIn ? 'Connecting to Drive...' : 'Sign in with Google'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Signed In View: File Browser */
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            {/* Account bar & search */}
            <div className="flex items-center justify-between text-xs text-neutral-400 bg-black p-2 border border-neutral-800">
              <span className="truncate">Connected to Google Drive</span>
              <button
                onClick={handleSignOut}
                className="text-red-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && token) {
                      loadFiles(token, searchQuery);
                    }
                  }}
                  placeholder="Search book title or author in Drive..."
                  className="w-full bg-black border border-neutral-800 text-white pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-white"
                />
              </div>
              <button
                onClick={() => token && loadFiles(token, searchQuery)}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wider border border-neutral-700 hover:border-white text-neutral-200 shrink-0"
              >
                Search
              </button>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-900 border border-neutral-800 min-h-48 max-h-64 no-scrollbar">
              {isLoadingFiles ? (
                <div className="p-8 text-center text-xs text-neutral-400 space-y-2">
                  <RefreshCw className="w-5 h-5 mx-auto animate-spin" style={{ color: accentColor }} />
                  <div>Searching Google Drive for books...</div>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500 space-y-1">
                  <div>No book files (.epub, .pdf, .docx, .txt) found in Drive.</div>
                  <div className="text-[11px] text-neutral-600">
                    Try searching with another keyword above.
                  </div>
                </div>
              ) : (
                driveFiles.map((file) => {
                  const isImporting = importingFileId === file.id;
                  const sizeMb = file.size
                    ? `${(parseInt(file.size) / (1024 * 1024)).toFixed(1)} MB`
                    : '';

                  return (
                    <div
                      key={file.id}
                      onClick={() => !isImporting && handleSelectDriveFile(file)}
                      className="p-3 hover:bg-[#1a1a1a] cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText
                          className="w-5 h-5 shrink-0"
                          style={{ color: accentColor }}
                        />
                        <div className="truncate">
                          <div className="text-xs text-white font-medium truncate group-hover:text-cyan-400 transition-colors">
                            {file.name}
                          </div>
                          <div className="text-[10px] text-neutral-500 flex items-center gap-2 mt-0.5">
                            <span>{file.mimeType.split('.').pop() || 'file'}</span>
                            {sizeMb && <span>· {sizeMb}</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        disabled={isImporting}
                        className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-black shrink-0 transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: accentColor }}
                      >
                        {isImporting ? 'Importing...' : 'Import'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-between items-center text-xs text-neutral-500 border-t border-neutral-900">
          <span>Supported: EPUB, PDF, DOCX, TXT, Google Docs</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider border border-neutral-800 text-neutral-400 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
