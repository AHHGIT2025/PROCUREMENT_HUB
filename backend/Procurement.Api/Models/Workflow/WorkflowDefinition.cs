// FILE: Models/Workflow/WorkflowDefinition.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Procurement.Api.Models
{
    [Table("WorkflowDefinitions")]
    public class WorkflowDefinition : BaseEntity
    {
        public Guid? CompanyId { get; set; }

        [MaxLength(50)]
        public string? Code { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        public string EntityType { get; set; } = "PURCHASE_REQUEST";

        public bool IsDefault { get; set; } = false;
        public int Priority { get; set; } = 0;
        public int Version { get; set; } = 1;
        public string ConditionMatchLogic { get; set; } = "ANY";
        public string? ScopeType { get; set; }   // "Global" | "Single" | "Multiple" | null
        public Company? Company { get; set; }
        public ICollection<WorkflowStep> Steps { get; set; } = new List<WorkflowStep>();
        public ICollection<WorkflowCondition> Conditions { get; set; } = new List<WorkflowCondition>();
    }
    public class WorkflowDefinitionCompany
    {
        public Guid Id { get; set; }
        public Guid WorkflowDefinitionId { get; set; }
        public Guid CompanyId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
    [Table("WorkflowSteps")]
    public class WorkflowStep : BaseEntity
    {
        public Guid WorkflowDefinitionId { get; set; }
        public int StepOrder { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        // Keep old RoleName for backward compat
        public string RoleName { get; set; } = string.Empty;

        // New fields
        public Guid? RoleId { get; set; }
        public string StepType { get; set; } = "SEQUENTIAL";
        public string ApproverType { get; set; } = "ROLE";
        public int? TimeoutHours { get; set; }
        public bool IsRequired { get; set; } = true;
        public bool CanDelegate { get; set; } = true;

        public WorkflowDefinition? WorkflowDefinition { get; set; }
        public Role? Role { get; set; }
    }

    [Table("WorkflowConditions")]
    public class WorkflowCondition : BaseEntity
    {
        public Guid WorkflowDefinitionId { get; set; }

        [Required]
        public string Field { get; set; } = string.Empty;

        [Required]
        public string Operator { get; set; } = string.Empty;

        [Required]
        public string Value { get; set; } = string.Empty;

        public string ValueType { get; set; } = "STRING";

        public WorkflowDefinition? WorkflowDefinition { get; set; }
    }

    [Table("ApprovalInstances")]
    public class ApprovalInstance : BaseEntity
    {
        public Guid EntityId { get; set; }
        public string EntityType { get; set; } = "PURCHASE_REQUEST";
        public Guid WorkflowDefinitionId { get; set; }
        public Guid WorkflowStepId { get; set; }
        public Guid AssignedToId { get; set; }
        public int StepOrder { get; set; }
        public string Status { get; set; } = "PENDING";
        public DateTime? DueDate { get; set; }
        public DateTime? CompletedAt { get; set; }

        public WorkflowDefinition? WorkflowDefinition { get; set; }
        public WorkflowStep? WorkflowStep { get; set; }
        public AppUser? AssignedTo { get; set; }
        public ICollection<ApprovalAction> Actions { get; set; } = new List<ApprovalAction>();
    }

    [Table("ApprovalActions")]
    public class ApprovalAction : BaseEntity
    {
        public Guid ApprovalInstanceId { get; set; }
        public Guid ActionBy { get; set; }
        public string ActionType { get; set; } = string.Empty;
        public string? Comments { get; set; }
        public Guid? DelegatedToId { get; set; }

        public ApprovalInstance? ApprovalInstance { get; set; }
        public AppUser? ActionByUser { get; set; }
    }
}