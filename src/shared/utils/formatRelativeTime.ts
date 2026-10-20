const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '';
  }
  const diffSeconds = Math.max(0, Math.round((now.getTime() - then) / 1000));

  if (diffSeconds < MINUTE) {
    return 'just now';
  }
  if (diffSeconds < HOUR) {
    const minutes = Math.floor(diffSeconds / MINUTE);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (diffSeconds < DAY) {
    const hours = Math.floor(diffSeconds / HOUR);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (diffSeconds < MONTH) {
    const days = Math.floor(diffSeconds / DAY);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (diffSeconds < YEAR) {
    const months = Math.floor(diffSeconds / MONTH);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }
  const years = Math.floor(diffSeconds / YEAR);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
