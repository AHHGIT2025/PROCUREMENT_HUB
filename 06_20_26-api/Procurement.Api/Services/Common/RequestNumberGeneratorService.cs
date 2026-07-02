
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models.System;

namespace Procurement.Api.Services.Common
{
    public class RequestNumberGeneratorService
    {
        private readonly AppDbContext _context;

        public RequestNumberGeneratorService(
            AppDbContext context)
        {
            _context = context;
        }

        public async Task<string> GenerateRequestNumber(
            string branchCode)
        {
            var year =
                DateTime.UtcNow.Year
                    .ToString()
                    .Substring(2);

            var sequence =
                await _context.RunningSequences
                    .FirstOrDefaultAsync(x =>
                        x.BranchCode == branchCode &&
                        x.Year == year);

            if (sequence == null)
            {
                sequence = new RunningSequence
                {
                    Id = Guid.NewGuid(),

                    BranchCode = branchCode,

                    Year = year,

                    LastNumber = 0
                };

                _context.RunningSequences
                    .Add(sequence);
            }

            sequence.LastNumber++;

            await _context.SaveChangesAsync();

            return
                $"{year}{branchCode}{sequence.LastNumber.ToString("D5")}";
        }
    }
}
