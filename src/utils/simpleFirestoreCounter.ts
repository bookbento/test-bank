class SimpleFirestoreCounter {
  private totalReads: number = 0;
  private totalWrites: number = 0;
  private enabled: boolean = true;
  private operationContext: string = '';
  private operationDetails: string[] = [];

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`🔍 Firestore counter: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Start tracking operations for a specific context (e.g., "SINGLE DOCUMENT Load", "LEGACY Batch Save")
   */
  startOperationTracking(context: string): void {
    this.operationContext = context;
    console.log(`🏁 Starting operation tracking: ${context}`);
    this.clear();
  }

  /**
   * End tracking and show performance summary with expectations
   */
  endOperationTracking(): {
    totalReads: number;
    totalWrites: number;
    totalOps: number;
    details: string[];
  } {
    const stats = this.getStats();
    console.log(`🏁 Completed operation tracking: ${this.operationContext}`);
    console.log(
      `📈 Performance Summary: ${stats.totalReads}R + ${stats.totalWrites}W = ${stats.totalOps} ops`
    );

    // Show performance expectations for validation
    if (this.operationContext.includes('SINGLE DOCUMENT')) {
      console.log(`✅ Expected: Low operation count (1-2 operations)`);
      if (stats.totalOps > 2) {
        console.log(
          `⚠️ WARNING: Expected ≤2 operations, got ${stats.totalOps}. Check if single document methods are used.`
        );
      }
    } else if (this.operationContext.includes('LEGACY')) {
      console.log(`⚠️ Expected: High operation count (N operations)`);
    }

    const result = { ...stats, details: [...this.operationDetails] };
    this.operationContext = '';
    return result;
  }

  countRead(operation?: string): void {
    if (!this.enabled) return;

    this.totalReads++;
    const detail = operation ? `: ${operation}` : '';
    const contextInfo = this.operationContext
      ? ` [${this.operationContext}]`
      : '';

    console.log(`📖 READ #${this.totalReads}${contextInfo}${detail}`);
    this.operationDetails.push(`📖 READ #${this.totalReads}${detail}`);
  }

  countWrite(operation?: string): void {
    if (!this.enabled) return;

    this.totalWrites++;
    const detail = operation ? `: ${operation}` : '';
    const contextInfo = this.operationContext
      ? ` [${this.operationContext}]`
      : '';

    console.log(`✍️ WRITE #${this.totalWrites}${contextInfo}${detail}`);
    this.operationDetails.push(`✍️ WRITE #${this.totalWrites}${detail}`);
  }

  /**
   * Calculate expected vs actual operations for validation
   */
  validateExpectedOperations(
    cardCount: number,
    patternType: 'single' | 'subcollection'
  ): void {
    const expected =
      patternType === 'single'
        ? { reads: 1, writes: 1, total: 2 }
        : { reads: cardCount, writes: cardCount, total: cardCount * 2 };

    const actual = this.getStats();

    console.log('🎯 Expected vs Actual Operations:');
    console.log(`Pattern: ${patternType.toUpperCase()}, Cards: ${cardCount}`);
    console.log(
      `Expected: ${expected.reads}R + ${expected.writes}W = ${expected.total} ops`
    );
    console.log(
      `Actual:   ${actual.totalReads}R + ${actual.totalWrites}W = ${actual.totalOps} ops`
    );

    const matches = actual.totalOps === expected.total;
    console.log(
      matches
        ? '✅ Operation count matches expectations!'
        : '❌ Operation count differs from expectations'
    );

    if (!matches && patternType === 'single') {
      console.log('💡 Check: Are you using the new single document methods?');
    }
  }

  getStats(): { totalReads: number; totalWrites: number; totalOps: number } {
    return {
      totalReads: this.totalReads,
      totalWrites: this.totalWrites,
      totalOps: this.totalReads + this.totalWrites,
    };
  }

  clear(): void {
    this.totalReads = 0;
    this.totalWrites = 0;
    this.operationDetails = [];
    console.log('🗑️ Counter cleared');
  }
}

export const firestoreCounter = new SimpleFirestoreCounter();

if (typeof window !== 'undefined') {
  (window as any).firestoreDebug = {
    enable: () => firestoreCounter.setEnabled(true),
    disable: () => firestoreCounter.setEnabled(false),
    getStats: () => firestoreCounter.getStats(),
    clear: () => firestoreCounter.clear(),
    reset: () => firestoreCounter.clear(),
    // New enhanced methods for single document pattern validation
    start: (context: string) =>
      firestoreCounter.startOperationTracking(context),
    end: () => firestoreCounter.endOperationTracking(),
    validate: (cardCount: number, pattern: 'single' | 'subcollection') =>
      firestoreCounter.validateExpectedOperations(cardCount, pattern),
  };
}
