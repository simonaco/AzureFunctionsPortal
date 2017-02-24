using System.Threading.Tasks;
using AzureFunctions.Models;

namespace AzureFunctions.Contracts
{
    interface IDiagnosticsManager
    {
        Task<DiagnosticsResult> Diagnose(string armId);
    }
}