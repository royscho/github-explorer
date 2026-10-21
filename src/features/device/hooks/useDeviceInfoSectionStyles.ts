import { makeStyles } from '@shared/theme';

export const useDeviceInfoSectionStyles = makeStyles(theme => ({
  container: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  group: {
    gap: theme.spacing.xs,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  groupIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  valuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.radii.lg,
  },
  valueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
}));
