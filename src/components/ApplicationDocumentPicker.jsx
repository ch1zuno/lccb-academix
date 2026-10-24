import React, { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, FileImage, FileText, Loader2, Upload, X } from 'lucide-react';
import api from '../api';
import { cn } from '../lib/utils';
import {
  APPLICATION_FILE_ACCEPT,
  MAX_APPLICATION_FILE_BYTES,
  MAX_APPLICATION_FILES,
  canPreviewFile,
  fileExtension,
  formatFileSize,
  isImageFile,
  validateApplicationFiles,
} from '../lib/applicationFiles';

/** Thumbnail for either a staged File or a stored document (fetched with auth). */
function DocumentThumb({ item }) {
  const [url, setUrl] = useState(null);
  const image = isImageFile(item.mime);

  useEffect(() => {
    if (!image) return undefined;
    let alive = true;
    let created = null;
    if (item.file) {
      created = URL.createObjectURL(item.file);
      setUrl(created);
    } else if (item.doc?.id) {
      setUrl(null);
      api.blob(`/accreditation/documents/${item.doc.id}`)
        .then((blob) => {
          if (!alive) return;
          created = URL.createObjectURL(blob);
          setUrl(created);
        })
        .catch(() => { /* fall back to the document icon */ });
    }
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [image, item.file, item.doc?.id]);

  if (image && url) {
    return <img src={url} alt="" className="h-14 w-14 shrink-0 border-2 border-ink object-cover" />;
  }
  return (
    <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 border-2 border-ink bg-[#fff7d6]">
      {image ? <FileImage className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
      <span className="text-[10px] font-bold uppercase leading-none">
        {fileExtension(item.name) || 'file'}
      </span>
    </span>
  );
}

/** Read-only (or removable) list of attached files, shared by learners and superadmins. */
export function ApplicationFileList({ items, onRemove, onOpen, onDownload, empty = null }) {
  if (!items.length) return empty;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 border-2 border-ink bg-paper p-2.5">
          <DocumentThumb item={item} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold" title={item.name}>{item.name}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {(fileExtension(item.name) || 'FILE').toUpperCase()} · {formatFileSize(item.size)}
              {item.busy ? ' · uploading…' : ''}
            </p>
          </div>
          {item.busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-label="Uploading" /> : null}
          {!item.busy && onOpen && item.doc && canPreviewFile(item.mime) ? (
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="inline-flex shrink-0 items-center gap-1 border-2 border-ink bg-gold px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] hover:bg-[#e3bb19]"
            >
              <ExternalLink className="h-3 w-3" /> Open
            </button>
          ) : null}
          {!item.busy && onDownload && item.doc && canPreviewFile(item.mime) ? (
            <button
              type="button"
              onClick={() => onDownload(item)}
              aria-label={`Download ${item.name}`}
              className="grid h-7 w-7 shrink-0 place-items-center border-2 border-ink bg-paper hover:bg-[#f0e7d5]"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {!item.busy && onDownload && item.doc && !canPreviewFile(item.mime) ? (
            <button
              type="button"
              onClick={() => onDownload(item)}
              className="inline-flex shrink-0 items-center gap-1 border-2 border-ink bg-gold px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] hover:bg-[#e3bb19]"
            >
              <Download className="h-3 w-3" /> Download
            </button>
          ) : null}
          {!item.busy && onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={`Remove ${item.name}`}
              className="grid h-7 w-7 shrink-0 place-items-center border-2 border-ink bg-paper hover:bg-[#f6d7d2]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Drop zone + staged/attached file list.
 * Items: { id, name, size, mime, file? (staged), doc? (stored), busy? }
 */
export default function ApplicationDocumentPicker({
  items = [],
  maxFiles = MAX_APPLICATION_FILES,
  onAdd,
  onRemove,
  onError,
  onOpen,
  onDownload,
  disabled = false,
  className,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const room = Math.max(0, maxFiles - items.length);

  const accept = (fileList) => {
    const { accepted, errors } = validateApplicationFiles(fileList, room);
    if (accepted.length) onAdd(accepted);
    if (errors.length) {
      const extra = errors.length > 1 ? ` (+${errors.length - 1} more problem${errors.length > 2 ? 's' : ''})` : '';
      onError?.(`${errors[0]}${extra}`);
    }
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Attach supporting documents"
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) accept(event.dataTransfer.files);
        }}
        className={cn(
          'flex cursor-pointer items-center gap-3 border-2 border-dashed border-ink bg-[#f8f1e2] px-4 py-4 outline-none transition-colors',
          'hover:bg-[#f3e8d2] focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
          dragging && 'bg-gold/50',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-ink bg-gold">
          <Upload className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold">
            {room > 0 ? 'Drop files here or click to browse' : 'File limit reached'}
          </span>
          <span className="mt-0.5 block text-[12px] text-muted-foreground">
            PDF, DOC, DOCX, PNG, JPG or WEBP · 4 MB each · up to {maxFiles} files
          </span>
        </span>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={APPLICATION_FILE_ACCEPT}
          multiple
          disabled={disabled}
          onChange={(event) => {
            accept(event.target.files);
            event.target.value = '';
          }}
        />
      </div>
      {items.length > 0 ? (
        <div className="mt-3">
          <ApplicationFileList
            items={items}
            onRemove={onRemove}
            onOpen={onOpen}
            onDownload={onDownload}
          />
        </div>
      ) : null}
      {items.length > 0 ? (
        <p className="mt-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {items.length} of {maxFiles} files · {formatFileSize(MAX_APPLICATION_FILE_BYTES)} max each
        </p>
      ) : null}
    </div>
  );
}
