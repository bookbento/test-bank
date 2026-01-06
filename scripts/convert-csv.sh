#!/bin/bash

# CSV to JSON Converter Helper Script
# Quick conversion commands for common CSV files

echo "🔄 CSV to JSON Converter Helper"
echo "==============================="

# Check if input file is provided
if [ $# -eq 0 ]; then
    echo "Usage: ./convert-csv.sh <csv-file> [output-file]"
    echo ""
    echo "Examples:"
    echo "  ./convert-csv.sh src/data/ielts/spim-chinese-essencial-3-english.csv"
    echo "  ./convert-csv.sh src/data/ielts/health.csv public/data/health-flashcards.json"
    echo ""
    echo "Available CSV files:"
    find src/data -name "*.csv" -type f | head -10
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="$2"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ Error: Input file '$INPUT_FILE' not found"
    exit 1
fi

# Generate output filename if not provided
if [ -z "$OUTPUT_FILE" ]; then
    BASENAME=$(basename "$INPUT_FILE" .csv)
    OUTPUT_FILE="public/data/${BASENAME}-flashcards.json"
fi

# Ensure output directory exists
mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "📁 Input:  $INPUT_FILE"
echo "📁 Output: $OUTPUT_FILE"
echo ""

# Run the converter
pnpm tsx scripts/csv-to-json.ts "$INPUT_FILE" "$OUTPUT_FILE"

# Check if successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Conversion completed successfully!"
    
    # Show file size
    if [ -f "$OUTPUT_FILE" ]; then
        SIZE=$(wc -c < "$OUTPUT_FILE")
        echo "📊 Output file size: $SIZE bytes"
        
        # Count flashcards
        CARDS=$(grep -o '"id":' "$OUTPUT_FILE" | wc -l)
        echo "🎴 Flashcards created: $CARDS"
    fi
else
    echo ""
    echo "❌ Conversion failed!"
    exit 1
fi
