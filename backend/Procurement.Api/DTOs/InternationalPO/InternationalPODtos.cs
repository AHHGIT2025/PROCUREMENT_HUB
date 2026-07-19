// ===== FILE: InternationalPODtos.cs =====
// Place under: DTOs/InternationalPO/InternationalPODtos.cs

using System;
using System.Collections.Generic;

namespace Procurement.Api.DTOs.InternationalPO
{
    // ── SUPPLIER ──────────────────────────────────────────────────────
    public class SupplierDto
    {
        public Guid Id { get; set; }
        public string SupplierCode { get; set; } = "";
        public string Name { get; set; } = "";
        public string? Country { get; set; }
        public string? Address { get; set; }
        public string? ContactPerson { get; set; }
        public string? Landline { get; set; }
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public string? DefaultCurrency { get; set; }
        public string? BankAccountName { get; set; }
        public string? BankAddress { get; set; }
        public string? BankName { get; set; }
        public string? Iban { get; set; }
        public string SourceType { get; set; } = "MANUAL";
        public decimal? Rating { get; set; }        // ← NEW LINE
        public bool IsActive { get; set; }
        public Guid? CompanyId { get; set; }
        public string? CompanyName { get; set; }
    }

    public class CreateSupplierDto
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
        public string? BankAccountName { get; set; }
        public string? BankAddress { get; set; }
        public string? BankName { get; set; }
        public string? Iban { get; set; }
    }

    // ── DELIVERY LOCATION ─────────────────────────────────────────────
    public class DeliveryLocationDto
    {
        public Guid Id { get; set; }
        public Guid CompanyId { get; set; }
        public string CompanyName { get; set; } = "";
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public bool IsActive { get; set; }
    }

    public class CreateDeliveryLocationDto
    {
        public Guid CompanyId { get; set; }
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
    }

    // ── INTERNATIONAL PO — LIST VIEW ─────────────────────────────────
    public class InternationalPoListItemDto
    {
        public Guid Id { get; set; }
        public string? PoNo { get; set; }
        public string CompanyName { get; set; } = "";
        public string SupplierName { get; set; } = "";
        public string Currency { get; set; } = "";
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "";
        public string? BrightPoNumber { get; set; }
        public DateTime PoDate { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ── INTERNATIONAL PO — CREATE ─────────────────────────────────────
    public class CreateInternationalPoDto
    {
        public string? PoNo { get; set; }
        public Guid CompanyId { get; set; }
        public Guid? LinkedPurchaseRequestId { get; set; }
        public string? MrReferenceNumber { get; set; }

        public Guid SupplierId { get; set; }

        public string? ContactPerson { get; set; }
        public string? ForDeliveryName { get; set; }
        public string? LandlineEmail { get; set; }
        public string? Mobile { get; set; }
        public DateTime? DeliveryDateTime { get; set; }

        public Guid? DeliveryLocationId { get; set; }
        public Guid? ProjectId { get; set; }

        public string? PaymentType { get; set; }
        public string? Email { get; set; }

        public string? OriginCountry { get; set; }
        public string? DestinationPort { get; set; }
        public string? Incoterm { get; set; }
        public string? PerformaNo { get; set; }

        public Guid RequestedById { get; set; }

        public string Currency { get; set; } = "USD";
        public decimal ExchangeRate { get; set; } = 1;

        public string? ModeOfFreight { get; set; }
        public string? TypeOfCargo { get; set; }
        public string? PaymentTermsText { get; set; }

        public decimal AdvancePayment { get; set; } = 0;
        public decimal DiscountAmount { get; set; } = 0;
        public decimal InsuranceAmount { get; set; } = 0;
        public decimal OthersAmount { get; set; } = 0;

        public string? TermsAndConditions { get; set; }
        public string? Notes { get; set; }

        public List<CreateInternationalPoItemDto> Items { get; set; } = new();
    }

    public class CreateInternationalPoItemDto
    {
        public Guid? ItemId { get; set; }
        public string? FreeTextItemCode { get; set; }
        public string? FreeTextItemName { get; set; }
        public decimal Qty { get; set; }
        public string? Uom { get; set; }
        public decimal Rate { get; set; } = 0;
        public decimal DiscountAmount { get; set; } = 0;
        public Guid? SourcePurchaseRequestItemId { get; set; }
    }

    // ── INTERNATIONAL PO — UPDATE HEADER ──────────────────────────────
    public class UpdateInternationalPoHeaderDto
    {
        public string? PoNo { get; set; }
        public string? ContactPerson { get; set; }
        public string? ForDeliveryName { get; set; }
        public string? LandlineEmail { get; set; }
        public string? Mobile { get; set; }
        public DateTime? DeliveryDateTime { get; set; }
        public Guid? DeliveryLocationId { get; set; }
        public Guid? ProjectId { get; set; }
        public string? PaymentType { get; set; }
        public string? Email { get; set; }
        public string? OriginCountry { get; set; }
        public string? DestinationPort { get; set; }
        public string? Incoterm { get; set; }
        public string? PerformaNo { get; set; }
        public string? ModeOfFreight { get; set; }
        public string? TypeOfCargo { get; set; }
        public string? PaymentTermsText { get; set; }
        public decimal AdvancePayment { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal InsuranceAmount { get; set; }
        public decimal OthersAmount { get; set; }
        public string? TermsAndConditions { get; set; }
        public string? Notes { get; set; }
        public string? BrightPoNumber { get; set; }
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; } = "";
    }

    // ── QUOTES (comparison) ────────────────────────────────────────────
    public class AddQuoteDto
    {
        public Guid? InternationalPoItemId { get; set; }   // null = whole-PO-level quote
        public Guid SupplierId { get; set; }
        public decimal UnitPrice { get; set; }
        public string Currency { get; set; } = "USD";
        public decimal ExchangeRateToQar { get; set; } = 1;
        public int? LeadTimeDays { get; set; }
        public DateTime? ValidityDate { get; set; }
        public string? Notes { get; set; }
    }

    public class InternationalPoItemQuoteDto
    {
        public Guid Id { get; set; }
        public Guid? InternationalPoItemId { get; set; }
        public Guid SupplierId { get; set; }
        public string SupplierName { get; set; } = "";
        public decimal UnitPrice { get; set; }
        public string Currency { get; set; } = "";
        public decimal ExchangeRateToQar { get; set; }
        public decimal ConvertedPriceQar { get; set; }
        public int? LeadTimeDays { get; set; }
        public DateTime? ValidityDate { get; set; }
        public string? Notes { get; set; }
        public bool IsSelected { get; set; }
    }

    // ── INTERNATIONAL PO — FULL DETAIL (for edit screen / print) ──────
    public class InternationalPoDetailDto
    {
        public Guid Id { get; set; }
        public string? PoNo { get; set; }
        public Guid CompanyId { get; set; }
        public string CompanyName { get; set; } = "";

        public Guid? LinkedPurchaseRequestId { get; set; }
        public string? LinkedRequestNumber { get; set; }
        public string? MrReferenceNumber { get; set; }

        public Guid SupplierId { get; set; }
        public SupplierDto? Supplier { get; set; }

        public DateTime PoDate { get; set; }
        public string? ContactPerson { get; set; }
        public string? ForDeliveryName { get; set; }
        public string? LandlineEmail { get; set; }
        public string? Mobile { get; set; }
        public DateTime? DeliveryDateTime { get; set; }

        public Guid? DeliveryLocationId { get; set; }
        public string? DeliveryLocationName { get; set; }
        public Guid? ProjectId { get; set; }
        public string? ProjectName { get; set; }

        public string? PaymentType { get; set; }
        public string? Email { get; set; }

        public string? OriginCountry { get; set; }
        public string? DestinationPort { get; set; }
        public string? Incoterm { get; set; }
        public string? PerformaNo { get; set; }

        public Guid RequestedById { get; set; }
        public string? RequestedByName { get; set; }

        public string Currency { get; set; } = "";
        public decimal ExchangeRate { get; set; }

        public string? ModeOfFreight { get; set; }
        public string? TypeOfCargo { get; set; }
        public string? PaymentTermsText { get; set; }

        public decimal AdvancePayment { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal InsuranceAmount { get; set; }
        public decimal OthersAmount { get; set; }
        public decimal SubTotal { get; set; }
        public decimal TotalAmount { get; set; }

        public string? TermsAndConditions { get; set; }
        public string Status { get; set; } = "";
        public string? BrightPoNumber { get; set; }
        public string? Notes { get; set; }

        public List<InternationalPoItemDto> Items { get; set; } = new();
        public List<InternationalPoItemQuoteDto> Quotes { get; set; } = new();
    }

    public class InternationalPoItemDto
    {
        public Guid Id { get; set; }
        public Guid? ItemId { get; set; }
        public string ItemCode { get; set; } = "";
        public string ItemName { get; set; } = "";
        public decimal Qty { get; set; }
        public string? Uom { get; set; }
        public decimal Rate { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal Amount { get; set; }
        public int LineOrder { get; set; }
        public List<InternationalPoItemQuoteDto> Quotes { get; set; } = new();
    }
    public class UpdateSupplierRatingDto
    {
        public decimal Rating { get; set; } // 1.0 - 5.0
    }

    public class AddSupplierDocumentDto
    {
        public string DocumentType { get; set; } = "Other";
        public string FileName { get; set; } = "";
        public string StorageKey { get; set; } = "";
        public string? Notes { get; set; }
    }

    public class SupplierDocumentDto
    {
        public Guid Id { get; set; }
        public string DocumentType { get; set; } = "";
        public string FileName { get; set; } = "";
        public string StorageKey { get; set; } = "";
        public string FileUrl { get; set; } = "";
        public string? Notes { get; set; }
        public string? UploadedByName { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
 