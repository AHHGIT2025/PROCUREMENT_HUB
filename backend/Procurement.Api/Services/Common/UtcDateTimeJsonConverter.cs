using System.Text.Json;
using System.Text.Json.Serialization;

namespace Procurement.Api.Common
{
    // SQL Server datetime/datetime2 columns don't store timezone info.
    // When EF Core reads a UTC-stored value back, DateTime.Kind comes back
    // as Unspecified (not Utc), even though the underlying value IS UTC
    // (we always write DateTime.UtcNow everywhere in this codebase).
    //
    // Without Kind=Utc, System.Text.Json serializes the value WITHOUT the
    // trailing "Z" (e.g. "2026-07-06T12:23:00" instead of
    // "2026-07-06T12:23:00Z"). The frontend then does `new Date(iso)`,
    // which — with no "Z" and no timezone offset in the string — is parsed
    // as LOCAL browser time, not UTC. That silently shifts every displayed
    // timestamp by the viewer's local UTC offset, which is why times looked
    // right for one person's timezone and wrong for another's.
    //
    // This converter forces Kind=Utc before serializing, so every date the
    // API returns is unambiguous and the frontend can safely render it in
    // Asia/Qatar (or any fixed timezone) regardless of the viewer's machine.
    public class UtcDateTimeJsonConverter : JsonConverter<DateTime>
    {
        public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var value = reader.GetDateTime();
            return value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
                : value.ToUniversalTime();
        }

        public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        {
            var utcValue = value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(value, DateTimeKind.Utc) // Unspecified -> assume UTC (our storage convention)
            };

            writer.WriteStringValue(utcValue.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
        }
    }
}