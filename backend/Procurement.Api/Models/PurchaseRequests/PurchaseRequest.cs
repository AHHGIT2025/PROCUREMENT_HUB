namespace Procurement.Api.Models.PurchaseRequests
{

    public class PurchaseRequest : BaseEntity
    {
        public string RequestNumber { get; set; } = "";

        public Guid CompanyId { get; set; }

        public Guid? ProjectId { get; set; }

        //public Guid DepartmentId { get; set; }
        public Guid? DepartmentId { get; set; }  // ✅ nullable

        public Guid RequestedById { get; set; }

        public RequestStatus Status { get; set; }
            = RequestStatus.Draft;

        public string Justification { get; set; } = "";

        public decimal TotalAmount { get; set; }

        // ── TASK ASSIGNMENT ──────────────────────────────────
        public Guid? AssignedToId { get; set; }          // Procurement team member
        public Guid? AssignedById { get; set; }          // Manager who assigned
        public DateTime? AssignedAt { get; set; }
        public string? AssignmentNote { get; set; }
        public string AssignmentStatus { get; set; } = "UNASSIGNED";
        // UNASSIGNED | ASSIGNED | IN_PROGRESS | COMPLETED

        // ── PO / BRIGHT ERP ──────────────────────────────────
        public string? PoNumber { get; set; }
        public string PoStatus { get; set; } = "PENDING";
        // PENDING | ISSUED | HOLD | REJECTED
        public string? PoRemarks { get; set; }
        public DateTime? PoUpdatedAt { get; set; }
        public Guid? PoUpdatedById { get; set; }

        public string? ExternalReferenceNo { get; set; }   // "Xpe. Ref. No." equivalent

        // ── DELIVERY DETAILS (mandatory) ──────────────────────
        public string DeliveryLocation { get; set; } = "";
        public string ContactNumber { get; set; } = "";
        // ── Officer-to-officer transfer (separate from Manager's original
        // AssignedToId) — lets an officer hand off an MR they were assigned
        // to another officer, e.g. to consolidate several MRs onto one
        // person before converting them into a single combined PO.
        public Guid? TransferredToId { get; set; }
        public Guid? TransferredById { get; set; }
        public DateTime? TransferredAt { get; set; }
        public string? TransferNote { get; set; }

    }
}