import { EXPIRATIONS, type ExpirationKey } from "./constants";

/** 화이트리스트에 없는 TTL은 거부한다. 타입 가드이자 검증의 단일 진실원. */
export function isExpirationKey(value: unknown): value is ExpirationKey {
  // in 연산자 대신 hasOwn: 프로토타입 체인 속성(toString 등) 우회 차단
  return typeof value === "string" && Object.hasOwn(EXPIRATIONS, value);
}

export function ttlSeconds(key: ExpirationKey): number {
  return EXPIRATIONS[key];
}
