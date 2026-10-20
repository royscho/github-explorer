import { makeStyles } from '@shared/theme';

export const useOrgSearchInputStyles = makeStyles(theme => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    minHeight: 44,
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
  button: {
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: theme.colors.textOnAccent,
    fontWeight: '600',
  },
}));
