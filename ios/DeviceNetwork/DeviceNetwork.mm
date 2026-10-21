#import "DeviceNetwork.h"

// Forward-declared instead of `#import "GithubExplorer-Swift.h"`: that generated umbrella header
// pulls in every Swift file in the target, including SceneDelegate, whose `React_RCTAppDelegate`
// `@import` doesn't resolve from inside a plain .mm compile in this project (confirmed against a
// real Xcode build) — this app had no other .mm file importing it before, so it never surfaced.
// Declaring just the selectors this file actually calls avoids that entirely.
@interface DeviceNetworkImpl : NSObject
- (NSDictionary<NSString *, id> *)getNetworkState;
- (NSDictionary<NSString *, id> *)getDeviceInfo;
- (BOOL)isLowPowerMode;
- (void)startNetworkMonitoringOnUpdate:(void (^)(NSDictionary<NSString *, id> *state))onUpdate;
- (void)stopNetworkMonitoring;
@end

@implementation DeviceNetwork {
  DeviceNetworkImpl *_impl;
}

RCT_EXPORT_MODULE(DeviceNetwork)

- (instancetype)init
{
  if (self = [super init]) {
    _impl = [DeviceNetworkImpl new];
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (void)invalidate
{
  [_impl stopNetworkMonitoring];
}

- (void)getNetworkState:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  resolve([_impl getNetworkState]);
}

- (void)getDeviceInfo:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  resolve([_impl getDeviceInfo]);
}

- (void)isLowPowerMode:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  resolve(@([_impl isLowPowerMode]));
}

- (void)startNetworkMonitoring:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  __weak DeviceNetwork *weakSelf = self;
  [_impl startNetworkMonitoringOnUpdate:^(NSDictionary<NSString *, id> *state) {
    [weakSelf emitOnNetworkStatusChanged:state];
  }];
  resolve(nil);
}

- (void)stopNetworkMonitoring:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_impl stopNetworkMonitoring];
  resolve(nil);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeDeviceNetworkSpecJSI>(params);
}

@end
