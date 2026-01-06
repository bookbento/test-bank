# Remember Project Information

## Project Structure

- Child-friendly flashcard app: Astro 5.x + React 19 + Firebase + TypeScript
- PNPM package manager (NOT npm)
- Vitest + React Testing Library for testing
- TailwindCSS + Framer Motion for styling/animations

## Main User Flow

The app uses state-based navigation managed by `FlashcardApp.tsx`:

```
FlashcardApp → [Card Set Selection | Dashboard | Review | Completion | Profile]
```

**Core Components**:

- `FlashcardApp.tsx` - Main app with route management and preloading support
- `CardSetSelection.tsx` - Browse and select card sets
- `Dashboard.tsx` - Start review sessions, view progress
- `Review.tsx` - Study cards with spaced repetition
- `Completion.tsx` - Session results and progress summary
- `Profile.tsx` - User profile and settings

## Data Storage Patterns

### Guest Mode (Session Storage)

- **What**: Card progress, current session, review state
- **Where**: React Context (`FlashcardContext.tsx`) with reducer pattern
- **When**: In-memory during session, lost on browser refresh/close

### Firebase (Firestore)

- **What**: All user cards, progress, SM-2 parameters, cross-device sync
- **Where**: `services/flashcardService.ts` + `hooks/useFirestoreOperations.ts`
- **When**: On authentication, optimistic updates with rollback handling
- **Structure**:

### Local Storage

- **What**: Last selected card set only (for convenience)
- **Where**: `localStorage` via `cardSetPersistence.ts`
- **When**: Card set selection (persists across sessions)

Field

```
users/{userId}/
  cardSetsProgress: {
    hsk_1_set_1_english: {
      cardSetId: 'hsk_1_set_1_english',
      totalCards: number,
      reviewedCards: number,
      progressPercentage: number,
      masteredCards: number,
      needPracticeCards: number,
      reviewedToday: number,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    hsk_1_set_2_english: {
      cardSetId: 'hsk_1_set_2_english',
      totalCards: 40,
      reviewedCards: 10,
      progressPercentage: 25,
      masteredCards: 2,
      needPracticeCards: 8,
      reviewedToday: 5,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  },
  displayName: string,
  email: string,
  isActive: boolean,
  photoURL: string,
  preferredLanguage: string,
  reviewSessionSize: number,
  theme: "system",
  uid: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  lastLoginAt: timestamp,
```

Collection

```
users/{userId}/cardSets/{cardSetId}
{
  cardSetId: string,
  cards: [
    {
      id: "hsk-1-set-1-ai",
      cardSetId: "hsk_1_set_1_english",

      front: {
        icon: "",
        title: "爱",
        description: "ài"
      },
      back: {
        icon: "❤️",
        title: "love",
        description: "我爱你。 (Wǒ ài nǐ.) - I love you."
      },

      // SM-2 Spaced Repetition Algorithm parameters
      easinessFactor: 2.5,
      repetitions: 0,
      interval: 1,
      nextReviewDate: Timestamp,
      lastReviewDate: Timestamp,

      // Progress tracking
      totalReviews: 0,
      correctStreak: 0,
      averageQuality: 3.0,

      // Metadata
      isNew: true,
      createdAt: Timestamp,
      updatedAt: Timestamp,
    },
    // ... all cards in single array
  ],
  totalCards: number,
  createdAt: Date,
  updatedAt: Date
}
```

### Local Storage

- **What**: Last selected card set only
- **Where**: `localStorage` via `cardSetPersistence.ts`
- **When**: Card set changes (persists across sessions)

## Key Commands

**Always use `pnpm` not `npm`**

- `pnpm run dev` - Development server
- `pnpm run test` - Tests (watch mode)
- `pnpm run test:run` - Tests (single run)
- `pnpm run build` - Production build
- `pnpm run test:no-watch` - For AI to Run tests without watch mode
- `pnpm check` - For run all type checks
- `pnpm run check:quick` - For quick type checks that show only number of errors

for timeout use `ptimeout`

## Architecture

### Core Files

- `src/contexts/FlashcardContext.tsx` - Main state management (React Context + useReducer)
- `src/services/flashcardService.ts` - Firebase operations
- `src/utils/sm2.ts` - Spaced repetition algorithm
- `src/reducers/flashcardReducer.ts` - State transitions
- `src/hooks/useFlashcardActions.ts` - Complex action handlers
- `src/hooks/useFirestoreOperations.ts` - Firestore operations with optimization
- `src/utils/cardSetLoader.ts` - Fetch-based card set loading
- `src/utils/progressAggregation.ts` - Progress calculation utilities

### State Flow

1. User action → Context dispatch
2. Optimistic UI update
3. Firebase sync (if authenticated)
4. Error handling with rollback

## Code Standards

- **Keep simple** - Readable over clever
- **Error handling** - Always implement with user feedback
- **Edge cases** - Handle empty states, network failures
- **Small steps** - Make testable incremental changes
- **Preserve code** - Don't remove comments/code unless asked
- **Clear comments** - Explain logic in code

## Testing

- Vitest with jsdom environment
- Tests in `src/test/`, `tests/`, or co-located
- Use `@testing-library/react` for components
- Mock Firebase in tests

## Key Dependencies

- astro: ^5.13.7, react: ^19.1.1, firebase: ^12.2.1
- vitest: ^3.2.4, framer-motion: ^12.23.13
- @testing-library/react: ^16.3.0
- react-router-dom: ^7.9.1, date-fns: ^4.1.0
- twemoji: ^14.0.2
