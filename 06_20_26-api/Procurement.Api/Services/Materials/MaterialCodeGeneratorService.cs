
namespace Procurement.Api.Services.Materials
{
    public class MaterialCodeGeneratorService
    {
        public string GenerateCode(
            string groupCode,
            int sequence)
        {
            return $"ITM-{groupCode}-{sequence.ToString("D4")}";
        }
    }
}
