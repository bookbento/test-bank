#!/usr/bin/env node

/**
 * CSV to JSON Converter Script
 *
 * Converts IELTS vocabulary CSV files to flashcard JSON format
 * Features:
 * - Robust CSV parsing with error handling
 * - Data validation and sanitization
 * - TypeScript type safety
 * - Detailed logging and progress reporting
 */

import { createReadStream } from 'fs';
import { promises as fs } from 'fs';
import { parse } from 'csv-parse';
import path from 'path';

// TypeScript interfaces for type safety
interface CSVRow {
  ID: string;
  'front/title': string;
  'front/icon': string;
  'front/description': string;
  'back/title': string;
  'back/icon': string;
  'back/description': string;
  [key: string]: string; // Allow for additional columns
}

interface ColumnMapping {
  ID?: number;
  'front/title'?: number;
  'front/icon'?: number;
  'front/description'?: number;
  'back/title'?: number;
  'back/icon'?: number;
  'back/description'?: number;
}

interface FlashcardSide {
  icon: string;
  title: string;
  description: string;
}

interface FlashcardJSON {
  id: string;
  front: FlashcardSide;
  back: FlashcardSide;
}

interface ConversionStats {
  totalRows: number;
  successfulConversions: number;
  warnings: string[];
  errors: string[];
}

/**
 * Creates column mapping from headers
 * @param headers - Array of column headers
 * @returns Column mapping with positions
 */
function createColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  // Clean headers and log them
  const cleanHeaders = headers.map((h) => h?.trim() || '');
  console.log(
    `🔍 Detected columns (${cleanHeaders.length}): ${cleanHeaders.join(', ')}`
  );

  // Map known column names to their positions
  const targetColumns = [
    'ID',
    'front/title',
    'front/icon',
    'front/description',
    'back/title',
    'back/icon',
    'back/description',
  ];

  cleanHeaders.forEach((header, index) => {
    if (targetColumns.includes(header)) {
      mapping[header as keyof ColumnMapping] = index;
      console.log(`📍 Column "${header}" found at position ${index}`);
    }
  });

  // Check for required columns
  const requiredColumns = ['ID', 'front/title', 'back/title'];
  const missingRequired = requiredColumns.filter(
    (col) => mapping[col as keyof ColumnMapping] === undefined
  );

  if (missingRequired.length > 0) {
    console.log(`⚠️  Missing required columns: ${missingRequired.join(', ')}`);
  } else {
    console.log('✅ All required columns found');
  }

  return mapping;
}

/**
 * Extracts data from CSV row using column mapping
 * @param row - Raw CSV row as array of values
 * @param mapping - Column position mapping
 * @returns Extracted and sanitized data
 */
function extractRowData(row: string[], mapping: ColumnMapping): CSVRow | null {
  // Get required data
  const idPos = mapping.ID;
  const frontTitlePos = mapping['front/title'];
  const backTitlePos = mapping['back/title'];

  if (
    idPos === undefined ||
    frontTitlePos === undefined ||
    backTitlePos === undefined
  ) {
    return null;
  }

  // Extract all available data
  return {
    ID: row[idPos]?.trim() || '',
    'front/title': row[frontTitlePos]?.trim() || '',
    'front/icon':
      mapping['front/icon'] !== undefined
        ? row[mapping['front/icon']]?.trim() || ''
        : '',
    'front/description':
      mapping['front/description'] !== undefined
        ? row[mapping['front/description']]?.trim() || ''
        : '',
    'back/title': row[backTitlePos]?.trim() || '',
    'back/icon':
      mapping['back/icon'] !== undefined
        ? row[mapping['back/icon']]?.trim() || ''
        : '',
    'back/description':
      mapping['back/description'] !== undefined
        ? row[mapping['back/description']]?.trim() || ''
        : '',
  };
}

/**
 * Validates and sanitizes CSV row data with flexible column mapping
 * @param row - Raw CSV row data (object from csv-parse)
 * @param rowIndex - Row number for error reporting
 * @param mapping - Column position mapping
 * @returns Validation result with sanitized data or error
 */
function validateAndSanitizeRow(
  row: any,
  rowIndex: number,
  mapping: ColumnMapping
): {
  isValid: boolean;
  data?: CSVRow;
  warning?: string;
  error?: string;
} {
  // Convert object back to array for consistent processing
  const rowArray = Object.values(row) as string[];

  // Extract data using mapping
  const extractedData = extractRowData(rowArray, mapping);

  if (!extractedData) {
    return {
      isValid: false,
      error: `Row ${rowIndex}: Missing required columns (ID, front/title, back/title)`,
    };
  }

  // Check if required fields have data
  if (
    !extractedData.ID ||
    !extractedData['front/title'] ||
    !extractedData['back/title']
  ) {
    return {
      isValid: false,
      error: `Row ${rowIndex}: Empty required fields (ID: "${extractedData.ID}", front/title: "${extractedData['front/title']}", back/title: "${extractedData['back/title']}")`,
    };
  }

  // Generate warnings for missing optional fields
  const warnings = [];
  if (!extractedData['front/description'])
    warnings.push(`Row ${rowIndex}: Missing front description (pronunciation)`);
  if (!extractedData['back/icon'])
    warnings.push(`Row ${rowIndex}: Missing back icon`);
  if (!extractedData['back/description'])
    warnings.push(`Row ${rowIndex}: Missing back description (example)`);

  return {
    isValid: true,
    data: extractedData,
    warning: warnings.length > 0 ? warnings.join('; ') : undefined,
  };
}

/**
 * Converts CSV row to flashcard JSON format
 * @param csvRow - Validated CSV row data
 * @returns Flashcard JSON object
 */
function convertToFlashcard(csvRow: CSVRow): FlashcardJSON {
  return {
    id: csvRow.ID,
    front: {
      icon: csvRow['front/icon'] || '', // Keep front icons empty as requested
      title: csvRow['front/title'],
      description:
        csvRow['front/description'] || '(pronunciation not available)',
    },
    back: {
      icon: csvRow['back/icon'] || '📚', // Default emoji if none provided
      title: csvRow['back/title'],
      description:
        csvRow['back/description'] ||
        `Learn the word: ${csvRow['front/title']}`,
    },
  };
}

/**
 * Main conversion function
 * @param inputPath - Path to input CSV file
 * @param outputPath - Path to output JSON file
 */
async function convertCSVToJSON(
  inputPath: string,
  outputPath: string
): Promise<void> {
  console.log('🔄 Starting CSV to JSON conversion...');
  console.log(`📁 Input: ${inputPath}`);
  console.log(`📁 Output: ${outputPath}`);

  const stats: ConversionStats = {
    totalRows: 0,
    successfulConversions: 0,
    warnings: [],
    errors: [],
  };

  const flashcards: FlashcardJSON[] = [];
  let columnMapping: ColumnMapping | null = null;

  try {
    // Check if input file exists
    await fs.access(inputPath);

    // Create parser with proper CSV options
    const parser = parse({
      columns: true, // Use first row as column headers
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // Allow inconsistent column counts
    });

    // Process each row
    parser.on('readable', function () {
      let record;
      while ((record = parser.read()) !== null) {
        // Create column mapping on first row
        if (!columnMapping) {
          const headers = Object.keys(record);
          columnMapping = createColumnMapping(headers);
        }

        stats.totalRows++;

        const validation = validateAndSanitizeRow(
          record,
          stats.totalRows,
          columnMapping
        );

        if (!validation.isValid) {
          stats.errors.push(validation.error!);
          continue;
        }

        if (validation.warning) {
          stats.warnings.push(validation.warning);
        }

        try {
          const flashcard = convertToFlashcard(validation.data!);
          flashcards.push(flashcard);
          stats.successfulConversions++;

          // Progress indicator
          if (stats.totalRows % 10 === 0) {
            console.log(`✅ Processed ${stats.totalRows} rows...`);
          }
        } catch (conversionError) {
          const errorMsg = `Row ${stats.totalRows}: Conversion failed - ${conversionError}`;
          stats.errors.push(errorMsg);
        }
      }
    });

    parser.on('error', (err: Error) => {
      throw new Error(`CSV parsing failed: ${err.message}`);
    });

    parser.on('end', async () => {
      try {
        // Write output JSON file
        const jsonContent = JSON.stringify(flashcards, null, 2);
        await fs.writeFile(outputPath, jsonContent, 'utf8');

        // Print conversion summary
        console.log('\n📊 Conversion Summary:');
        console.log(`📈 Total rows processed: ${stats.totalRows}`);
        console.log(
          `✅ Successful conversions: ${stats.successfulConversions}`
        );
        console.log(`⚠️  Warnings: ${stats.warnings.length}`);
        console.log(`❌ Errors: ${stats.errors.length}`);

        if (stats.warnings.length > 0) {
          console.log('\n⚠️  Warnings:');
          stats.warnings.forEach((warning) => console.log(`   ${warning}`));
        }

        if (stats.errors.length > 0) {
          console.log('\n❌ Errors:');
          stats.errors.forEach((error) => console.log(`   ${error}`));
        }

        if (stats.successfulConversions > 0) {
          console.log(
            `\n🎉 Successfully created ${outputPath} with ${stats.successfulConversions} flashcards!`
          );
        } else {
          console.log('\n😞 No flashcards were created due to errors.');
          process.exit(1);
        }
      } catch (writeError) {
        console.error(`❌ Failed to write output file: ${writeError}`);
        process.exit(1);
      }
    });

    // Start parsing
    const readStream = createReadStream(inputPath);
    readStream.pipe(parser);
  } catch (error) {
    console.error(`❌ Conversion failed: ${error}`);
    process.exit(1);
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('📚 CSV to JSON Flashcard Converter');
    console.log('');
    console.log(
      'Usage: pnpm tsx scripts/csv-to-json.ts <input.csv> <output.json>'
    );
    console.log('');
    console.log('Example:');
    console.log(
      '  pnpm tsx scripts/csv-to-json.ts src/data/ielts/ielts-by-category-culture.csv public/data/ielts-culture-flashcards.json'
    );
    console.log('');
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath = path.resolve(args[1]);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  await convertCSVToJSON(inputPath, outputPath);
}

// Execute if run directly (ES module compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}

export { convertCSVToJSON, type FlashcardJSON, type CSVRow };
