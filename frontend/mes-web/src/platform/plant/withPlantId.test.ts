import { withPlantId } from './withPlantId';

describe('withPlantId', () => {
  it('요청 모델에 plantId를 명시적으로 담는다', () => {
    expect(withPlantId(3, { limit: 50 })).toEqual({ limit: 50, plantId: 3 });
  });

  it('입력 객체를 바꾸지 않는다', () => {
    const input = { limit: 50 };
    withPlantId(3, input);
    expect(input).toEqual({ limit: 50 });
  });
});
