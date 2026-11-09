using System.Security.Cryptography;

namespace VeterinariaAPI.Services;

// These random, short-lived, single-use challenges are not access tokens.
public sealed class FacialLoginChallenges(TimeProvider clock)
{
    public sealed record Pending(int UserId, string PasswordHash, string EncryptedDescriptor, DateTimeOffset Expires);
    private readonly Dictionary<string, Pending> pending = new();
    private readonly object gate = new();
    public string? Create(int userId, string passwordHash, string descriptor)
    {
        lock (gate)
        {
            foreach (var key in pending.Where(x => x.Value.Expires <= clock.GetUtcNow()).Select(x => x.Key).ToArray()) pending.Remove(key);
            if (pending.Count >= 2000) return null;
            var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
            pending[token] = new(userId, passwordHash, descriptor, clock.GetUtcNow().AddMinutes(2));
            return token;
        }
    }
    public Pending? Take(string? token)
    {
        if (token is not { Length: 64 }) return null;
        lock (gate)
            return pending.Remove(token, out var item) && item.Expires > clock.GetUtcNow() ? item : null;
    }
}
