
namespace Procurement.Api.Services.Workflow
{
    public class WorkflowService
    {
        public List<string> GetWorkflow(
            string itemGroup,
            decimal amount)
        {
            var flow = new List<string>();

            flow.Add("PM");

            if (itemGroup == "IT")
            {
                flow.Add("IT Manager");
            }

            if (amount > 10000)
            {
                flow.Add("CEO");
            }

            return flow;
        }
    }
}
