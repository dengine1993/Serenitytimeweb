#!/usr/bin/env tsx

/**
 * i18n Parity Checker
 * 
 * Ensures that ru.json and en.json have the same structure and keys.
 * This prevents missing translations and helps maintain consistency.
 * 
 * Usage:
 *   npm run i18n:check
 */

import * as fs from 'fs';
import * as path from 'path';

interface TranslationObject {
  [key: string]: string | TranslationObject;
}

function flattenKeys(obj: TranslationObject, prefix = ''): string[] {
  let keys: string[] = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys = keys.concat(flattenKeys(value as TranslationObject, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

function checkParity(): boolean {
  const ruPath = path.join(process.cwd(), 'src/i18n/ru.json');
  const enPath = path.join(process.cwd(), 'src/i18n/en.json');

  // Read files
  if (!fs.existsSync(ruPath)) {
    console.error('❌ ru.json not found at:', ruPath);
    return false;
  }

  if (!fs.existsSync(enPath)) {
    console.error('❌ en.json not found at:', enPath);
    return false;
  }

  const ruJson: TranslationObject = JSON.parse(fs.readFileSync(ruPath, 'utf-8'));
  const enJson: TranslationObject = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

  // Flatten keys
  const ruKeys = flattenKeys(ruJson).sort();
  const enKeys = flattenKeys(enJson).sort();

  // Find differences
  const missingInEn = ruKeys.filter(k => !enKeys.includes(k));
  const missingInRu = enKeys.filter(k => !ruKeys.includes(k));

  // Report results
  console.log('═══════════════════════════════════════════');
  console.log('  i18n Parity Check');
  console.log('═══════════════════════════════════════════\n');

  console.log(`📊 Russian keys: ${ruKeys.length}`);
  console.log(`📊 English keys: ${enKeys.length}\n`);

  let hasErrors = false;

  if (missingInEn.length > 0) {
    hasErrors = true;
    console.error(`❌ Missing in en.json (${missingInEn.length} keys):`);
    missingInEn.forEach(key => console.error(`   - ${key}`));
    console.log('');
  }

  if (missingInRu.length > 0) {
    hasErrors = true;
    console.error(`❌ Missing in ru.json (${missingInRu.length} keys):`);
    missingInRu.forEach(key => console.error(`   - ${key}`));
    console.log('');
  }

  if (!hasErrors) {
    console.log('✅ i18n parity check passed! Both files have the same keys.');
    console.log('═══════════════════════════════════════════\n');
    return true;
  } else {
    console.error('❌ i18n parity check failed. Please fix the missing keys.');
    console.log('═══════════════════════════════════════════\n');
    return false;
  }
}

// Run check
const success = checkParity();
process.exit(success ? 0 : 1);