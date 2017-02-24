using System.Net.Http;
using System.Threading.Tasks;
using AzureFunctions.Models;

namespace AzureFunctions.Contracts
{
    public interface IArmClient
    {
        Task<MaybeResultOrError<T, HttpResponseMessage>> Get<T>(string armId, string apiVersion);
        Task<MaybeResultOrError<T, HttpResponseMessage>> Post<T>(string armId, string apiVersion, object payload = null);
        Task<MaybeResultOrError<T, HttpResponseMessage>> Put<T>(string armId, string apiVersion, object payload = null);
    }
}
