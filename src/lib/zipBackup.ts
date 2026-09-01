import JSZip from 'jszip';
import type { SavedBook } from '../store/bookshelfStore';

function base64ToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(',');
  const base64 = parts.length > 1 ? parts[1] : parts[0];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array, mimeType: string): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

export async function exportBookshelfToZip(books: SavedBook[], customFileName?: string): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('antoni-historias') || zip;

  const metadataList: Array<Omit<SavedBook, 'drawingDataUrl' | 'childAudioUrl'> & {
    drawingFileName?: string;
    audioFileName?: string;
  }> = [];

  const capasFolder = folder.folder('capas');
  const vozesFolder = folder.folder('vozes');

  let readmeContent = `# 📚 Coleção de Histórias do Antoni\n\n`;
  readmeContent += `Exportado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}\n`;
  readmeContent += `Total de livros: ${books.length}\n\n---\n\n`;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const safeTitle = (book.title || `Livro ${i + 1}`).replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '_');
    const bookPrefix = `${String(i + 1).padStart(2, '0')}_${safeTitle}`;

    let drawingFileName: string | undefined;
    let audioFileName: string | undefined;

    // Save drawing image
    if (book.drawingDataUrl && capasFolder) {
      try {
        const isPng = book.drawingDataUrl.startsWith('data:image/png');
        const ext = isPng ? 'png' : 'jpg';
        drawingFileName = `capas/${bookPrefix}.${ext}`;
        const bytes = base64ToUint8Array(book.drawingDataUrl);
        capasFolder.file(`${bookPrefix}.${ext}`, bytes);
      } catch (err) {
        console.warn('Error archiving drawing:', err);
      }
    }

    // Save voice audio
    if (book.childAudioUrl && vozesFolder) {
      try {
        const isWav = book.childAudioUrl.startsWith('data:audio/wav') || !book.childAudioUrl.startsWith('data:audio/');
        const ext = isWav ? 'wav' : 'webm';
        audioFileName = `vozes/${bookPrefix}.${ext}`;
        const bytes = base64ToUint8Array(book.childAudioUrl);
        vozesFolder.file(`${bookPrefix}.${ext}`, bytes);
      } catch (err) {
        console.warn('Error archiving audio:', err);
      }
    }

    metadataList.push({
      id: book.id,
      title: book.title,
      cleanStory: book.cleanStory,
      fullStory: book.fullStory,
      gaps: book.gaps,
      coverColor: book.coverColor,
      coverEmoji: book.coverEmoji,
      createdAt: book.createdAt,
      drawingFileName,
      audioFileName,
    });

    readmeContent += `### ${book.coverEmoji} ${book.title}\n`;
    readmeContent += `*Data: ${book.createdAt}*\n\n`;
    readmeContent += `> "${book.fullStory}"\n\n`;
    readmeContent += `- **Palavras aprendidas:** ${book.gaps.map((g) => g.word).join(', ')}\n\n---\n\n`;
  }

  folder.file('README.md', readmeContent);
  folder.file('livros.json', JSON.stringify(metadataList, null, 2));

  // Also include full backup JSON with embedded base64 for instant 1-click import
  folder.file('backup_completo.json', JSON.stringify(books, null, 2));

  const content = await zip.generateAsync({ type: 'blob' });
  const dateStr = new Date().toISOString().split('T')[0];
  const isSingle = books.length === 1;
  const fileName =
    customFileName ||
    (isSingle
      ? `antoni-${(books[0].title || 'historia').replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '_')}.zip`
      : `antoni-historias-${dateStr}.zip`);

  if (typeof window !== 'undefined') {
    // Check if Web Share API with files is supported (iOS AirDrop, Android, Mac)
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      try {
        const file = new File([content], fileName, { type: 'application/zip' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: isSingle ? `História do Antoni: ${books[0].title} 🌟` : 'Coleção de Histórias do Antoni 📚',
            text: isSingle ? `"${books[0].fullStory}"` : 'Confira as histórias criadas pelo Antoni!',
            files: [file],
          });
          return;
        }
      } catch (err: unknown) {
        // If user cancelled the AirDrop/share dialog, don't download
        if ((err as { name?: string })?.name === 'AbortError') {
          return;
        }
        console.warn('Web Share failed, falling back to download:', err);
      }
    }

    // Direct browser download fallback
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export async function exportSingleBookToZip(book: SavedBook): Promise<void> {
  const safeTitle = (book.title || 'livro').replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '_');
  await exportBookshelfToZip([book], `antoni-${safeTitle}.zip`);
}

export async function importBookshelfFromZip(file: File): Promise<SavedBook[]> {
  // Handle direct JSON import
  if (file.name.endsWith('.json')) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed as SavedBook[];
    }
    throw new Error('Formato de JSON inválido');
  }

  // Handle ZIP import
  const zip = await JSZip.loadAsync(file);

  // Check if backup_completo.json exists in root or subfolder
  let fullBackupFile = zip.file('backup_completo.json');
  if (!fullBackupFile) {
    const matching = zip.file(/backup_completo\.json$/i);
    if (matching.length > 0) fullBackupFile = matching[0];
  }

  if (fullBackupFile) {
    const jsonStr = await fullBackupFile.async('text');
    const books = JSON.parse(jsonStr) as SavedBook[];
    if (Array.isArray(books)) return books;
  }

  // Otherwise, reconstruct from livros.json + media files
  let metadataFile = zip.file('livros.json');
  if (!metadataFile) {
    const matching = zip.file(/livros\.json$/i);
    if (matching.length > 0) metadataFile = matching[0];
  }

  if (!metadataFile) {
    throw new Error('Arquivo de coleção não encontrado dentro do ZIP.');
  }

  const jsonStr = await metadataFile.async('text');
  const metadataList = JSON.parse(jsonStr) as Array<
    Omit<SavedBook, 'drawingDataUrl' | 'childAudioUrl'> & {
      drawingFileName?: string;
      audioFileName?: string;
    }
  >;

  const importedBooks: SavedBook[] = [];

  for (const item of metadataList) {
    let drawingDataUrl: string | null = null;
    let childAudioUrl: string | null = null;

    if (item.drawingFileName) {
      let coverFile = zip.file(item.drawingFileName);
      if (!coverFile) {
        const base = item.drawingFileName.split('/').pop() || '';
        const matching = zip.file(new RegExp(base + '$', 'i'));
        if (matching.length > 0) coverFile = matching[0];
      }

      if (coverFile) {
        const bytes = await coverFile.async('uint8array');
        const isPng = item.drawingFileName.endsWith('.png');
        drawingDataUrl = uint8ArrayToBase64(bytes, isPng ? 'image/png' : 'image/jpeg');
      }
    }

    if (item.audioFileName) {
      let audioFile = zip.file(item.audioFileName);
      if (!audioFile) {
        const base = item.audioFileName.split('/').pop() || '';
        const matching = zip.file(new RegExp(base + '$', 'i'));
        if (matching.length > 0) audioFile = matching[0];
      }

      if (audioFile) {
        const bytes = await audioFile.async('uint8array');
        const isWav = item.audioFileName.endsWith('.wav');
        childAudioUrl = uint8ArrayToBase64(bytes, isWav ? 'audio/wav' : 'audio/webm');
      }
    }

    importedBooks.push({
      id: item.id || `imported_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: item.title,
      cleanStory: item.cleanStory,
      fullStory: item.fullStory,
      gaps: item.gaps,
      coverColor: item.coverColor,
      coverEmoji: item.coverEmoji,
      drawingDataUrl,
      childAudioUrl,
      createdAt: item.createdAt || new Date().toLocaleDateString('pt-BR'),
    });
  }

  return importedBooks;
}
