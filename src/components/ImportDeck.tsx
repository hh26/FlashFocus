// src/components/ImportDeck.tsx
import { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

export default function ImportDeck() {
  const [isUploading, setIsUploading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processAndSaveData = async (rawData: any[]) => {
    try {
      const newCards = rawData.map((row: any) => ({
        id: uuidv4(), // NEW: Generate unique ID string for sync
        question: row.Question || row.question || '',
        answer: row.Answer || row.answer || '',
        tags: (row.Tags || row.tags || '')
          .toString()
          .split(',')
          .map((t: string) => t.trim().toLowerCase())
          .filter((t: string) => t.length > 0),
        lastReviewed: new Date(),
        updatedAt: Date.now(), // NEW: Sync conflict resolution
        isDeleted: false       // NEW: Soft delete flag
      })).filter(card => card.question && card.answer); // Drop rows missing core data

      if (newCards.length === 0) {
        throw new Error("No valid flashcards found. Ensure columns are named 'Question' and 'Answer'.");
      }

      await db.cards.bulkAdd(newCards);
      setSuccessCount(newCards.length);
    } catch (err: any) {
      console.error('Import failed:', err);
      setError(err.message || 'Failed to save cards to the database.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setSuccessCount(null);
    setError(null);

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    // PATH A: CSV Parsing
    if (fileExt === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processAndSaveData(results.data),
        error: (err) => {
          setError(err.message);
          setIsUploading(false);
        }
      });
    } 
    // PATH B: Excel Parsing
    else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          await processAndSaveData(jsonData);
        } catch (err) {
          setError("Failed to parse Excel file. Ensure it is not corrupted.");
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setError("Failed to read the file from your device.");
        setIsUploading(false);
      };

      reader.readAsArrayBuffer(file);
    } 
    else {
      setError("Unsupported file format. Please upload a .csv or .xlsx file.");
      setIsUploading(false);
    }

    // Reset the input
    event.target.value = '';
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl text-center">
      <UploadCloud className="mx-auto text-indigo-500 mb-3" size={32} />
      <h3 className="text-lg font-bold text-zinc-100 mb-2">Import Spreadsheet</h3>
      <p className="text-sm text-zinc-400 mb-4">Upload a .csv or .xlsx file. Must contain Question, Answer, and Tags columns.</p>
      
      <label className={`cursor-pointer px-4 py-2 rounded-lg transition-colors inline-block font-medium ${
        isUploading ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
      }`}>
        {isUploading ? 'Processing File...' : 'Select File'}
        <input 
          type="file" 
          accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
          className="hidden" 
          onChange={handleFileUpload} 
          disabled={isUploading}
        />
      </label>

      {successCount !== null && (
        <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium bg-emerald-400/10 py-2 rounded-lg">
          <CheckCircle size={16} /> Successfully imported {successCount} cards!
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center justify-center gap-2 text-red-400 text-sm font-medium bg-red-400/10 py-2 rounded-lg px-3">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}