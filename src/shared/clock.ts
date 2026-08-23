// 시간을 주입 가능하게 만들어 TTL 테스트가 실제 7일을 기다리지 않게 한다.
// production은 real time, 테스트는 fake clock으로 교체.
export const clock = {
  now(): number {
    return Math.floor(Date.now() / 1000);
  },
};
