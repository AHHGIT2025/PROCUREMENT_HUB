using System.Security.Cryptography;
using System.Text;
namespace Procurement.Api.Services;
public static class PasswordService
{
    public static string Hash(string password) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(password)));
    public static bool Verify(string password, string hash) => Hash(password).Equals(hash, StringComparison.OrdinalIgnoreCase);
}
