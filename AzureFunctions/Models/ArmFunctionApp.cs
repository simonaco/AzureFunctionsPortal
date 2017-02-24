using Newtonsoft.Json;

namespace AzureFunctions.Models
{
    public class ArmFunctionApp
    {
        [JsonProperty("sku")]
        public string Sku { get; set; }
    }
}