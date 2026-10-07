// 요청 모델에 plantId를 명시적으로 담는 헬퍼. httpClient는 plantId를 주입하지 않으므로
// feature의 query·command adapter가 현재 Plant에서 값을 읽어 이 헬퍼로 요청에 넣는다.
// 서버가 allowedPlantIds와 대조해 최종 검증한다(허용되지 않으면 403).
export function withPlantId<T extends object>(plantId: number, params: T): T & { plantId: number } {
  return { ...params, plantId };
}
