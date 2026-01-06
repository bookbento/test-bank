#!/usr/bin/env node

/**
 * Test Script for CSV to JSON Converter
 *
 * Tests the csv-to-json.ts script with different CSV formats to ensure
 * compatibility and validate output quality.
 */

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestCase {
  name: string;
  inputFile: string;
  outputFile: string;
  expectedCards?: number;
  description: string;
}

interface TestResult {
  name: string;
  success: boolean;
  cardsCreated?: number;
  expectedCards?: number;
  error?: string;
  warnings?: string[];
}

// Test cases for different CSV formats
const testCases: TestCase[] = [
  {
    name: 'English CSV',
    inputFile: 'src/data/ielts/spim-chinese-essencial-3-english.csv',
    outputFile: 'public/data/test-english.json',
    expectedCards: 223,
    description: 'Standard 7-column format with Chinese-English flashcards',
  },
  {
    name: 'Thai CSV',
    inputFile: 'src/data/ielts/spim-chinese-essencial-3-thai.csv',
    outputFile: 'public/data/test-thai.json',
    expectedCards: 223,
    description: 'Extended format with empty columns and Thai translations',
  },
  {
    name: 'Health CSV',
    inputFile: 'src/data/ielts/ielts-category-health.csv',
    outputFile: 'public/data/test-health.json',
    expectedCards: 63,
    description: 'Mixed structure with health-related IELTS vocabulary',
  },
];

/**
 * Runs the CSV converter for a single test case
 */
async function runConverter(testCase: TestCase): Promise<TestResult> {
  const { name, inputFile, outputFile, expectedCards } = testCase;

  try {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`📁 Input: ${inputFile}`);
    console.log(`📁 Output: ${outputFile}`);

    // Check if input file exists
    try {
      await fs.access(inputFile);
    } catch {
      return {
        name,
        success: false,
        error: `Input file not found: ${inputFile}`,
      };
    }

    // Run the converter
    const command = `pnpm tsx scripts/csv-to-json.ts "${inputFile}" "${outputFile}"`;
    console.log(`🏃 Running: ${command}`);

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.log(`⚠️  stderr: ${stderr}`);
    }

    // Check if output file was created
    try {
      await fs.access(outputFile);
    } catch {
      return {
        name,
        success: false,
        error: 'Output file was not created',
      };
    }

    // Read and validate output JSON
    const jsonContent = await fs.readFile(outputFile, 'utf8');
    const flashcards = JSON.parse(jsonContent);

    if (!Array.isArray(flashcards)) {
      return {
        name,
        success: false,
        error: 'Output is not a valid flashcard array',
      };
    }

    const cardsCreated = flashcards.length;
    console.log(`✅ Created ${cardsCreated} flashcards`);

    // Validate flashcard structure
    const sampleCard = flashcards[0];
    const requiredFields = ['id', 'front', 'back'];
    const missingFields = requiredFields.filter(
      (field) => !(field in sampleCard)
    );

    if (missingFields.length > 0) {
      return {
        name,
        success: false,
        error: `Invalid flashcard structure. Missing fields: ${missingFields.join(', ')}`,
      };
    }

    // Check if front and back have required structure
    const frontFields = ['title', 'icon', 'description'];
    const backFields = ['title', 'icon', 'description'];

    const missingFrontFields = frontFields.filter(
      (field) => !(field in sampleCard.front)
    );
    const missingBackFields = backFields.filter(
      (field) => !(field in sampleCard.back)
    );

    if (missingFrontFields.length > 0 || missingBackFields.length > 0) {
      return {
        name,
        success: false,
        error: `Invalid card structure. Missing front: ${missingFrontFields.join(', ')}, Missing back: ${missingBackFields.join(', ')}`,
      };
    }

    // Parse warnings from stdout
    const warnings = [];
    if (stdout.includes('⚠️')) {
      const warningLines = stdout
        .split('\n')
        .filter((line) => line.includes('⚠️'));
      warnings.push(...warningLines);
    }

    const success = expectedCards
      ? cardsCreated === expectedCards
      : cardsCreated > 0;

    return {
      name,
      success,
      cardsCreated,
      expectedCards,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      name,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validates a sample of flashcards for data quality
 */
function validateFlashcardQuality(
  flashcards: any[],
  testName: string
): string[] {
  const issues = [];
  const sampleSize = Math.min(5, flashcards.length);

  for (let i = 0; i < sampleSize; i++) {
    const card = flashcards[i];

    // Check for empty required fields
    if (!card.id || card.id.trim() === '') {
      issues.push(`${testName}: Card ${i + 1} has empty ID`);
    }

    if (!card.front.title || card.front.title.trim() === '') {
      issues.push(`${testName}: Card ${i + 1} has empty front title`);
    }

    if (!card.back.title || card.back.title.trim() === '') {
      issues.push(`${testName}: Card ${i + 1} has empty back title`);
    }

    // Check for reasonable content lengths
    if (card.front.title.length > 100) {
      issues.push(
        `${testName}: Card ${i + 1} has very long front title (${card.front.title.length} chars)`
      );
    }

    if (card.back.description && card.back.description.length > 500) {
      issues.push(
        `${testName}: Card ${i + 1} has very long back description (${card.back.description.length} chars)`
      );
    }
  }

  return issues;
}

/**
 * Main test execution function
 */
async function runTests(): Promise<void> {
  console.log('🚀 Starting CSV to JSON Converter Tests');
  console.log('=====================================');

  // Ensure output directory exists
  await fs.mkdir('public/data', { recursive: true });

  const results: TestResult[] = [];

  // Run all test cases
  for (const testCase of testCases) {
    const result = await runConverter(testCase);
    results.push(result);

    // Additional quality validation
    if (result.success && result.cardsCreated && result.cardsCreated > 0) {
      try {
        const jsonContent = await fs.readFile(testCase.outputFile, 'utf8');
        const flashcards = JSON.parse(jsonContent);
        const qualityIssues = validateFlashcardQuality(
          flashcards,
          testCase.name
        );

        if (qualityIssues.length > 0) {
          result.warnings = result.warnings || [];
          result.warnings.push(...qualityIssues);
        }
      } catch (error) {
        console.log(
          `⚠️  Could not validate quality for ${testCase.name}: ${error}`
        );
      }
    }
  }

  // Print summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');

  const successful = results.filter((r) => r.success).length;
  const total = results.length;

  results.forEach((result) => {
    const status = result.success ? '✅' : '❌';
    const cardInfo = result.cardsCreated
      ? ` (${result.cardsCreated} cards)`
      : '';
    const expectedInfo = result.expectedCards
      ? ` / ${result.expectedCards} expected`
      : '';

    console.log(`${status} ${result.name}${cardInfo}${expectedInfo}`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    if (result.warnings && result.warnings.length > 0) {
      console.log(`   Warnings: ${result.warnings.length}`);
      result.warnings.slice(0, 3).forEach((warning) => {
        console.log(`   ⚠️  ${warning}`);
      });
      if (result.warnings.length > 3) {
        console.log(`   ... and ${result.warnings.length - 3} more warnings`);
      }
    }
  });

  console.log(`\n🎯 Overall: ${successful}/${total} tests passed`);

  if (successful === total) {
    console.log('🎉 All tests passed! CSV converter is working correctly.');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Execute tests if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { runTests };
export type { TestCase, TestResult };
