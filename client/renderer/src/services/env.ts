export function getTarget() {
  return process.env.NEXT_PUBLIC_BUILD_TARGET;
}

export function isWeb() {
  return getTarget() === 'web';
}

export function isElectron() {
  return !isWeb();
}