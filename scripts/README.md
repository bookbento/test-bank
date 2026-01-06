# CSV to JSON Flashcard Converter

## Overview

This script converts IELTS vocabulary CSV files to the flashcard JSON format used by the Remember app.

## Features

- ✅ **Robust CSV Parsing** - Handles complex CSV with quotes and commas
- ✅ **Data Validation** - Validates required fields and provides warnings
- ✅ **TypeScript Support** - Full type safety and IntelliSense
- ✅ **Error Handling** - Graceful error recovery with detailed reporting
- ✅ **Progress Tracking** - Real-time conversion progress and statistics

## Usage

### Quick Start

```bash
# Convert a CSV file to flashcard JSON
pnpm csv:convert <input.csv> <output.json>

# Example:
pnpm csv:convert src/data/ielts/ielts-by-category-culture.csv public/data/ielts-culture-flashcards.json
```

### CSV Format Requirements

Your CSV must have these columns (header names must match exactly):

- `ID` - Unique identifier for each flashcard _(required)_
- `Culture` - English term _(required)_
- `roman` - Pronunciation guide _(optional)_
- `Thai` - Thai translation _(required)_
- `emoji` - Icon for the back side _(optional)_
- `exmaple` - Example sentence _(optional)_

### Output Format

```json
[
  {
    "id": "ielts-by-category-culture-belief",
    "front": {
      "icon": "",
      "title": "Belief",
      "description": "bɪˈliːf"
    },
    "back": {
      "icon": "🙏",
      "title": "ความเชื่อ",
      "description": "His **belief** in himself helped him overcome challenges."
    }
  }
]
```

### Field Mapping

| CSV Column | JSON Location       | Default Value                   |
| ---------- | ------------------- | ------------------------------- |
| `ID`       | `id`                | -                               |
| `Culture`  | `front.title`       | -                               |
| `roman`    | `front.description` | "(pronunciation not available)" |
| `Thai`     | `back.title`        | -                               |
| `emoji`    | `back.icon`         | "📚"                            |
| `exmaple`  | `back.description`  | "Learn the word: {Culture}"     |

## Error Handling

### Missing Required Fields

If `ID`, `Culture`, or `Thai` are missing, the row will be skipped and reported as an error.

### Missing Optional Fields

Missing `roman`, `emoji`, or `exmaple` will generate warnings but won't stop conversion.

### Example Output

```
📊 Conversion Summary:
📈 Total rows processed: 64
✅ Successful conversions: 64
⚠️  Warnings: 0
❌ Errors: 0
```

## Development

### Running Tests

```bash
# Run with detailed logging
pnpm tsx scripts/csv-to-json.ts --help

# Test with sample data
pnpm tsx scripts/csv-to-json.ts src/data/sample.csv public/data/output.json
```

### Customizing the Script

The script is modular and can be easily customized:

1. **Field Mapping** - Update the `convertToFlashcard()` function
2. **Validation Rules** - Modify `validateAndSanitizeRow()` function
3. **Output Format** - Change the `FlashcardJSON` interface

### TypeScript Interfaces

```typescript
interface CSVRow {
  ID: string;
  Culture: string;
  roman: string;
  Thai: string;
  emoji: string;
  exmaple: string;
}

interface FlashcardJSON {
  id: string;
  front: FlashcardSide;
  back: FlashcardSide;
}
```

## Troubleshooting

### Common Issues

**"Missing required fields" error**

- Check that your CSV has the correct column headers
- Ensure no empty cells in ID, Culture, or Thai columns

**"CSV parsing failed" error**

- Verify your CSV file is properly formatted
- Check for unescaped quotes or special characters

**File permission errors**

- Ensure the output directory exists and is writable
- Check file permissions on both input and output paths

### Getting Help

Run the script without arguments to see usage information:

```bash
pnpm csv:convert
```
