namespace MesPlatform.Contracts.Common;

// Plant 범위가 있는 Command 본문이 구현한다. 서버는 이 값을 allowedPlantIds와 대조해 검증한다.
public interface IPlantScoped
{
    int PlantId { get; }
}
