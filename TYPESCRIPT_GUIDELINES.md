# TypeScript Guidelines for Безмятежные

## 📁 Type System Architecture

### Core Type Files

All TypeScript types are centralized in the `src/types/` directory:

- **`api.ts`** - API responses, edge function types, error handling
- **`database.ts`** - Database table types, extended types with joins
- **`ui.ts`** - UI component props, form data, theme types
- **`gtag.ts`** - Google Analytics types and type guards
- **`psychological.ts`** - Psychological profiling and user metrics
- **`model-viewer.d.ts`** - Global type declarations for 3D model viewer
- **`index.ts`** - Central export point for all types

### Import Pattern

Always import types from the central index:

```typescript
import type { Profile, Post, APIResponse, EmotionType } from '@/types';
```

## 🚫 Forbidden Patterns

### Never Use `any`

```typescript
// ❌ WRONG
function handleData(data: any) { }
const result: any = await fetchData();

// ✅ CORRECT
function handleData(data: unknown) {
  if (isValidData(data)) {
    // Type-safe handling
  }
}
const result = await fetchData() as Profile;
```

### Prefer `const` over `let`

```typescript
// ❌ WRONG
let count = 0;
for (let item of items) {
  count++;
}

// ✅ CORRECT
const count = items.length;
const processedItems = items.map(item => process(item));
```

### Error Handling

```typescript
// ❌ WRONG
catch (error: any) {
  console.log(error.message);
}

// ✅ CORRECT
catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error:', String(error));
  }
}
```

## 📋 Type Definitions

### Database Types

Extend base types with joins for complex queries:

```typescript
export interface PostWithProfile extends Post {
  profiles: Profile | null;
}

export interface PostWithDetails extends Post {
  profiles: Profile | null;
  comments: Comment[];
  post_reactions: PostReaction[];
}
```

### API Response Types

Always wrap responses in a consistent structure:

```typescript
export interface APIResponse<T> {
  data: T | null;
  error: APIError | null;
  success: boolean;
}
```

### Form Data Types

Define strict types for all form inputs:

```typescript
export interface EmotionFormData {
  emotion: string;
  emotions?: string[];
  mood_score?: number;
  anxiety_level?: number;
  notes?: string;
  triggers?: string[];
  had_panic_attack?: boolean;
}
```

## 🎯 UI Component Types

### Props Interfaces

```typescript
export interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: number;
}

export interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  hint?: string;
  cta?: string;
}
```

### State Types

```typescript
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
```

## 🔧 Edge Function Types

When working with edge functions, use proper typing:

```typescript
interface Holiday {
  name: string;
  date: { iso: string };
  description: string;
  type: string[];
}

const holidays = data.response?.holidays?.map((h: Holiday) => ({
  name: h.name,
  date: h.date.iso,
  description: h.description,
  type: h.type.join(', ')
}));
```

## 🛡️ Type Guards

Create type guards for runtime validation:

```typescript
export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'details' in error
  );
}

export function hasGTag(window: Window): window is WindowWithGTag {
  return 'gtag' in window && typeof (window as WindowWithGTag).gtag === 'function';
}
```

## 📊 Psychological Profile Types

For complex user data structures:

```typescript
export interface PsychologicalProfile {
  soul_matcher: SoulMatcherData | null;
  recent_emotions: EmotionData[];
  metrics: ConsciousnessMetrics | null;
  overall_trend: 'improving' | 'stable' | 'declining' | 'fluctuating';
  avgAnxiety: number;
  avgMood: number;
  dominantEmotions: string[];
}
```

## 🔄 Migration from `any`

When encountering `any`, follow this process:

1. **Analyze the data structure** - Understand what the actual type should be
2. **Create or find the appropriate type** - Check existing types first
3. **Add type guard if needed** - For runtime validation
4. **Update the code** - Replace `any` with the proper type
5. **Test thoroughly** - Ensure no runtime errors

## 🎨 Best Practices

### 1. Explicit Return Types
```typescript
// ✅ CORRECT
function calculateScore(metrics: Metrics): number {
  return (metrics.calm + metrics.stable) / 2;
}
```

### 2. Union Types for States
```typescript
type SubscriptionTier = 'free' | 'plus' | 'premium';
type EmotionType = 'joy' | 'sadness' | 'anxiety' | 'calm';
```

### 3. Optional Chaining
```typescript
const userName = user?.profile?.display_name ?? 'Guest';
```

### 4. Nullish Coalescing
```typescript
const limit = subscription.ai_messages_limit ?? 5;
```

## 📝 Documentation

Always document complex types:

```typescript
/**
 * Represents a complete post with author profile and engagement metrics
 */
export interface PostWithDetails extends Post {
  profiles: Profile | null;
  comments: Comment[];
  post_reactions: PostReaction[];
}
```

## 🚀 Performance Considerations

- Use `const` assertions for literal types: `as const`
- Prefer interfaces over types for objects
- Use utility types: `Partial<T>`, `Pick<T>`, `Omit<T>`
- Leverage type inference when obvious

## ✅ Checklist for New Features

- [ ] All types defined in `src/types/`
- [ ] No `any` types used
- [ ] Proper error handling with type guards
- [ ] Form data properly typed
- [ ] API responses wrapped in `APIResponse<T>`
- [ ] Database types extended for joins
- [ ] Props interfaces for all components
- [ ] Type guards for runtime checks

---

**Last Updated:** 2025-10-31  
**Project:** Безмятежные  
**TypeScript Version:** 5.x
