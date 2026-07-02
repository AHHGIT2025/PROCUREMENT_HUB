
namespace Procurement.Api.Models.System
{
    public class RunningSequence
    {
        public Guid Id { get; set; }

        public string BranchCode { get; set; }

        public string Year { get; set; }

        public int LastNumber { get; set; }
    }
}
