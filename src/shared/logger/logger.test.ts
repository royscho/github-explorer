import { logger } from './index';

describe('logger', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('error() logs the error object with context', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('boom');
    logger.error(err, { screen: 'Explore' });
    expect(spy).toHaveBeenCalledWith(err, { screen: 'Explore' });
  });

  it('error() logs the error object alone when no context is given', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('boom');
    logger.error(err);
    expect(spy).toHaveBeenCalledWith(err);
  });

  it('warn() logs the message with context', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('careful', { org: 'facebook' });
    expect(spy).toHaveBeenCalledWith('careful', { org: 'facebook' });
  });

  it('info() logs the message with context', () => {
    const spy = jest.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('started', { page: 1 });
    expect(spy).toHaveBeenCalledWith('started', { page: 1 });
  });

  describe('outside __DEV__', () => {
    const globalWithDev = globalThis as unknown as { __DEV__: boolean };
    const originalDev = __DEV__;

    beforeEach(() => {
      globalWithDev.__DEV__ = false;
    });

    afterEach(() => {
      globalWithDev.__DEV__ = originalDev;
    });

    it('still logs error()', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const err = new Error('boom');
      logger.error(err);
      expect(spy).toHaveBeenCalledWith(err);
    });

    it('does not log warn()', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      logger.warn('careful');
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not log info()', () => {
      const spy = jest.spyOn(console, 'info').mockImplementation(() => {});
      logger.info('started');
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
