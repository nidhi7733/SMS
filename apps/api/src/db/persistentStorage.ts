import fs from 'fs';
import path from 'path';

function getDataDir(): string {
  const candidate1 = path.resolve(process.cwd(), 'apps', 'api', 'data');
  if (fs.existsSync(candidate1)) return candidate1;
  const candidate2 = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(candidate2)) {
    fs.mkdirSync(candidate2, { recursive: true });
  }
  return candidate2;
}

function getDefaultsDir(): string {
  const candidate1 = path.resolve(process.cwd(), 'apps', 'api', 'src', 'db', 'defaults');
  if (fs.existsSync(candidate1)) return candidate1;
  const candidate2 = path.resolve(process.cwd(), 'src', 'db', 'defaults');
  if (fs.existsSync(candidate2)) return candidate2;
  return candidate1;
}

export function savePersistentCmsSettings(settings: any) {
  try {
    const dir = getDataDir();
    const filePath = path.join(dir, 'persistent_cms_settings.json');
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8');
    console.log(`[PersistentStorage] Saved CMS settings snapshot to ${filePath}`);
  } catch (err) {
    console.error('[PersistentStorage] Failed to save CMS settings snapshot:', err);
  }
}

export function loadPersistentCmsSettings(): any | null {
  try {
    // 1. Try user live edits from data/
    const dataDir = getDataDir();
    const filePath = path.join(dataDir, 'persistent_cms_settings.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }

    // 2. Fall back to tracked defaults in git
    const defaultsDir = getDefaultsDir();
    const defaultFile = path.join(defaultsDir, 'default_cms_settings.json');
    if (fs.existsSync(defaultFile)) {
      const content = fs.readFileSync(defaultFile, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('[PersistentStorage] Failed to load CMS settings snapshot:', err);
  }
  return null;
}

export function savePersistentSchoolProfile(school: any) {
  try {
    const dir = getDataDir();
    const filePath = path.join(dir, 'persistent_school_profile.json');
    fs.writeFileSync(filePath, JSON.stringify(school, null, 2), 'utf8');
    console.log(`[PersistentStorage] Saved school profile snapshot to ${filePath}`);
  } catch (err) {
    console.error('[PersistentStorage] Failed to save school profile snapshot:', err);
  }
}

export function loadPersistentSchoolProfile(): any | null {
  try {
    // 1. Try user live edits from data/
    const dataDir = getDataDir();
    const filePath = path.join(dataDir, 'persistent_school_profile.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }

    // 2. Fall back to tracked defaults in git
    const defaultsDir = getDefaultsDir();
    const defaultFile = path.join(defaultsDir, 'default_school_profile.json');
    if (fs.existsSync(defaultFile)) {
      const content = fs.readFileSync(defaultFile, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('[PersistentStorage] Failed to load school profile snapshot:', err);
  }
  return null;
}
