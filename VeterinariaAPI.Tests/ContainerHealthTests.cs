using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace VeterinariaAPI.Tests;

public class ContainerHealthTests
{
    [Theory]
    [InlineData("/health/live", "alive")]
    [InlineData("/health/ready", "ready")]
    public async Task HealthChecksAreAnonymousAndDoNotExposeConfiguration(string path, string expected)
    {
        using var factory = new FacialFactory();
        using var client = factory.Client(null);
        var response = await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(expected, content.GetProperty("status").GetString());
        Assert.Single(content.EnumerateObject());
    }
}
