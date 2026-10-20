import { makeStyles } from '@shared/theme';

export const useNameFilterInputStyles = makeStyles(theme => ({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  input: {
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
    paddingRight: theme.spacing.lg,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  clearButton: {
    position: 'absolute',
    right: theme.spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
}));
