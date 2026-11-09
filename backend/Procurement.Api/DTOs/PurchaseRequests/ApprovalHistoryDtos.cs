// FILE: DTOs/PurchaseRequests/ApprovalHistoryDtos.cs
// Save under: Procurement.Api/DTOs/PurchaseRequests/ApprovalHistoryDtos.cs

namespace Procurement.Api.DTOs.PurchaseRequests
{
    /// <summary>
    /// Full approval history of a purchase request across ALL attempts.
    /// A new attempt starts after every RETURN (the requester corrects and resubmits).
    /// </summary>
    public class ApprovalHistoryDto
    {
        public Guid RequestId { get; set; }
        public string RequestNumber { get; set; } = string.Empty;
        public string CurrentStatus { get; set; } = string.Empty;

        public int TotalAttempts { get; set; }
        public int ReturnCount { get; set; }
        public int RejectCount { get; set; }

        public ApprovalHistoryLastReturnDto? LastReturn { get; set; }

        public List<ApprovalAttemptDto> Attempts { get; set; } = new();
    }

    public class ApprovalHistoryLastReturnDto
    {
        public string StepName { get; set; } = string.Empty;
        public string ReturnedBy { get; set; } = string.Empty;
        public string? Comments { get; set; }
        public DateTime ReturnedAt { get; set; }
    }

    public class ApprovalAttemptDto
    {
        public int AttemptNumber { get; set; }

        // RETURNED | REJECTED | APPROVED | IN_PROGRESS
        public string Outcome { get; set; } = "IN_PROGRESS";

        public DateTime StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }

        public List<ApprovalHistoryEntryDto> Entries { get; set; } = new();
    }

    public class ApprovalHistoryEntryDto
    {
        public int StepOrder { get; set; }
        public string StepName { get; set; } = string.Empty;

        // APPROVE | RETURN | REJECT | PENDING (or any other action type recorded by the engine)
        public string Action { get; set; } = string.Empty;

        // Who acted; for a PENDING entry this is the person the step is waiting on.
        public string PersonName { get; set; } = string.Empty;

        public string? Comments { get; set; }

        // Null for a PENDING entry (no action taken yet).
        public DateTime? ActionDate { get; set; }

        public bool IsPending { get; set; }
    }
}
