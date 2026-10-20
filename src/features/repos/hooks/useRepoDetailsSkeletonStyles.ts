import { makeStyles } from '@shared/theme';

export const useRepoDetailsSkeletonStyles = makeStyles(theme => ({
  container: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  bar: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    height: 12,
  },
  title: {
    width: '70%',
    height: 20,
  },
  line: {
    width: '100%',
  },
  lineShort: {
    width: '50%',
  },
}));
