using System.Collections.Generic;

namespace AzureFunctions.Models
{
    class DiagnosticsResult
    {
        public bool IsDiagnosingSuccessful { get; set; }
        public DiagnoseErrorResult ErrorResult { get; set; }
        public DiagnoseSuccessResult SuccessResult { get; set; }
    }

    class DiagnoseErrorResult
    {
        public string ErrorMessage { get; set; }

        public string ErrorId { get; set; }

        public IEnumerable<string> UserActions { get; set; }
    }

    class DiagnoseSuccessResult
    {
        public bool Terminating { get; set; }
        public IEnumerable<HealingAction> HealingActions { get; set; }
    }
}