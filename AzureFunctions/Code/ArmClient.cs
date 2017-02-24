using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using AzureFunctions.Common;
using AzureFunctions.Contracts;
using AzureFunctions.Models;
using Newtonsoft.Json;

namespace AzureFunctions.Code
{
    public class ArmClient : IArmClient
    {
        private readonly HttpClient _client;
        private readonly IUserSettings _userSettings;

        public ArmClient(HttpClient client, IUserSettings userSettings)
        {
            _client = client;
            _userSettings = userSettings;
        }

        public Task<MaybeResultOrError<T, HttpResponseMessage>> Get<T>(string armId, string apiVersion)
        {
            var request = GetRequestObject(armId, apiVersion, HttpMethod.Get);
            return Execute<T>(request);
        }

        public Task<MaybeResultOrError<T, HttpResponseMessage>> Post<T>(string armId, string apiVersion, object payload = null)
        {
            var request = GetRequestObject(armId, apiVersion, HttpMethod.Post, payload);
            return Execute<T>(request);
        }

        public Task<MaybeResultOrError<T, HttpResponseMessage>> Put<T>(string armId, string apiVersion, object payload = null)
        {
            var request = GetRequestObject(armId, apiVersion, HttpMethod.Put, payload);
            return Execute<T>(request);
        }

        private async Task<MaybeResultOrError<T, HttpResponseMessage>> Execute<T>(HttpRequestMessage request)
        {
            var response = await _client.SendAsync(request);
            if ((int)response.StatusCode >= 200 && (int)response.StatusCode < 300)
            {
                return new MaybeResultOrError<T, HttpResponseMessage>(true, await response.Content.ReadAsAsync<T>(), null);
            }
            else
            {
                return new MaybeResultOrError<T, HttpResponseMessage>(false, default(T), response);
            }
        }

        private HttpRequestMessage GetRequestObject(string path, string apiVersion, HttpMethod method, object payload = null)
        {
            var req = new HttpRequestMessage(method, new Uri(_client.BaseAddress, $"{path}?api-version={apiVersion}"));
            req.Headers.TryAddWithoutValidation("Authorization", $"Bearer {_userSettings.BearerToken}");
            req.Headers.TryAddWithoutValidation("User-Agent", Constants.UserAgent);
            req.Headers.TryAddWithoutValidation("Accepts", Constants.ApplicationJson);
            if (payload != null)
            {
                var payloadStr = JsonConvert.SerializeObject(payload);
                req.Content = new StringContent(payloadStr, Encoding.UTF8, Constants.ApplicationJson);
            }
            return req;
        }
    }
}