// ===== FILE: InternationalPurchaseOrderModels.cs =====
// International Purchase Order (IPO) module — entity models.
// Place this file under: Models/InternationalPO/ (or your Models folder,
// matching wherever PurchaseRequest.cs currently lives).

using System;
using System.Collections.Generic;

namespace Procurement.Api.Models.InternationalPO
{
    // ── SUPPLIER MASTER ──────────────────────────────────────────────
    public class Supplier : BaseEntity
    {
        public string SupplierCode { get; set; } = "";
        public string Name { get; set; } = "";
        public string? Country { get; set; }
        public string? Address { get; set; }
        public string? ContactPerson { get; set; }
        public string? Landline { get; set; }
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public string? DefaultCurrency { get; set; }

        // Bank details — pulled onto the printed PO
        public string? BankAccountName { get; set; }
        public string? BankAddress { get; set; }
        public string? BankName { get; set; }
        public string? Iban { get; set; }

        public string SourceType { get; set; } = "MANUAL"; // ORACLE_HQ | ORACLE_FMCG | MANUAL
        public string? OracleVendorCode { get; set; }
        public int? CreditLimitDays { get; set; }      // ← NEW LINE
        public string? PaymentType { get; set; }        // ← NEW LINE
        public decimal? Rating { get; set; }
        public Guid? CompanyId { get; set; }
    }
    public class SupplierDocument : BaseEntity
    {
        public Guid SupplierId { get; set; }
        public string DocumentType { get; set; } = "Other"; // Trade License | Certificate | Bank Letter | Other
        public string FileName { get; set; } = "";
        public string StorageKey { get; set; } = "";
        public string? Notes { get; set; }
        public string? UploadedByName { get; set; }

        public Supplier? Supplier { get; set; }
    }
    // ── DELIVERY LOCATIONS (simple per-company dropdown) ────────────
    public class DeliveryLocation : BaseEntity
    {
        public Guid CompanyId { get; set; }
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
    }

    // ── INTERNATIONAL PO STATUS ──────────────────────────────────────
    public static class InternationalPoStatus
    {
        public const string Draft = "Draft";
        public const string QuotesCollected = "QuotesCollected";
        public const string SupplierSelected = "SupplierSelected";
        public const string Finalized = "Finalized";
        public const string SentToBright = "SentToBright";
        public const string Completed = "Completed";
        public const string Cancelled = "Cancelled";
    }

    // ── INTERNATIONAL PO HEADER ──────────────────────────────────────
    public class InternationalPurchaseOrder : BaseEntity
    {
        public string? PoNo { get; set; }                       // manual entry for now
        public Guid CompanyId { get; set; }

        public Guid? LinkedPurchaseRequestId { get; set; }       // optional link to existing PR
        public string? MrReferenceNumber { get; set; }           // free text, e.g. Bright MR No

        public Guid SupplierId { get; set; }

        public DateTime PoDate { get; set; } = DateTime.UtcNow;
        public string? ContactPerson { get; set; }
        public string? ForDeliveryName { get; set; }
        public string? LandlineEmail { get; set; }
        public string? Mobile { get; set; }
        public DateTime? DeliveryDateTime { get; set; }

        public Guid? DeliveryLocationId { get; set; }
        public Guid? ProjectId { get; set; }

        public string? PaymentType { get; set; }                 // Cash / Credit / LC
        public string? Email { get; set; }

        public string? OriginCountry { get; set; }
        public string? DestinationPort { get; set; }
        public string? Incoterm { get; set; }                    // CIP / FOB / CIF / EXW
        public string? PerformaNo { get; set; }

        public Guid RequestedById { get; set; }

        public string Currency { get; set; } = "USD";
        public decimal ExchangeRate { get; set; } = 1;

        public string? ModeOfFreight { get; set; }               // Air / Sea / Land
        public string? TypeOfCargo { get; set; }                 // FCL / LCL

        public string? PaymentTermsText { get; set; }

        public decimal AdvancePayment { get; set; } = 0;
        public decimal DiscountAmount { get; set; } = 0;
        public decimal InsuranceAmount { get; set; } = 0;
        public decimal OthersAmount { get; set; } = 0;
        public decimal SubTotal { get; set; } = 0;
        public decimal TotalAmount { get; set; } = 0;

        public string? TermsAndConditions { get; set; }          // pre-filled, editable per PO

        public string Status { get; set; } = InternationalPoStatus.Draft;

        public string? BrightPoNumber { get; set; }               // filled manually post-Bright entry

        public string? Notes { get; set; }

        // Navigation
        public Supplier? Supplier { get; set; }
        public DeliveryLocation? DeliveryLocationRef { get; set; }
        public ICollection<InternationalPOItem> Items { get; set; } = new List<InternationalPOItem>();
        public ICollection<InternationalPOItemQuote> Quotes { get; set; } = new List<InternationalPOItemQuote>();
    }

    // ── INTERNATIONAL PO LINE ITEMS ──────────────────────────────────
    public class InternationalPOItem : BaseEntity
    {
        public Guid InternationalPoId { get; set; }

        public Guid? ItemId { get; set; }                        // link to Items master, nullable
        public string? FreeTextItemCode { get; set; }            // used when item not in master
        public string? FreeTextItemName { get; set; }

        public decimal Qty { get; set; }
        public string? Uom { get; set; }
        public decimal Rate { get; set; } = 0;
        public decimal DiscountAmount { get; set; } = 0;
        public decimal Amount { get; set; } = 0;

        public int LineOrder { get; set; } = 1;

        // Navigation
        public Item? Item { get; set; }
        public Guid? SourcePurchaseRequestItemId { get; set; }  // which MR line this came from, if any
        public ICollection<InternationalPOItemQuote> Quotes { get; set; } = new List<InternationalPOItemQuote>();
    }

    // ── VENDOR COMPARISON QUOTES ─────────────────────────────────────
    public class InternationalPOItemQuote : BaseEntity
    {
        public Guid InternationalPoId { get; set; }
        public Guid? InternationalPoItemId { get; set; }         // null = whole-PO-level quote

        public Guid SupplierId { get; set; }

        public decimal UnitPrice { get; set; }
        public string Currency { get; set; } = "USD";
        public decimal ExchangeRateToQar { get; set; } = 1;
        public decimal ConvertedPriceQar { get; set; } = 0;

        public int? LeadTimeDays { get; set; }
        public DateTime? ValidityDate { get; set; }
        public string? Notes { get; set; }

        public bool IsSelected { get; set; } = false;

        // Navigation
        public Supplier? Supplier { get; set; }
    }
}