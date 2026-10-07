using MesPlatform.Application.Abstractions.Identity;

namespace MesPlatform.Application.Tests.Identity;

public class PermissionCodeTests
{
    [Theory]
    [InlineData("Production.WorkOrder.Read")]
    [InlineData("Production.WorkOrder.ChangeStatus")]
    [InlineData("System.Info.Read")]
    [InlineData("Traceability.Lot.Read")]
    public void Valid_codes_are_accepted(string code) => Assert.True(PermissionCode.IsValid(code));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("Production")]
    [InlineData("Production.WorkOrder")]
    [InlineData("Production..Read")]
    [InlineData("production.workOrder.read")]
    [InlineData("/production/work-orders")]
    [InlineData("Production.WorkOrder.Read ")]
    [InlineData("Production.Work-Order.Read")]
    public void Menu_paths_and_malformed_codes_are_rejected(string? code) => Assert.False(PermissionCode.IsValid(code));

    [Fact]
    public void Snapshot_exposes_user_id_as_string_for_ICurrentUser()
    {
        ICurrentUser user = new CurrentUserSnapshot(42, "alice", null, [1], ["System.Info.Read"]);

        Assert.Equal("42", user.UserId);
    }
}
