import { makeStyles } from '@shared/theme';

export const useTextStyles = makeStyles(theme => ({
  title: {
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.title.fontWeight,
  },
  body: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.body.fontWeight,
  },
  caption: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: theme.typography.caption.fontWeight,
  },
  primary: {
    color: theme.colors.text,
  },
  secondary: {
    color: theme.colors.textSecondary,
  },
  danger: {
    color: theme.colors.danger,
  },
}));
