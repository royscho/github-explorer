// A small, deliberately bounded subset of GitHub's own per-language colors (github/linguist) —
// just enough to color the common languages seen across popular orgs. Unlisted languages fall
// back to a neutral, theme-driven pill (see RepoCard) rather than growing this map indefinitely.
export const LANGUAGE_COLORS: Readonly<Record<string, string>> = {
  TypeScript: '#3178C6',
  JavaScript: '#F1E05A',
  Python: '#3572A5',
  Java: '#B07219',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  Go: '#00ADD8',
  Rust: '#DEA584',
  'C++': '#F34B7D',
  C: '#555555',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4F5D95',
  HTML: '#E34C26',
  CSS: '#563D7C',
  Shell: '#89E051',
};

export function getLanguageColor(language: string | null): string | null {
  if (!language) {
    return null;
  }
  return LANGUAGE_COLORS[language] ?? null;
}
